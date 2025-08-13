let isTracking = false;
let totalTime = 0;
let currentTabId = null;
let tabStartTime = null;
let tabUsage = []; // { tabId, url, timeSpent }
let lastSyncDate = new Date().toISOString().split('T')[0];
let offlineQueue = [];
let activeTabTimer = null;
let lastUpdateTime = null;
let currentTabUrl = null;
let lastSyncedTotalTime = 0;
let lastSyncedTabUsage = [];
let isOnline = navigator.onLine; // Use navigator for initial
let saveTimeout = null;

console.log('Service worker started');

function safeJwtDecode(token) {
  try {
    const [header, payload, signature] = token.split('.');
    if (!signature) throw new Error('Invalid token');
    const jsonPayload = decodeURIComponent(atob(payload.replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
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
  currentTabUsage.forEach(tab => deltaMap.set(tab.url, { ...tab, timeSpent: tab.timeSpent }));
  lastSyncedTabUsage.forEach(tab => {
    if (deltaMap.has(tab.url)) {
      const current = deltaMap.get(tab.url);
      current.timeSpent -= tab.timeSpent;
      if (current.timeSpent <= 0) deltaMap.delete(tab.url);
    }
  });
  return Array.from(deltaMap.values()).filter(tab => tab.timeSpent > 0);
}

function debounceSaveAllData() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveAllData, 5000); // Throttle to 5s
}

function notifyUser(message, type = 'info') {
  console.log('Notification:', message);
  
  let badgeText, badgeColor, clearTime;
  switch (type) {
    case 'error':
      badgeText = '!';
      badgeColor = '#ff0000';
      clearTime = 10000;
      break;
    case 'warning':
      badgeText = '⚠';
      badgeColor = '#ff8c00';
      clearTime = 7000;
      break;
    case 'success':
      badgeText = '✓';
      badgeColor = '#4CAF50';
      clearTime = 5000;
      break;
    case 'sync':
      badgeText = '↻';
      badgeColor = '#2196F3';
      clearTime = 5000;
      break;
    default:
      badgeText = 'i';
      badgeColor = '#666666';
      clearTime = 5000;
  }
  
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), clearTime);
}

function updateTrackingBadge() {
  if (isTracking && currentTabUrl) {
    chrome.action.setBadgeText({ text: '●' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    chrome.action.setTitle({ title: `ChillBoard - Tracking: ${currentTabUrl}` });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'ChillBoard - Not tracking' });
  }
}

function combineTabUsageByUrl(tabUsageArray) {
  const urlMap = new Map();
  tabUsageArray.forEach(tab => {
    if (urlMap.has(tab.url)) {
      const existing = urlMap.get(tab.url);
      existing.timeSpent += tab.timeSpent;
    } else {
      urlMap.set(tab.url, { ...tab });
    }
  });
  return Array.from(urlMap.values());
}

async function initializeStorage() {
  try {
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
        date: new Date(item.date).toISOString().split('T')[0] // Standardize to string
      }));
      if (result.isTracking && result.currentTabId && result.currentTabUrl) {
        currentTabId = result.currentTabId;
        currentTabUrl = result.currentTabUrl;
        tabStartTime = Date.now();
        startTracking();
      } else {
        // Start tracking on init if not active
        setTimeout(checkFocus, 1000);
      }
    }

    updateTrackingBadge();

    if (result.jwt) await fetchServerData(result.jwt, currentDate);
    startNetworkPolling();
    setupIdleDetection();
    startTrackingPoll(); // New: Poll to ensure continuous tracking
  } catch (error) {
    console.error('Initialize storage error:', error);
    notifyUser('Error initializing storage', 'error');
  }
}

function startTrackingPoll() {
  setInterval(() => {
    if (!isTracking) checkFocus();
  }, 60000); // Check every 1 min to resume if unloaded
}

