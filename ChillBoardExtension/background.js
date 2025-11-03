let isTracking = false;
let totalTime = 0;
let currentTabId = null;
let tabStartTime = null;
let tabUsage = []; // Now includes { tabId, url, timeSpent }

function safeInitialize() {
  if (hasInitialized) return;
  hasInitialized = true;
  initializeStorage();
}
let lastSyncDate = new Date().toISOString().split('T')[0];
let offlineQueue = [];
let activeTabTimer = null;
let lastUpdateTime = null;
let currentTabUrl = null;
let lastSyncedTotalTime = 0;
let lastSyncedTabUsage = [];
let isOnline = true; // Initial assumption
let isSystemIdle = false; // Track system idle state
let isMediaActive = false; // Track if media is playing in the current tab
let isAuthenticated = false; // NEW: Track whether a valid JWT is present
let hasInitialized = false; // NEW: ensure initializeStorage only runs once per activation
let refreshTimerId = null; // NEW: schedule proactive JWT refresh

console.log('Service worker started');

function jwtDecode(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

function extractHostname(url) {
  try {
    if (!url || typeof url !== 'string') return 'unknown';
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return 'chrome';
    const validUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    const urlObj = new URL(validUrl);
    return urlObj.hostname || 'unknown';
  } catch (error) {
    console.error('Error extracting hostname from:', url, error);
    return 'unknown';
  }
}

function getStorageData(keys) {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, result => {
      if (chrome.runtime.lastError) {
        console.error('Storage get error:', chrome.runtime.lastError);
        resolve({});
      } else resolve(result || {});
    });
  });
}

function setStorageData(data) {
  return new Promise(resolve => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) console.error('Storage set error:', chrome.runtime.lastError);
      resolve();
    });
  });
}

function clearStorageData(keys) {
  return new Promise(resolve => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) console.error('Storage clear error:', chrome.runtime.lastError);
      resolve();
    });
  });
}

function calculateTabUsageDelta(currentTabUsage, lastSyncedTabUsage) {
  const deltaMap = new Map();
  currentTabUsage.forEach(tab => deltaMap.set(tab.url, { 
    tabId: tab.tabId, 
    url: tab.url, 
    timeSpent: tab.timeSpent
  }));
  lastSyncedTabUsage.forEach(tab => {
    if (deltaMap.has(tab.url)) {
      const current = deltaMap.get(tab.url);
      current.timeSpent -= tab.timeSpent;
      if (current.timeSpent <= 0) deltaMap.delete(tab.url);
    }
  });
  return Array.from(deltaMap.values()).filter(tab => tab.timeSpent > 0);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function notifyUser(message, type = 'info') {
  console.log('Notification:', message);
  
  switch (type) {
    case 'error':
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
      break;
    case 'warning':
      chrome.action.setBadgeText({ text: '⚠' });
      chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
      break;
    case 'success':
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
      break;
    case 'sync':
      chrome.action.setBadgeText({ text: '↻' });
      chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
      break;
    default:
      chrome.action.setBadgeText({ text: 'i' });
      chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
  }
  
  const clearTime = type === 'error' ? 8000 : type === 'warning' ? 6000 : 4000;
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
    updateTrackingBadge();
  }, clearTime);
}

function updateTrackingBadge() {
  if (isAuthenticated && isTracking && currentTabUrl && !(isSystemIdle && !isMediaActive)) {
    chrome.action.setBadgeText({ text: '●' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    chrome.action.setTitle({ title: `ChillBoard - Tracking: ${currentTabUrl}` });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'ChillBoard - Ready to track' });
  }
}

function combineTabUsageByUrl(tabUsageArray) {
  const urlMap = new Map();
  tabUsageArray.forEach(tab => {
    if (urlMap.has(tab.url)) {
      const existing = urlMap.get(tab.url);
      existing.timeSpent += tab.timeSpent;
    } else {
      urlMap.set(tab.url, { 
        tabId: tab.tabId, 
        url: tab.url, 
        timeSpent: tab.timeSpent
      });
    }
  });
  return Array.from(urlMap.values());
}

