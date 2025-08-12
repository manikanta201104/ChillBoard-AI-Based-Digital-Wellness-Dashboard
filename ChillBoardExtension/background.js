// background.js (MV3 service worker — updated, duplicate declarations removed)
const SYNC_ALARM = 'syncData';
const NETWORK_CHECK_ALARM = 'networkCheck';
const SYNC_INTERVAL_MINUTES = 5;
const NETWORK_CHECK_INTERVAL_MINUTES = 1;
const MAX_OFFLINE_QUEUE = 200; // cap to avoid unbounded growth
const SAVE_DEBOUNCE_MS = 1000;

let isTracking = false;
let totalTime = 0; // seconds
let currentTabId = null;
let tabStartTime = null; // epoch ms when current tab started
let tabUsage = []; // { tabId, url, timeSpent }
let lastSyncDate = new Date().toISOString().split('T')[0];
let offlineQueue = []; // [{ totalTime, tabs: [{tabId,url,timeSpent}], date }]
let lastUpdateTime = null;
let currentTabUrl = null; // hostname string
let lastSyncedTotalTime = 0;
let lastSyncedTabUsage = [];
let isOnline = true;
let saveTimeout = null;

// --------- Utilities ---------
function log(...args) { console.log('[bg]', ...args); }

function jwtDecode(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.warn('JWT decode failed', error);
    return null;
  }
}

function extractHostname(url) {
  try {
    if (!url || typeof url !== 'string') return 'unknown';
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return 'chrome';
    const validUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    const u = new URL(validUrl);
    return u.hostname || 'unknown';
  } catch (error) {
    // fallback simple parse
    try {
      const withoutProtocol = url.replace(/^.*?:\/\//, '');
      return withoutProtocol.split('/')[0].split('?')[0] || 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --------- Storage wrappers ---------
function getStorageData(keys) {
  return new Promise(resolve => {
    try {
      chrome.storage.local.get(keys, result => {
        if (chrome.runtime.lastError) {
          console.error('Storage get error:', chrome.runtime.lastError);
          resolve({});
        } else resolve(result || {});
      });
    } catch (error) {
      console.error('Storage get threw:', error);
      resolve({});
    }
  });
}

function setStorageData(data) {
  return new Promise(resolve => {
    try {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) console.error('Storage set error:', chrome.runtime.lastError);
        resolve();
      });
    } catch (error) {
      console.error('Storage set threw:', error);
      resolve();
    }
  });
}

function clearStorageData(keys) {
  return new Promise(resolve => {
    try {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) console.error('Storage remove error:', chrome.runtime.lastError);
        resolve();
      });
    } catch (error) {
      console.error('Storage remove threw:', error);
      resolve();
    }
  });
}

// Debounced saver to avoid too many writes
function saveAllDataDebounced(extra = {}) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    saveTimeout = null;
    await saveAllData(extra);
  }, SAVE_DEBOUNCE_MS);
}

async function saveAllData(extra = {}) {
  // merge duplicates by URL before saving
  tabUsage = combineTabUsageByUrl(tabUsage);
  const payload = {
    totalTime,
    tabUsage,
    lastSyncDate,
    offlineQueue,
    lastSyncedTotalTime,
    lastSyncedTabUsage,
    isTracking,
    currentTabId,
    currentTabUrl,
    tabStartTime,
    ...extra
  };
  await setStorageData(payload);
}

// --------- Tab usage helpers ---------
function combineTabUsageByUrl(tabArray) {
  const map = new Map();
  for (const t of (tabArray || [])) {
    if (!t || !t.url) continue;
    const url = String(t.url);
    const existing = map.get(url);
    const time = Number(t.timeSpent) || 0;
    if (existing) {
      existing.timeSpent += time;
    } else {
      map.set(url, { tabId: t.tabId || null, url, timeSpent: time });
    }
  }
  return Array.from(map.values());
}

function calculateTabUsageDelta(current, lastSynced) {
  const delta = new Map();
  (current || []).forEach(t => delta.set(t.url, { tabId: t.tabId, url: t.url, timeSpent: t.timeSpent }));
  (lastSynced || []).forEach(t => {
    if (!t || !t.url) return;
    if (delta.has(t.url)) {
      const cur = delta.get(t.url);
      cur.timeSpent -= (t.timeSpent || 0);
      if (cur.timeSpent <= 0) delta.delete(t.url);
    }
  });
  return Array.from(delta.values()).filter(t => t.timeSpent > 0);
}