async function resetDailyData(newDate) {
  try {
    if (totalTime > 0 || tabUsage.length > 0) {
      const deltaData = {
        totalTime: totalTime - lastSyncedTotalTime,
        tabs: calculateTabUsageDelta(tabUsage, lastSyncedTabUsage),
        date: lastSyncDate
      };
      if (deltaData.totalTime > 0 || deltaData.tabs.length > 0) offlineQueue.push(deltaData);
    }
    totalTime = 0;
    tabUsage = [];
    lastSyncedTotalTime = 0;
    lastSyncedTabUsage = [];
    isTracking = false;
    currentTabId = null;
    currentTabUrl = null;
    tabStartTime = null;
    if (activeTabTimer) clearInterval(activeTabTimer);
    lastSyncDate = newDate;
    await saveAllData();
    updateTrackingBadge();
    notifyUser('Daily data reset', 'info');
    setTimeout(syncData, 2000);
    // Restart tracking after reset
    setTimeout(checkFocus, 1000);
  } catch (error) {
    console.error('Reset data error:', error);
    notifyUser('Error resetting daily data', 'error');
  }
}

async function fetchServerData(jwt, date, retries = 3) {
  notifyUser('Syncing data...', 'sync');
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!isOnline) {
        console.log('Offline, skipping fetch');
        notifyUser('Offline - using local data', 'warning');
        return false;
      }

      const response = await fetch('https://chillboard-6uoj.onrender.com/screen-time', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${jwt}` },
        signal: AbortSignal.timeout(20000),
        mode: 'cors'
      });
      if (!response.ok) {
        if (response.status === 401 && attempt === 1) {
          const newJwt = await refreshJwt();
          if (newJwt) return await fetchServerData(newJwt, date, retries);
          throw new Error('JWT refresh failed');
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const screenTimeData = await response.json();
      const todayData = screenTimeData.find(entry => entry.date === date);
      if (todayData) {
        const combinedTabUsage = combineTabUsageByUrl(todayData.tabs);
        totalTime = todayData.totalTime;
        tabUsage = combinedTabUsage;
        lastSyncedTotalTime = todayData.totalTime;
        lastSyncedTabUsage = combinedTabUsage;
        await saveAllData();
      }
      notifyUser('Data synced', 'success');
      return true;
    } catch (error) {
      console.error(`Fetch attempt ${attempt}:`, error);
      if (attempt === retries) {
        notifyUser('Sync failed', 'error');
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return false;
}

async function refreshJwt() {
  try {
    const { refreshToken } = await getStorageData(['refreshToken']);
    if (!refreshToken) throw new Error('No refresh token');
    const response = await fetch('https://chillboard-6uoj.onrender.com/screen-time/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    await setStorageData({ jwt: data.token });
    return data.token;
  } catch (error) {
    console.error('Refresh JWT error:', error);
    notifyUser('Session expired', 'error');
    await clearStorageData(['jwt', 'refreshToken']);
    return null;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  initializeStorage();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup');
  initializeStorage();
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('Suspending, saving state');
  if (isTracking && tabStartTime && currentTabId !== null && currentTabUrl) updateTabTime();
  saveAllData();
  stopTracking();
});

chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('Suspend canceled, restoring state');
  getStorageData(['isTracking', 'currentTabId', 'currentTabUrl', 'tabStartTime', 'totalTime', 'tabUsage']).then(result => {
    if (result.isTracking && result.currentTabId && result.currentTabUrl) {
      currentTabId = result.currentTabId;
      currentTabUrl = result.currentTabUrl;
      totalTime = result.totalTime || 0;
      tabUsage = result.tabUsage || [];
      tabStartTime = Date.now();
      startTracking();
    }
    setTimeout(checkFocus, 1000);
  });
});

function checkFocus() {
  try {
    chrome.windows.getLastFocused({ populate: true }, window => {
      if (chrome.runtime.lastError) {
        console.error('Get focused window error:', chrome.runtime.lastError);
        stopTracking();
        return;
      }
      if (!window || window.state === 'minimized') {
        stopTracking();
        return;
      }
      const activeTab = window.tabs.find(tab => tab.active);
      if (!activeTab || !activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://')) {
        stopTracking();
        return;
      }
      const newTabId = activeTab.id;
      const newTabUrl = extractHostname(activeTab.url);
      if (isTracking && currentTabId !== null && currentTabId !== newTabId && tabStartTime) updateTabTime();
      currentTabId = newTabId;
      currentTabUrl = newTabUrl;
      if (!isTracking) startTracking();
      else {
        tabStartTime = Date.now();
        startActiveTabTimer();
      }
    });
  } catch (error) {
    console.error('Check focus error:', error);
    stopTracking();
  }
}

function startTracking() {
  isTracking = true;
  tabStartTime = Date.now();
  lastUpdateTime = Date.now();
  console.log('Started tracking:', currentTabUrl);
  startActiveTabTimer();
  updateTrackingBadge();
  debounceSaveAllData();
}

function stopTracking() {
  if (isTracking && tabStartTime && currentTabId !== null) updateTabTime();
  isTracking = false;
  tabStartTime = null;
  lastUpdateTime = null;
  if (activeTabTimer) clearInterval(activeTabTimer);
  activeTabTimer = null;
  updateTrackingBadge();
  debounceSaveAllData();
}

function startActiveTabTimer() {
  if (activeTabTimer) clearInterval(activeTabTimer);
  activeTabTimer = setInterval(() => {
    if (isTracking && currentTabId !== null && tabStartTime !== null && currentTabUrl) updateTabTime();
  }, 5000); // Increased to 5s
}

async function updateTabTime() {
  if (!isTracking || !tabStartTime || !currentTabUrl || currentTabId === null) return;
  const currentTime = Date.now();
  const timeSpent = Math.floor((currentTime - tabStartTime) / 1000);
  if (timeSpent >= 1) {
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
    tabStartTime = currentTime;
    lastUpdateTime = currentTime;
    debounceSaveAllData();
  }
}

async function saveAllData() {
  try {
    const combinedTabUsage = combineTabUsageByUrl(tabUsage);
    tabUsage = combinedTabUsage;
    await setStorageData({
      totalTime,
      tabUsage: combinedTabUsage,
      lastSyncDate,
      offlineQueue,
      lastSyncedTotalTime,
      lastSyncedTabUsage,
      isTracking,
      currentTabId,
      currentTabUrl,
      tabStartTime
    });
  } catch (error) {
    console.error('Save data error:', error);
  }
}

chrome.windows.onFocusChanged.addListener(windowId => {
  console.log('Window focus changed:', windowId);
  if (windowId === chrome.windows.WINDOW_ID_NONE) stopTracking();
  else setTimeout(checkFocus, 100);
});

chrome.tabs.onActivated.addListener(activeInfo => {
  try {
    console.log('Tab activated:', activeInfo.tabId);
    if (isTracking && currentTabId !== null && tabStartTime) updateTabTime();
    chrome.tabs.get(activeInfo.tabId, tab => {
      if (chrome.runtime.lastError || !tab || !tab.url || tab.url.startsWith('chrome://')) {
        stopTracking();
        return;
      }
      currentTabId = activeInfo.tabId;
      currentTabUrl = extractHostname(tab.url);
      if (isTracking) {
        tabStartTime = Date.now();
        startActiveTabTimer();
        updateTrackingBadge();
      }
      if (!tabUsage.some(entry => entry.url === currentTabUrl)) {
        tabUsage.push({ 
          tabId: currentTabId, 
          url: currentTabUrl, 
          timeSpent: 0 
        });
      }
    });
  } catch (error) {
    console.error('Tab activated error:', error);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  try {
    if (tabId === currentTabId && changeInfo.url && isTracking) {
      if (tabStartTime) updateTabTime();
      if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        currentTabUrl = extractHostname(tab.url);
        tabStartTime = Date.now();
        startActiveTabTimer();
        updateTrackingBadge();
      } else stopTracking();
    }
  } catch (error) {
    console.error('Tab updated error:', error);
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  try {
    if (tabId === currentTabId) {
      if (isTracking && tabStartTime) updateTabTime();
      stopTracking();
    }
  } catch (error) {
    console.error('Tab removed error:', error);
  }
});

const SYNC_INTERVAL_MS = 600000; // 10 minutes
chrome.alarms.create('syncData', { periodInMinutes: 10 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'syncData') syncData();
});

async function syncData(maxRetries = 3) {
  try {
    const result = await getStorageData(['jwt', 'totalTime', 'tabUsage', 'offlineQueue', 'lastSyncDate', 'lastSyncedTotalTime', 'lastSyncedTabUsage']);
    let jwt = result.jwt;
    const currentDate = new Date().toISOString().split('T')[0];

    if (!jwt) {
      const deltaData = { 
        totalTime: totalTime - lastSyncedTotalTime, 
        tabs: calculateTabUsageDelta(tabUsage, lastSyncedTabUsage), 
        date: currentDate 
      };
      if (deltaData.totalTime > 0 || deltaData.tabs.length > 0) {
        offlineQueue.push(deltaData);
      }
      await saveAllData();
      notifyUser('Please log in to sync', 'warning');
      return;
    }

    if (currentDate !== lastSyncDate) {
      await resetDailyData(currentDate);
      return;
    }

    const deltaTotalTime = totalTime - lastSyncedTotalTime;
    const batchedTabUsage = combineTabUsageByUrl(calculateTabUsageDelta(tabUsage, lastSyncedTabUsage));
    const dataToSync = [
      ...offlineQueue,
      ...(deltaTotalTime > 0 || batchedTabUsage.length > 0 ? [{ totalTime: deltaTotalTime, tabs: batchedTabUsage, date: currentDate }] : [])
    ].filter(item => item.totalTime > 0 || item.tabs.length > 0);

    if (!isOnline) {
      if (deltaTotalTime > 0 || batchedTabUsage.length > 0) {
        offlineQueue.push({ totalTime: deltaTotalTime, tabs: batchedTabUsage, date: currentDate });
        await saveAllData();
      }
      notifyUser('Offline - data queued', 'warning');
      return;
    }

    if (dataToSync.length === 0) return;

    notifyUser('Syncing...', 'sync');

    for (const item of dataToSync) {
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          const response = await fetch('https://chillboard-6uoj.onrender.com/screen-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
            body: JSON.stringify({ 
              totalTime: item.totalTime, 
              tabs: item.tabs,
              date: item.date
            }),
            signal: AbortSignal.timeout(20000),
            mode: 'cors'
          });
          if (!response.ok) {
            if (response.status === 401) {
              const newJwt = await refreshJwt();
              if (newJwt) {
                jwt = newJwt;
                return await syncData(maxRetries);
              }
              offlineQueue.push(item);
              await saveAllData();
              notifyUser('Session expired', 'error');
              return;
            }
            throw new Error(`Sync failed: ${response.status}`);
          }
          break;
        } catch (error) {
          attempt++;
          if (attempt === maxRetries) {
            offlineQueue.push(item);
            await saveAllData();
            notifyUser('Sync failed - queued', 'error');
          }
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    lastSyncedTotalTime = totalTime;
    lastSyncedTabUsage = [...tabUsage];
    offlineQueue = [];
    await saveAllData();
    notifyUser('Sync complete', 'success');
  } catch (error) {
    console.error('Sync error:', error);
    notifyUser('Sync failed', 'error');
  }
}

function startNetworkPolling() {
  setInterval(() => {
    const wasOnline = isOnline;
    isOnline = navigator.onLine;
    if (wasOnline !== isOnline) {
      if (isOnline) {
        console.log('Back online');
        notifyUser('Back online - syncing', 'info');
        setTimeout(syncData, 2000);
      } else {
        console.log('Went offline');
        notifyUser('Offline mode', 'warning');
      }
    }
  }, 30000); // Increased to 30s
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'ping') {
      sendResponse({ status: 'success' });
    } else if (request.action === 'getScreenTime') {
      sendResponse({ totalTime, tabUsage, isTracking, currentTabUrl });
    } else if (request.action === 'resetData') {
      resetDailyData(new Date().toISOString().split('T')[0]).then(() => sendResponse({ success: true }));
    } else if (request.action === 'syncData') {
      syncData().then(() => sendResponse({ success: true }));
    } else if (request.action === 'getCurrentStats') {
      sendResponse({ status: 'success', totalTime, tabUsage });
    } else if (request.action === 'getTrackingStatus') {
      sendResponse({ status: 'success', isTracking, currentTabUrl });
    } else if (request.action === 'openWebApp') {
      chrome.tabs.create({ url: 'https://chillboard.vercel.app/' });
      sendResponse({ success: true });
    }
    return true;
  } catch (error) {
    console.error('Message handler error:', error);
    sendResponse({ status: 'error' });
    return true;
  }
});

function setupIdleDetection() {
  if (chrome.idle) {
    chrome.idle.setDetectionInterval(30);
    chrome.idle.onStateChanged.addListener(state => {
      console.log('Idle state:', state);
      if (state === 'locked') { // Only pause on locked, not idle (for video watching)
        stopTracking();
      } else if (state === 'active' && currentTabId && currentTabUrl) {
        setTimeout(checkFocus, 100);
      }
    });
  } else {
    console.warn('chrome.idle not available');
  }
}

initializeStorage();
setupIdleDetection();
startTrackingPoll();