function initializeStorage() {
  chrome.storage.local.get([
    'totalTime', 'tabUsage', 'lastSyncDate', 'offlineQueue', 
    'lastSyncedTotalTime', 'lastSyncedTabUsage', 'jwt', 'refreshToken',
    'currentTabId', 'currentTabUrl', 'tabStartTime', 'isTracking'
  ], async result => {
    if (chrome.runtime.lastError) {
      console.error('Error accessing chrome.storage.local:', chrome.runtime.lastError);
      notifyUser('Storage error - please reload extension', 'error');
      return;
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    lastSyncDate = result.lastSyncDate || currentDate;

    // NEW: compute auth state from JWT
    const token = result.jwt;
    if (token) {
      const decoded = jwtDecode(token);
      isAuthenticated = !!decoded && (!decoded.exp || decoded.exp * 1000 > Date.now());
      // Proactively schedule refresh or try immediate refresh if expired
      if (isAuthenticated) {
        scheduleTokenRefresh(token);
      } else {
        const newJwt = await refreshJwt();
        if (newJwt) {
          isAuthenticated = true;
          scheduleTokenRefresh(newJwt);
        }
      }
    } else {
      isAuthenticated = false;
    }

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
      }));
      // Resume tracking only if authenticated
      if (isAuthenticated && result.isTracking && result.currentTabId && result.currentTabUrl && !(isSystemIdle && !isMediaActive)) {
        currentTabId = result.currentTabId;
        currentTabUrl = result.currentTabUrl;
        tabStartTime = Date.now();
        startTracking();
        notifyUser('Tracking resumed', 'info');
      }
    }

    updateTrackingBadge();

    if (isAuthenticated && result.jwt) {
      await syncData();
      await fetchServerData(result.jwt, currentDate);
    } else {
      notifyUser('Please log in to sync data', 'info');
    }
    
    setTimeout(checkFocus, 1000);
    startNetworkPolling();
    setupIdleDetection();
  });
}

async function resetDailyData(newDate) {
  // NEW: before resetting, snapshot previous day's absolute totals only if authenticated
  if (isAuthenticated && (totalTime > 0 || tabUsage.length > 0)) {
    const snapshot = {
      totalTime: totalTime,
      tabs: combineTabUsageByUrl(tabUsage),
      date: lastSyncDate
    };
    // replace any existing offline entry for that date
    offlineQueue = offlineQueue.filter(item => item.date !== lastSyncDate);
    offlineQueue.push(snapshot);
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
  if (activeTabTimer) {
    clearInterval(activeTabTimer);
    activeTabTimer = null;
  }
  await saveAllData();
  updateTrackingBadge();
  notifyUser('New day - data reset', 'info');
  setTimeout(syncData, 2000);
}

async function fetchServerData(jwt, date, retries = 3) {
  notifyUser('Loading data...', 'sync');
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!isOnline || (isSystemIdle && !isMediaActive)) {
        console.log('Offline or idle (no media), skipping fetch attempt');
        notifyUser('Working offline or system idle', 'warning');
        return false;
      }

      const response = await fetch('https://chillboard-6uoj.onrender.com/screen-time', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${jwt}` },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        if (response.status === 401 && attempt === 1) {
          const newJwt = await refreshJwt();
          if (newJwt) return await fetchServerData(newJwt, date, retries);
          throw new Error('JWT refresh failed');
        }
        throw new Error(`Fetch server data failed: HTTP ${response.status} - ${response.statusText}`);
      }
      const screenTimeData = await response.json();
      const todayData = screenTimeData.find(entry => entry.date === date);
      if (todayData) {
        const combinedTabUsage = combineTabUsageByUrl(todayData.tabs.map(tab => ({
          tabId: tab.tabId || null,
          url: tab.url,
          timeSpent: tab.timeSpent
        })));
        totalTime = todayData.totalTime;
        tabUsage = combinedTabUsage;
        lastSyncedTotalTime = todayData.totalTime;
        lastSyncedTabUsage = [...combinedTabUsage];
        await saveAllData();
      }
      notifyUser('Data loaded', 'success');
      return true;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.warn(`Fetch attempt ${attempt} failed: Network error (offline or server unavailable)`);
        if (attempt === retries) {
          notifyUser('Working offline', 'warning');
          return false;
        }
      } else if (error.name === 'AbortError') {
        console.warn(`Fetch attempt ${attempt} timed out`);
        if (attempt === retries) {
          notifyUser('Server slow - using local data', 'warning');
          return false;
        }
      } else {
        console.error(`Fetch server data attempt ${attempt} failed:`, error.message);
        if (attempt === retries) {
          notifyUser('Using local data', 'warning');
          return false;
        }
      }
      await sleep(1000 * attempt);
    }
  }
}

async function refreshJwt() {
  try {
    const result = await getStorageData(['refreshToken']);
    const refreshToken = result.refreshToken;
    if (!refreshToken) throw new Error('No refresh token available');
    const response = await fetch('https://chillboard-6uoj.onrender.com/screen-time/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Refresh token failed: ${response.status}`);
    const data = await response.json();
    await setStorageData({ jwt: data.token });
    return data.token;
  } catch (error) {
    console.error('Error refreshing JWT:', error.message);
    notifyUser('Session expired - please login', 'warning');
    await clearStorageData(['jwt', 'refreshToken']);
    return null;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  notifyUser('ChillBoard ready!', 'success');
  safeInitialize();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup');
  notifyUser('ChillBoard started', 'info');
  safeInitialize();
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('System suspending, saving state and stopping tracking');
  if (isAuthenticated && isTracking && tabStartTime && currentTabId !== null && currentTabUrl) updateTabTime();
  saveAllData({ isTracking, currentTabId, currentTabUrl, tabStartTime, totalTime, tabUsage, lastSyncDate, offlineQueue, lastSyncedTotalTime, lastSyncedTabUsage });
  stopTracking();
});

chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('System suspend canceled, restoring state');
  chrome.storage.local.get(['isTracking', 'currentTabId', 'currentTabUrl', 'tabStartTime', 'totalTime', 'tabUsage', 'lastSyncDate', 'offlineQueue', 'lastSyncedTotalTime', 'lastSyncedTabUsage'], result => {
    if (result.isTracking && result.currentTabId && result.currentTabUrl && !(isSystemIdle && !isMediaActive)) {
      currentTabId = result.currentTabId;
      currentTabUrl = result.currentTabUrl;
      totalTime = result.totalTime || 0;
      tabUsage = result.tabUsage || [];
      lastSyncedTotalTime = result.lastSyncedTotalTime || 0;
      lastSyncedTabUsage = result.lastSyncedTabUsage || [];
      startTracking();
      notifyUser('Tracking restored', 'info');
    }
    setTimeout(checkFocus, 1000);
  });
});

function checkFocus() {
  if (isSystemIdle && !isMediaActive) return; // Skip if system is idle and no media
  chrome.windows.getLastFocused({ populate: true }, window => {
    if (chrome.runtime.lastError) {
      console.error('Error getting focused window:', chrome.runtime.lastError);
      stopTracking();
      return;
    }
    if (!window || window.state === 'minimized') return; // Continue tracking if minimized
    const activeTab = window.tabs.find(tab => tab.active);
    if (!activeTab || !activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://')) {
      stopTracking();
      return;
    }
    const newTabId = activeTab.id;
    const newTabUrl = extractHostname(activeTab.url);
    if (isAuthenticated && isTracking && currentTabId !== null && currentTabId !== newTabId && tabStartTime) updateTabTime();
    currentTabId = newTabId;
    currentTabUrl = newTabUrl;
    checkMediaActivity(activeTab.url); // Check if media is active
    if (!isTracking) startTracking();
    else {
      tabStartTime = Date.now();
      startActiveTabTimer();
    }
  });
}

function startTracking() {
  // NEW: do not track unless authenticated
  if (!isAuthenticated) return;
  if ((isSystemIdle && !isMediaActive) || !currentTabId || !currentTabUrl) return; // Do not start if idle and no media
  isTracking = true;
  tabStartTime = Date.now();
  lastUpdateTime = Date.now();
  console.log('Started tracking for tab:', { currentTabId, url: currentTabUrl });
  startActiveTabTimer();
  updateTrackingBadge();
  saveAllData();
}

function stopTracking() {
  if (isAuthenticated && isTracking && tabStartTime && currentTabId !== null) updateTabTime();
  isTracking = false;
  tabStartTime = null;
  lastUpdateTime = null;
  clearInterval(activeTabTimer);
  activeTabTimer = null;
  updateTrackingBadge();
  saveAllData();
}

function startActiveTabTimer() {
  if (activeTabTimer) clearInterval(activeTabTimer);
  activeTabTimer = setInterval(() => {
    if (isAuthenticated && isTracking && currentTabId !== null && tabStartTime !== null && currentTabUrl && !(isSystemIdle && !isMediaActive)) updateTabTime();
  }, 1000);
}