// Merge offlineQueue entries by date to reduce size
function compactOfflineQueue() {
  const map = new Map();
  for (const item of offlineQueue) {
    const date = item.date;
    const existing = map.get(date) || { totalTime: 0, tabs: [], date };
    existing.totalTime += item.totalTime || 0;
    // merge tabs by url
    existing.tabs = combineTabUsageByUrl([...existing.tabs, ...(item.tabs || [])]);
    map.set(date, existing);
  }
  offlineQueue = Array.from(map.values()).slice(-MAX_OFFLINE_QUEUE); // keep recent up to cap
}

// --------- Notification & badge helpers ---------
function notifyUser(message, type = 'info') {
  log('notifyUser:', message, type);
  try {
    switch (type) {
      case 'error':
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#ff0000' });
        break;
      case 'warning':
        chrome.action.setBadgeText({ text: '⚠' });
        chrome.action.setBadgeBackgroundColor({ color: '#ff8c00' });
        break;
      case 'success':
        chrome.action.setBadgeText({ text: '✓' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        break;
      case 'sync':
        chrome.action.setBadgeText({ text: '↻' });
        chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
        break;
      default:
        chrome.action.setBadgeText({ text: 'i' });
        chrome.action.setBadgeBackgroundColor({ color: '#666666' });
    }
    const clearTime = type === 'error' ? 10000 : type === 'warning' ? 7000 : 5000;
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), clearTime);
  } catch (e) {
    console.warn('notifyUser failed', e);
  }
}