async function updateTabTime() {
  const currentDate = new Date().toISOString().split('T')[0];
  if (currentDate !== lastSyncDate) {
    await resetDailyData(currentDate);
    return; // Don't update after reset
  }

  if (!isAuthenticated || !isTracking || !tabStartTime || !currentTabUrl || currentTabId === null || (isSystemIdle && !isMediaActive)) return;

  const currentTime = Date.now();
  const timeSpent = Math.floor((currentTime - tabStartTime) / 1000);
  if (timeSpent >= 1) {
    const maxDailyTime = 86400;
    if (totalTime + timeSpent > maxDailyTime) {
      console.warn(`Total time capped at ${maxDailyTime}s for date ${lastSyncDate}`);
      totalTime = maxDailyTime;
      tabStartTime = currentTime;
      lastUpdateTime = currentTime;
      stopTracking();
      notifyUser('Daily time limit reached', 'warning');
      return;
    }
    totalTime += timeSpent;
    let existingTab = tabUsage.find(entry => entry.url === currentTabUrl);

    if (existingTab) {
      existingTab.timeSpent += timeSpent;
    } else {
      tabUsage.push({ 
        tabId: currentTabId, 
        url: currentTabUrl, 
        timeSpent
      });
    }
    saveAllData();
    tabStartTime = currentTime;
    lastUpdateTime = currentTime;
  }
}

function saveAllData(extraData = {}) {
  const combinedTabUsage = combineTabUsageByUrl(tabUsage);
  tabUsage = combinedTabUsage;
  return setStorageData({
    totalTime,
    tabUsage: combinedTabUsage,
    lastSyncDate,
    offlineQueue,
    lastSyncedTotalTime,
    lastSyncedTabUsage,
    isTracking,
    currentTabId,
    currentTabUrl,
    tabStartTime,
    ...extraData
  });
}

chrome.windows.onFocusChanged.addListener(windowId => {
  console.log('Window focus changed:', windowId);
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    if (isAuthenticated && isTracking) {
      updateTabTime();
      stopTracking();
      notifyUser('Paused - browser not focused', 'info');
    }
  } else if (!(isSystemIdle && !isMediaActive)) {
    setTimeout(checkFocus, 100);
  }
});

chrome.tabs.onActivated.addListener(activeInfo => {
  console.log('Tab activated:', activeInfo.tabId);
  if (isAuthenticated && isTracking && currentTabId !== null && tabStartTime && !(isSystemIdle && !isMediaActive)) updateTabTime();
  chrome.tabs.get(activeInfo.tabId, async tab => {
    if (chrome.runtime.lastError || !tab || !tab.url || tab.url.startsWith('chrome://')) {
      stopTracking();
      return;
    }
    currentTabId = activeInfo.tabId;
    currentTabUrl = extractHostname(tab.url);
    checkMediaActivity(tab.url); // Check if media is active
    if (!(isSystemIdle && !isMediaActive)) {
      if (isAuthenticated && isTracking) {
        tabStartTime = Date.now();
        startActiveTabTimer();
        updateTrackingBadge();
      }
      tabUsage.push({
        tabId: currentTabId,
        url: currentTabUrl,
        timeSpent: 0
      });
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === currentTabId && changeInfo.url && isAuthenticated && isTracking && !(isSystemIdle && !isMediaActive)) {
    if (tabStartTime) updateTabTime();
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      currentTabUrl = extractHostname(tab.url);
      checkMediaActivity(tab.url); // Re-check media activity
      tabStartTime = Date.now();
      startActiveTabTimer();
      updateTrackingBadge();
    } else stopTracking();
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  if (tabId === currentTabId) {
    if (isAuthenticated && isTracking && tabStartTime && !(isSystemIdle && !isMediaActive)) updateTabTime();
    stopTracking();
  }
});

chrome.webNavigation.onCommitted.addListener(details => {
  if (details.tabId === currentTabId && details.url) {
    currentTabUrl = extractHostname(details.url);
    checkMediaActivity(details.url); // Update media activity on navigation
    if (isTracking && (isSystemIdle && !isMediaActive)) {
      stopTracking();
    } else if (!isTracking && !isSystemIdle) {
      if (isAuthenticated) startTracking();
    }
  }
});

const SYNC_INTERVAL_MS = 300000; // 5 minutes in milliseconds
// Create two alarms: one to push local data (syncData) and another to pull latest from server (pullServerData)
chrome.alarms.create('syncData', { periodInMinutes: 5 });
chrome.alarms.create('pullServerData', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'syncData') {
    syncData();
  } else if (alarm.name === 'pullServerData') {
    // Periodically pull from server so DB remains source of truth and manual DB changes reflect in extension
    try {
      const { jwt } = await getStorageData(['jwt']);
      if (!jwt) return;
      const currentDate = new Date().toISOString().split('T')[0];
      await fetchServerData(jwt, currentDate);
    } catch (e) {
      console.warn('Periodic server pull failed', e?.message || e);
    }
  }
});

async function syncData(maxRetries = 3) {
  console.log('Starting data sync');
  try {
    const result = await getStorageData(['jwt', 'totalTime', 'tabUsage', 'offlineQueue', 'lastSyncDate', 'lastSyncedTotalTime', 'lastSyncedTabUsage']);
    let jwt = result.jwt;
    const currentDate = new Date().toISOString().split('T')[0];

    // NEW: if not authenticated, do not queue or sync
    if (!jwt) {
      notifyUser('Login required for sync', 'warning');
      return;
    }

    if (currentDate !== lastSyncDate) {
      await resetDailyData(currentDate);
      return;
    }

    // NEW: build absolute snapshot for current date, and include any queued snapshots (one per date)
    const currentSnapshot = {
      totalTime: totalTime,
      tabs: combineTabUsageByUrl(tabUsage),
      date: currentDate
    };
    // ensure offlineQueue has only one entry per date (last write wins)
    const byDate = new Map();
    offlineQueue.forEach(item => { byDate.set(item.date, { ...item, tabs: combineTabUsageByUrl(item.tabs || []) }); });
    byDate.set(currentSnapshot.date, currentSnapshot);
    const dataToSync = Array.from(byDate.values()).filter(item => (item.totalTime > 0) || (item.tabs && item.tabs.length > 0));

    if (!isOnline || (isSystemIdle && !isMediaActive)) {
      // queue or replace snapshot for current date
      offlineQueue = offlineQueue.filter(item => item.date !== currentDate);
      offlineQueue.push(currentSnapshot);
      await saveAllData();
      notifyUser('Offline or idle (no media) - data queued', 'warning');
      return;
    }

    if (dataToSync.length === 0) return;

    notifyUser('Syncing...', 'sync');

    const sentDates = new Set();
    for (const item of dataToSync) {
      const decodedJwt = jwtDecode(jwt);
      const userId = decodedJwt?.userId || 'unknown';
      console.log('Syncing data:', { userId, date: item.date, totalTime: item.totalTime, tabs: item.tabs });
      let attempt = 0;
      while (attempt < maxRetries) {

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);
          const response = await fetch('https://chillboard-6uoj.onrender.com/screen-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
            body: JSON.stringify({ 
              userId, 
              date: item.date, 
              totalTime: item.totalTime, 
              tabs: item.tabs.map(tab => ({
                tabId: tab.tabId,
                url: tab.url,
                timeSpent: tab.timeSpent
              }))
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!response.ok) {
            if (response.status === 401) {
              const newJwt = await refreshJwt();
              if (newJwt) {
                jwt = newJwt;
                return await syncData(maxRetries);
              }
              // keep snapshot queued
              offlineQueue = offlineQueue.filter(q => q.date !== item.date);
              offlineQueue.push(item);
              await saveAllData();
              notifyUser('Session expired', 'warning');
              return;
            }
            throw new Error(`Sync failed: ${response.status} - ${response.statusText}`);
          }
          sentDates.add(item.date);
          break;
        } catch (error) {
          attempt++;
          if (error.name === 'AbortError') {
            console.warn(`Sync attempt ${attempt} timed out for ${item.date}`);
            if (attempt === maxRetries) {
              offlineQueue = offlineQueue.filter(q => q.date !== item.date);
              offlineQueue.push(item);
              await saveAllData();
              notifyUser('Sync timeout - data queued', 'warning');
            }
          } else {
            console.error(`Sync attempt ${attempt} failed for ${item.date}:`, error.message);
            if (attempt === maxRetries) {
              offlineQueue = offlineQueue.filter(q => q.date !== item.date);
              offlineQueue.push(item);
              await saveAllData();
              notifyUser('Sync failed - data queued', 'error');
            }
          }
          if (attempt < maxRetries) await sleep(2000 * attempt);
        }
      }
    }

    // remove all successfully sent dates from queue
    offlineQueue = offlineQueue.filter(item => !sentDates.has(item.date));
    if (sentDates.has(currentDate)) {
      lastSyncedTotalTime = totalTime;
      lastSyncedTabUsage = [...tabUsage];
    }
    await saveAllData();
    
    notifyUser('Synced!', 'success');
  } catch (error) {
    console.error('Sync error:', error.message);
    // queue absolute snapshot for current date on error
    const snapshot = { totalTime, tabs: combineTabUsageByUrl(tabUsage), date: new Date().toISOString().split('T')[0] };
    offlineQueue = offlineQueue.filter(item => item.date !== snapshot.date);
    offlineQueue.push(snapshot);
    await saveAllData();
    notifyUser('Sync error - data saved locally', 'error');
  }
}