function updateTrackingBadge() {
  try {
    if (isTracking && currentTabUrl) {
      chrome.action.setBadgeText({ text: '●' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      chrome.action.setTitle({ title: `ChillBoard - Tracking: ${currentTabUrl}` });
    } else {
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setTitle({ title: 'ChillBoard - Not tracking' });
    }
  } catch (e) {
    console.warn('updateTrackingBadge failed', e);
  }
}

// --------- Core tracking logic (event-driven, safe for service worker) ---------
function startTracking() {
  if (!currentTabId || !currentTabUrl) {
    // nothing to track
    isTracking = false;
    return;
  }
  isTracking = true;
  tabStartTime = Date.now();
  lastUpdateTime = tabStartTime;
  log('startTracking', { currentTabId, currentTabUrl, tabStartTime });
  updateTrackingBadge();
  saveAllDataDebounced();
}

function stopTracking() {
  try {
    if (isTracking && tabStartTime && currentTabUrl) {
      updateTabTime(); // flush last chunk
    }
  } catch (e) {
    console.warn('stopTracking update error', e);
  }
  isTracking = false;
  tabStartTime = null;
  lastUpdateTime = null;
  updateTrackingBadge();
  saveAllDataDebounced();
}

/**
 * Update tab time using tabStartTime -> now delta.
 * Designed to be called on transitions/events (not via interval).
 */
function updateTabTime() {
  if (!isTracking || !tabStartTime || !currentTabUrl) return;
  const now = Date.now();
  const deltaSeconds = Math.floor((now - tabStartTime) / 1000);
  if (deltaSeconds <= 0) return;
  totalTime += deltaSeconds;

  const existing = tabUsage.find(t => t.url === currentTabUrl);
  if (existing) existing.timeSpent = (existing.timeSpent || 0) + deltaSeconds;
  else tabUsage.push({ tabId: currentTabId, url: currentTabUrl, timeSpent: deltaSeconds });

  tabStartTime = now; // reset start
  lastUpdateTime = now;
  log('updateTabTime', { deltaSeconds, totalTime, currentTabUrl });
  saveAllDataDebounced();
}

// Called by checkFocus and on tab activation/update
function setActiveTab(tabId, url) {
  const hostname = extractHostname(url);
  if (isTracking && currentTabId !== null && currentTabId !== tabId && tabStartTime) {
    updateTabTime();
  }
  currentTabId = tabId;
  currentTabUrl = hostname;
  // When switching to new tab, start tracking immediately
  if (!isTracking) {
    startTracking();
  } else {
    // update the start time for the new active tab
    tabStartTime = Date.now();
    lastUpdateTime = tabStartTime;
    saveAllDataDebounced();
  }
  // ensure the tab is present in usage list so it appears in UI quickly
  tabUsage.push({ tabId: currentTabId, url: currentTabUrl, timeSpent: 0 });
  tabUsage = combineTabUsageByUrl(tabUsage);
  updateTrackingBadge();
}

// If focus lost or tab invalid, stop tracking
function clearActiveTabIfNeeded() {
  if (isTracking && tabStartTime && currentTabId !== null) {
    updateTabTime();
  }
  currentTabId = null;
  currentTabUrl = null;
  stopTracking();
}

// --------- Sync with server ---------
async function refreshJwt() {
  try {
    const st = await getStorageData(['refreshToken']);
    const refreshToken = st.refreshToken;
    if (!refreshToken) throw new Error('No refresh token');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch('https://chillboard-6uoj.onrender.com/screen-time/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) throw new Error('Refresh failed');
    const data = await resp.json();
    await setStorageData({ jwt: data.token }); // keep refreshToken intact
    return data.token;
  } catch (error) {
    console.error('refreshJwt error:', error);
    notifyUser('Session expired - please log in', 'error');
    await clearStorageData(['jwt', 'refreshToken']);
    return null;
  }
}

// Push local state to offlineQueue in a compacted way
function pushDeltaToOfflineQueue(dateStr) {
  const deltaTotal = totalTime - lastSyncedTotalTime;
  const deltaTabs = calculateTabUsageDelta(tabUsage, lastSyncedTabUsage);
  if ((deltaTotal && deltaTotal > 0) || (deltaTabs && deltaTabs.length > 0)) {
    offlineQueue.push({ totalTime: deltaTotal || 0, tabs: deltaTabs || [], date: dateStr });
    compactOfflineQueue();
    saveAllDataDebounced();
  }
}

async function syncData(maxRetries = 3) {
  log('syncData starting');
  try {
    const st = await getStorageData(['jwt', 'lastSyncDate']);
    let jwt = st.jwt;
    const currentDate = new Date().toISOString().split('T')[0];

    // If date changed, push previous day delta and reset daily values
    if (currentDate !== lastSyncDate) {
      log('Date changed since lastSyncDate, resetting daily data');
      // push last day's delta
      pushDeltaToOfflineQueue(lastSyncDate);
      // reset daily variables
      totalTime = 0;
      tabUsage = [];
      lastSyncedTotalTime = 0;
      lastSyncedTabUsage = [];
      lastSyncDate = currentDate;
      isTracking = false;
      currentTabId = null;
      currentTabUrl = null;
      tabStartTime = null;
      await saveAllData();
      notifyUser('Daily data reset', 'info');
      return;
    }

    // Prepare data to sync: offlineQueue + today's delta
    const deltaTotal = totalTime - lastSyncedTotalTime;
    const batchedTabUsage = combineTabUsageByUrl(calculateTabUsageDelta(tabUsage, lastSyncedTabUsage));
    const toSync = [
      ...offlineQueue,
      ...( (deltaTotal > 0 || batchedTabUsage.length > 0) ? [{ totalTime: deltaTotal, tabs: batchedTabUsage, date: currentDate }] : [] )
    ].filter(item => (item.totalTime && item.totalTime > 0) || (item.tabs && item.tabs.length > 0));

    if (!navigator.onLine) {
      // queue current delta
      if (deltaTotal > 0 || batchedTabUsage.length > 0) {
        offlineQueue.push({ totalTime: deltaTotal, tabs: batchedTabUsage, date: currentDate });
        compactOfflineQueue();
        await saveAllData();
      }
      notifyUser('Offline - data queued for sync', 'warning');
      return;
    }

    if (!jwt) {
      // no jwt, queue local delta and return
      if (deltaTotal > 0 || batchedTabUsage.length > 0) {
        offlineQueue.push({ totalTime: deltaTotal, tabs: batchedTabUsage, date: currentDate });
        compactOfflineQueue();
        await saveAllData();
      }
      notifyUser('Please log in to sync data', 'warning');
      return;
    }

    if (toSync.length === 0) {
      log('No data to sync');
      return;
    }

    notifyUser('Syncing data...', 'sync');

    for (const item of toSync) {
      const decoded = jwtDecode(jwt);
      const userId = decoded?.userId || 'unknown';
      log('syncing item', item.date, item.totalTime, item.tabs.length);

      let attempt = 0;
      let sent = false;
      while (attempt < maxRetries && !sent) {
        attempt++;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 20000);

          const resp = await fetch('https://chillboard-6uoj.onrender.com/screen-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
            body: JSON.stringify({
              userId,
              date: item.date,
              totalTime: item.totalTime,
              tabs: (item.tabs || []).map(t => ({ tabId: t.tabId || null, url: t.url, timeSpent: t.timeSpent || 0 }))
            }),
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (!resp.ok) {
            if (resp.status === 401) {
              // refresh token once and retry the whole sync operation to avoid partial sync mismatch
              const newJwt = await refreshJwt();
              if (newJwt) {
                jwt = newJwt;
                // restart sync procedure (safer to re-call syncData rather than continuing to avoid partial duplicates)
                log('JWT refreshed during sync; restarting syncData');
                return await syncData(maxRetries);
              } else {
                // could not refresh; queue item and exit
                offlineQueue.push(item);
                compactOfflineQueue();
                await saveAllData();
                notifyUser('Session expired - please log in', 'error');
                return;
              }
            }
            throw new Error(`Sync failed: ${resp.status}`);
          }

          // success for this item
          sent = true;
        } catch (err) {
          log(`Sync attempt ${attempt} failed for ${item.date}`, err?.message || err);
          if (attempt >= maxRetries) {
            offlineQueue.push(item);
            compactOfflineQueue();
            await saveAllData();
            notifyUser('Sync failed - data queued', 'error');
          } else {
            await sleep(2000 * attempt);
          }
        }
      }
    }

    // if all went fine, update lastSynced state and remove today's items from offlineQueue
    lastSyncedTotalTime = totalTime;
    lastSyncedTabUsage = [...tabUsage];
    offlineQueue = offlineQueue.filter(it => it.date !== new Date().toISOString().split('T')[0]);
    compactOfflineQueue();
    await saveAllData();
    notifyUser('Sync completed successfully', 'success');
    log('syncData completed');
  } catch (error) {
    console.error('syncData top-level error', error);
    // push delta into offlineQueue so we don't lose it
    pushDeltaToOfflineQueue(new Date().toISOString().split('T')[0]);
    notifyUser('Sync error - data queued', 'error');
  }
}

// Fetch server data (GET) for today's date and set local state if present
async function fetchServerData(jwt, dateStr) {
  try {
    if (!navigator.onLine) {
      notifyUser('Offline - using local data', 'warning');
      return false;
    }
    notifyUser('Syncing data...', 'sync');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const resp = await fetch('https://chillboard-6uoj.onrender.com/screen-time', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${jwt}` },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      if (resp.status === 401) {
        const newJwt = await refreshJwt();
        if (newJwt) return await fetchServerData(newJwt, dateStr);
        throw new Error('JWT refresh failed');
      }
      throw new Error(`Fetch failed: ${resp.status}`);
    }
    const arr = await resp.json();
    const today = arr.find(e => e.date === dateStr);
    if (today) {
      const combined = combineTabUsageByUrl((today.tabs || []).map(t => ({
        tabId: t.tabId || null,
        url: t.url,
        timeSpent: t.timeSpent || 0
      })));
      totalTime = today.totalTime || 0;
      tabUsage = combined;
      lastSyncedTotalTime = today.totalTime || 0;
      lastSyncedTabUsage = [...combined];
      await saveAllData();
    }
    notifyUser('Data synced successfully', 'success');
    return true;
  } catch (err) {
    console.warn('fetchServerData failed', err);
    if (err.name === 'AbortError') notifyUser('Server timeout - using local data', 'warning');
    else notifyUser('Server sync failed - using local data', 'warning');
    return false;
  }
}

// --------- Events & listeners ---------
chrome.runtime.onInstalled.addListener(() => {
  log('onInstalled');
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  chrome.alarms.create(NETWORK_CHECK_ALARM, { periodInMinutes: NETWORK_CHECK_INTERVAL_MINUTES });
  initializeStorage();
  setupIdleDetectionFunc();
});

chrome.runtime.onStartup.addListener(() => {
  log('onStartup');
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  chrome.alarms.create(NETWORK_CHECK_ALARM, { periodInMinutes: NETWORK_CHECK_INTERVAL_MINUTES });
  initializeStorage();
  setupIdleDetectionFunc();
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === SYNC_ALARM) {
    syncData();
  } else if (alarm.name === NETWORK_CHECK_ALARM) {
    const prev = isOnline;
    isOnline = navigator.onLine;
    if (prev !== isOnline) {
      if (isOnline) {
        notifyUser('Back online - syncing data', 'info');
        // flush outstanding time before syncing
        if (isTracking && tabStartTime) updateTabTime();
        setTimeout(syncData, 1000);
      } else {
        notifyUser('Offline mode active', 'warning');
      }
    }
  }
});

// windows focus changes -> identify active tab and track
chrome.windows.onFocusChanged.addListener(winId => {
  if (winId === chrome.windows.WINDOW_ID_NONE) {
    clearActiveTabIfNeeded();
    return;
  }
  setTimeout(async () => {
    try {
      chrome.windows.getLastFocused({ populate: true }, window => {
        if (chrome.runtime.lastError || !window) {
          clearActiveTabIfNeeded();
          return;
        }
        if (window.state === 'minimized') {
          clearActiveTabIfNeeded();
          return;
        }
        const activeTab = (window.tabs || []).find(t => t.active);
        if (!activeTab || !activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://')) {
          clearActiveTabIfNeeded();
          return;
        }
        setActiveTab(activeTab.id, activeTab.url);
      });
    } catch (e) {
      console.warn('onFocusChanged error', e);
    }
  }, 100);
});

chrome.tabs.onActivated.addListener(activeInfo => {
  log('tabs.onActivated', activeInfo.tabId);
  if (isTracking && currentTabId !== null && tabStartTime) updateTabTime();
  chrome.tabs.get(activeInfo.tabId, tab => {
    if (chrome.runtime.lastError || !tab || !tab.url || tab.url.startsWith('chrome://')) {
      clearActiveTabIfNeeded();
      return;
    }
    setActiveTab(activeInfo.tabId, tab.url);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // If current tab URL changed, flush and update to new hostname
  if (tabId === currentTabId && changeInfo.url && isTracking) {
    if (tabStartTime) updateTabTime();
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      currentTabUrl = extractHostname(tab.url);
      tabStartTime = Date.now();
      lastUpdateTime = tabStartTime;
      saveAllDataDebounced();
      updateTrackingBadge();
    } else {
      clearActiveTabIfNeeded();
    }
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  if (tabId === currentTabId) {
    if (isTracking && tabStartTime) updateTabTime();
    clearActiveTabIfNeeded();
  }
});

// Respond to popup or other extension messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    if (request.action === 'ping') {
      sendResponse({ status: 'success' });
      return;
    } else if (request.action === 'getScreenTime') {
      sendResponse({ totalTime, tabUsage, isTracking, currentTabUrl });
      return;
    } else if (request.action === 'resetData') {
      await resetDailyData(new Date().toISOString().split('T')[0]);
      sendResponse({ success: true });
      return;
    } else if (request.action === 'syncData') {
      await syncData();
      sendResponse({ success: true });
      return;
    } else if (request.action === 'getCurrentStats') {
      sendResponse({ status: 'success', totalTime, tabUsage });
      return;
    } else if (request.action === 'getTrackingStatus') {
      sendResponse({ status: 'success', isTracking, currentTabUrl });
      return;
    } else if (request.action === 'openWebApp') {
      chrome.tabs.create({ url: 'https://chillboard.vercel.app/' });
      sendResponse({ success: true });
      return;
    }
    sendResponse(false);
  })();
  return true;
});

// When system is about to sleep / suspend, save state
chrome.runtime.onSuspend.addListener(() => {
  log('onSuspend: saving state and stopping tracking');
  try {
    if (isTracking && tabStartTime && currentTabId !== null && currentTabUrl) updateTabTime();
  } catch (e) { console.warn('onSuspend updateTabTime failed', e); }
  saveAllDataDebounced({ isTracking, currentTabId, currentTabUrl, tabStartTime, totalTime, tabUsage, lastSyncDate, offlineQueue, lastSyncedTotalTime, lastSyncedTabUsage });
  stopTracking();
});

// Chrome may call this to indicate suspend canceled — restore if possible
chrome.runtime.onSuspendCanceled.addListener(() => {
  log('onSuspendCanceled: attempting to restore state');
  chrome.storage.local.get(['isTracking', 'currentTabId', 'currentTabUrl', 'tabStartTime', 'totalTime', 'tabUsage', 'lastSyncedTotalTime', 'lastSyncedTabUsage', 'offlineQueue'], result => {
    if (result && result.isTracking && result.currentTabId && result.currentTabUrl) {
      currentTabId = result.currentTabId;
      currentTabUrl = result.currentTabUrl;
      totalTime = result.totalTime || 0;
      tabUsage = result.tabUsage || [];
      lastSyncedTotalTime = result.lastSyncedTotalTime || 0;
      lastSyncedTabUsage = result.lastSyncedTabUsage || [];
      offlineQueue = result.offlineQueue || [];
      tabStartTime = Date.now(); // start fresh, don't rely on stored ms-age
      isTracking = true;
      updateTrackingBadge();
      saveAllDataDebounced();
    }
  });
});

// --------- Daily reset ---------
async function resetDailyData(newDate) {
  try {
    // push delta for previous date
    if (totalTime > 0 || (tabUsage && tabUsage.length > 0)) {
      const delta = {
        totalTime: totalTime - lastSyncedTotalTime,
        tabs: calculateTabUsageDelta(tabUsage, lastSyncedTabUsage),
        date: lastSyncDate
      };
      if (delta.totalTime > 0 || (delta.tabs && delta.tabs.length > 0)) {
        offlineQueue.push(delta);
        compactOfflineQueue();
      }
    }

    totalTime = 0;
    tabUsage = [];
    lastSyncedTotalTime = 0;
    lastSyncedTabUsage = [];
    lastSyncDate = newDate;
    isTracking = false;
    currentTabId = null;
    currentTabUrl = null;
    tabStartTime = null;
    await saveAllData();
    updateTrackingBadge();
    notifyUser('Daily data reset', 'info');
    // attempt sync of queued data
    setTimeout(syncData, 2000);
  } catch (e) {
    console.error('resetDailyData error', e);
  }
}

// --------- Initialization ---------
async function initializeStorage() {
  try {
    log('initializeStorage');
    const result = await getStorageData([
      'totalTime', 'tabUsage', 'lastSyncDate', 'offlineQueue',
      'lastSyncedTotalTime', 'lastSyncedTabUsage', 'jwt', 'refreshToken',
      'currentTabId', 'currentTabUrl', 'tabStartTime', 'isTracking'
    ]);

    const currentDate = new Date().toISOString().split('T')[0];
    lastSyncDate = result.lastSyncDate || currentDate;

    if (lastSyncDate !== currentDate) {
      await resetDailyData(currentDate);
    } else {
      totalTime = result.totalTime || 0;
      tabUsage = result.tabUsage || [];
      lastSyncedTotalTime = result.lastSyncedTotalTime || 0;
      lastSyncedTabUsage = result.lastSyncedTabUsage || [];
      offlineQueue = (result.offlineQueue || []).map(item => ({
        ...item,
        date: typeof item.date === 'number' ? new Date(item.date).toISOString().split('T')[0] : item.date
      })) || [];
      isTracking = result.isTracking || false;
      currentTabId = result.currentTabId || null;
      currentTabUrl = result.currentTabUrl || null;
      // do not rely on stored tabStartTime age; start fresh if tracking should be active
      if (isTracking && currentTabId && currentTabUrl) {
        tabStartTime = Date.now();
        log('Restoring tracking state for', currentTabUrl);
      } else {
        tabStartTime = null;
        isTracking = false;
      }
    }

    updateTrackingBadge();

    // If JWT present, fetch server data for current date
    if (result.jwt) {
      await fetchServerData(result.jwt, new Date().toISOString().split('T')[0]);
    }

    // ensure alarms are present (in case runtime restarted)
    chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MINUTES });
    chrome.alarms.create(NETWORK_CHECK_ALARM, { periodInMinutes: NETWORK_CHECK_INTERVAL_MINUTES });
  } catch (error) {
    console.error('initializeStorage error', error);
  }
}

// Idle detection setup (single declaration function)
function setupIdleDetectionFunc() {
  if (typeof chrome.idle !== 'undefined' && chrome.idle.setDetectionInterval) {
    chrome.idle.setDetectionInterval(30);
    chrome.idle.onStateChanged.addListener(state => {
      log('idle state changed', state);
      if (state === 'locked' || state === 'idle') stopTracking();
      else if (currentTabId && currentTabUrl) setTimeout(() => {
        // event-driven re-evaluation
        chrome.windows.getLastFocused({ populate: true }, window => {
          if (chrome.runtime.lastError) return;
          const activeTab = (window.tabs || []).find(t => t.active);
          if (activeTab && activeTab.id && activeTab.url) setActiveTab(activeTab.id, activeTab.url);
        });
      }, 100);
    });
  } else {
    console.warn('chrome.idle API not available');
  }
}

// run initial setup immediately (in case file executed after reload)
initializeStorage();
setupIdleDetectionFunc();