function startNetworkPolling() {
  setInterval(() => {
    const wasOnline = isOnline;
    isOnline = navigator.onLine;
    if (wasOnline !== isOnline) {
      if (isOnline) {
        console.log('Back online, attempting sync');
        notifyUser('Back online!', 'success');
        setTimeout(syncData, 2000);
      } else {
        console.log('Went offline');
        notifyUser('Working offline', 'warning');
      }
    }
  }, 5000);
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'success' });
    return true;
  } else if (request.action === 'getScreenTime') {
    sendResponse({ totalTime, tabUsage, isTracking, currentTabUrl });
    return true;
  } else if (request.action === 'resetData') {
    resetDailyData(new Date().toISOString().split('T')[0]).then(() => sendResponse({ success: true }));
    return true;
  } else if (request.action === 'syncData') {
    syncData().then(() => sendResponse({ success: true }));
    return true;
  } else if (request.action === 'getCurrentStats') {
    sendResponse({ status: 'success', totalTime, tabUsage });
    return true;
  } else if (request.action === 'getTrackingStatus') {
    sendResponse({ status: 'success', isTracking, currentTabUrl });
    return true;
  } else if (request.action === 'openWebApp') {
    chrome.tabs.create({ url: 'https://www.chillboard.in/' });
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'logout') {
    totalTime = 0;
    tabUsage = [];
    offlineQueue = [];
    lastSyncedTotalTime = 0;
    lastSyncedTabUsage = [];
    isTracking = false;
    isAuthenticated = false; // NEW: freeze tracking when logged out
    currentTabId = null;
    currentTabUrl = null;
    tabStartTime = null;
    if (activeTabTimer) {
      clearInterval(activeTabTimer);
      activeTabTimer = null;
    }
    await clearStorageData([
      'totalTime', 'tabUsage', 'lastSyncedTotalTime', 'lastSyncedTabUsage',
      'currentTabId', 'currentTabUrl', 'tabStartTime', 'isTracking', 'lastSyncDate', 'offlineQueue',
      'jwt', 'refreshToken'
    ]);
    notifyUser('Logged out successfully', 'success');
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'authUpdated') {
    // NEW: toggle auth state after login refresh and allow tracking to resume
    const { jwt } = await getStorageData(['jwt']);
    if (jwt) {
      const decoded = jwtDecode(jwt);
      isAuthenticated = !!decoded && (!decoded.exp || decoded.exp * 1000 > Date.now());
      // (Re)schedule proactive refresh when auth updates
      scheduleTokenRefresh(jwt);
    } else {
      isAuthenticated = false;
      if (refreshTimerId) { clearTimeout(refreshTimerId); refreshTimerId = null; }
    }

    if (!isAuthenticated) stopTracking();
    sendResponse({ success: true, isAuthenticated });
    return true;
  }
  return false;
});

function setupIdleDetection() {
  if (typeof chrome.idle !== 'undefined' && chrome.idle.setDetectionInterval) {
    chrome.idle.setDetectionInterval(15);
    chrome.idle.onStateChanged.addListener(state => {
      console.log('Idle state changed:', state);
      if (state === 'locked' || (state === 'idle' && !isMediaActive)) {
        isSystemIdle = true;
        if (isAuthenticated && isTracking) stopTracking();
        notifyUser('Paused - system idle or locked', 'info');
      } else if (state === 'active' || (state === 'idle' && isMediaActive)) {
        isSystemIdle = false;
        if (currentTabId && currentTabUrl) {
          setTimeout(checkFocus, 100);
          if (!isTracking) startTracking();
          notifyUser('Resumed tracking', 'info');
        }
      }
    });
  } else {
    console.warn('chrome.idle API not available, focus-based tracking only.');
  }
}

function checkMediaActivity(url) {
  const mediaHosts = ['youtube.com', 'netflix.com', 'vimeo.com', 'twitch.tv', 'primevideo.com'];
  const hostname = extractHostname(url);
  isMediaActive = mediaHosts.some(host => hostname.includes(host));
  console.log('Media activity detected:', isMediaActive, 'for URL:', url);
  updateTrackingBadge();
}

chrome.runtime.onInstalled.addListener(setupIdleDetection);
chrome.runtime.onStartup.addListener(setupIdleDetection);

// Also initialize on activation/load of the service worker
safeInitialize();