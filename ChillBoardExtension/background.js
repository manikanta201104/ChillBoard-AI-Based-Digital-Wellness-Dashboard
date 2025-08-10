let isTracking = false;
let totalTime = 0;
let currentTabId = null;
let tabStartTime = null;
let tabUsage = [];
let lastSyncDate = new Date().toISOString().split('T')[0];
let offlineQueue = [];
let activeTabTimer = null;
let lastUpdateTime = null;
let currentTabUrl = null;
let lastSyncedTotalTime = 0;
let lastSyncedTabUsage = [];
let isOnline = true; // Initial assumption

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
    const urlObj = new URL(url);
    return urlObj.hostname;
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
  currentTabUsage.forEach(tab => deltaMap.set(tab.url, { tabId: tab.tabId, url: tab.url, timeSpent: tab.timeSpent }));
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

// Enhanced notification system with better visual feedback
function notifyUser(message, type = 'info') {
  console.log('Notification:', message);
  
  // Set appropriate badge based on notification type
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
  
  // Clear badge after appropriate time based on message importance
  const clearTime = type === 'error' ? 10000 : type === 'warning' ? 7000 : 5000;
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), clearTime);
}

// Enhanced tracking status indication
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
    if (urlMap.has(tab.url)) urlMap.get(tab.url).timeSpent += tab.timeSpent;
    else urlMap.set(tab.url, { tabId: tab.tabId, url: tab.url, timeSpent: tab.timeSpent });
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
      return;
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    lastSyncDate = result.lastSyncDate || currentDate;

    if (lastSyncDate !== currentDate) await resetDailyData(currentDate);
    else {
      totalTime = result.totalTime || 0;
      tabUsage = result.tabUsage || [];
      lastSyncedTotalTime = result.lastSyncedTotalTime || 0;
      lastSyncedTabUsage = result.lastSyncedTabUsage || [];
      offlineQueue = (result.offlineQueue || []).map(item => ({
        ...item,
        date: typeof item.date === 'number' ? new Date(item.date).toISOString().split('T')[0] : item.date
      }));
      if (result.isTracking && result.currentTabId && result.currentTabUrl) {
        currentTabId = result.currentTabId;
        currentTabUrl = result.currentTabUrl;
        tabStartTime = Date.now();
        startTracking();
      }
    }

    // Update initial badge state
    updateTrackingBadge();

    if (result.jwt) await fetchServerData(result.jwt, currentDate);
    setTimeout(checkFocus, 1000);
    startNetworkPolling();
  });
}

async function resetDailyData(newDate) {
  if (totalTime > 0 || tabUsage.length > 0) {
    const deltaData = {
      totalTime: totalTime - lastSyncedTotalTime,
      tabs: calculateTabUsageDelta(tabUsage, lastSyncedTabUsage),
      date: lastSyncDate
    };
    if (deltaData.totalTime > 0 || deltaData.tabs.length > 0) {
      offlineQueue.push(deltaData);
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
  if (activeTabTimer) {
    clearInterval(activeTabTimer);
    activeTabTimer = null;
  }
  await saveAllData();
  updateTrackingBadge();
  notifyUser('Daily data reset', 'info');
  setTimeout(syncData, 2000);
}

async function fetchServerData(jwt, date, retries = 3) {
  notifyUser('Syncing data...', 'sync');
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!isOnline) {
        console.log('Offline, skipping fetch attempt');
        notifyUser('Offline - using local data', 'warning');
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
      notifyUser('Data synced successfully', 'success');
      return true;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.warn(`Fetch attempt ${attempt} failed: Network error (offline or server unavailable)`);
        if (attempt === retries) {
          notifyUser('Network error - using local data', 'warning');
          return false;
        }
      } else if (error.name === 'AbortError') {
        console.warn(`Fetch attempt ${attempt} timed out`);
        if (attempt === retries) {
          notifyUser('Server timeout - using local data', 'warning');
          return false;
        }
      } else {
        console.error(`Fetch server data attempt ${attempt} failed:`, error.message);
        if (attempt === retries) {
          notifyUser('Server sync failed - using local data', 'error');
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
    notifyUser('Session expired - please log in', 'error');
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
  console.log('System suspending, saving state and stopping tracking');
  if (isTracking && tabStartTime && currentTabId !== null && currentTabUrl) updateTabTime();
  saveAllData({ isTracking, currentTabId, currentTabUrl, tabStartTime, totalTime, tabUsage, lastSyncDate, offlineQueue, lastSyncedTotalTime, lastSyncedTabUsage });
  stopTracking();
});

chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('System suspend canceled, restoring state');
  chrome.storage.local.get(['isTracking', 'currentTabId', 'currentTabUrl', 'tabStartTime', 'totalTime', 'tabUsage', 'lastSyncDate', 'offlineQueue', 'lastSyncedTotalTime', 'lastSyncedTabUsage'], result => {
    if (result.isTracking && result.currentTabId && result.currentTabUrl) {
      currentTabId = result.currentTabId;
      currentTabUrl = result.currentTabUrl;
      totalTime = result.totalTime || 0;
      tabUsage = result.tabUsage || [];
      lastSyncedTotalTime = result.lastSyncedTotalTime || 0;
      lastSyncedTabUsage = result.lastSyncedTabUsage || [];
      offlineQueue = result.offlineQueue || [];
      startTracking();
    }
    setTimeout(checkFocus, 1000);
  });
});

function checkFocus() {
  chrome.windows.getLastFocused({ populate: true }, window => {
    if (chrome.runtime.lastError) {
      console.error('Error getting focused window:', chrome.runtime.lastError);
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
}

function startTracking() {
  isTracking = true;
  tabStartTime = Date.now();
  lastUpdateTime = Date.now();
  console.log('Started tracking for tab:', { currentTabId, url: currentTabUrl });
  startActiveTabTimer();
  updateTrackingBadge(); // Update badge when tracking starts
  saveAllData();
}

function stopTracking() {
  if (isTracking && tabStartTime && currentTabId !== null) updateTabTime();
  isTracking = false;
  tabStartTime = null;
  lastUpdateTime = null;
  clearInterval(activeTabTimer);
  activeTabTimer = null;
  updateTrackingBadge(); // Update badge when tracking stops
  saveAllData();
}

function startActiveTabTimer() {
  if (activeTabTimer) clearInterval(activeTabTimer);
  activeTabTimer = setInterval(() => {
    if (isTracking && currentTabId !== null && tabStartTime !== null && currentTabUrl) updateTabTime();
  }, 1000);
}

function updateTabTime() {
  if (!isTracking || !tabStartTime || !currentTabUrl || currentTabId === null) return;
  const currentTime = Date.now();
  const timeSpent = Math.floor((currentTime - tabStartTime) / 1000);
  if (timeSpent >= 1) {
    totalTime += timeSpent;
    let existingTab = tabUsage.find(entry => entry.url === currentTabUrl);
    if (existingTab) existingTab.timeSpent += timeSpent;
    else tabUsage.push({ tabId: currentTabId, url: currentTabUrl, timeSpent });
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
  if (windowId === chrome.windows.WINDOW_ID_NONE) stopTracking();
  else setTimeout(checkFocus, 100);
});

chrome.tabs.onActivated.addListener(activeInfo => {
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
      updateTrackingBadge(); // Update badge with new tab info
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === currentTabId && changeInfo.url && isTracking) {
    if (tabStartTime) updateTabTime();
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      currentTabUrl = extractHostname(tab.url);
      tabStartTime = Date.now();
      startActiveTabTimer();
      updateTrackingBadge(); // Update badge with new URL
    } else stopTracking();
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  if (tabId === currentTabId) {
    if (isTracking && tabStartTime) updateTabTime();
    stopTracking();
  }
});

const SYNC_INTERVAL_MS = 600000; // 10 minutes in milliseconds
chrome.alarms.create('syncData', { periodInMinutes: 10 }); // Consistent with 600,000 ms

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'syncData') syncData();
});

async function syncData(maxRetries = 3) {
  console.log('Starting data sync');
  try {
    const result = await getStorageData(['jwt', 'totalTime', 'tabUsage', 'offlineQueue', 'lastSyncDate', 'lastSyncedTotalTime', 'lastSyncedTabUsage']);
    let jwt = result.jwt;
    const currentDate = new Date().toISOString().split('T')[0];

    if (!jwt) {
      const deltaData = { totalTime: totalTime - lastSyncedTotalTime, tabs: calculateTabUsageDelta(tabUsage, lastSyncedTabUsage), date: currentDate };
      if (deltaData.totalTime > 0 || deltaData.tabs.length > 0) {
        offlineQueue.push(deltaData);
        await saveAllData();
      }
      notifyUser('Please log in to sync data', 'warning');
      return;
    }

    if (currentDate !== lastSyncDate) {
      await resetDailyData(currentDate);
      return;
    }

    const deltaTotalTime = totalTime - lastSyncedTotalTime;
    // Batch tab usage by aggregating into a single entry per URL
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
      notifyUser('Offline - data queued for sync', 'warning');
      return;
    }

    if (dataToSync.length === 0) return;

    notifyUser('Syncing data...', 'sync');

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
            body: JSON.stringify({ userId, date: item.date, totalTime: item.totalTime, tabs: item.tabs }),
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
              offlineQueue.push(item);
              await saveAllData();
              notifyUser('Session expired - please log in', 'error');
              return;
            }
            throw new Error(`Sync failed: ${response.status} - ${response.statusText}`);
          }
          break;
        } catch (error) {
          attempt++;
          if (error.name === 'AbortError') {
            console.warn(`Sync attempt ${attempt} timed out for ${item.date}`);
            if (attempt === maxRetries) {
              offlineQueue.push(item);
              await saveAllData();
              notifyUser('Sync timed out - data queued', 'warning');
            }
          } else {
            console.error(`Sync attempt ${attempt} failed for ${item.date}:`, error.message);
            if (attempt === maxRetries) {
              offlineQueue.push(item);
              await saveAllData();
              notifyUser('Sync failed - data queued', 'error');
            }
          }
          if (attempt < maxRetries) await sleep(2000 * attempt);
        }
      }
    }

    lastSyncedTotalTime = totalTime;
    lastSyncedTabUsage = [...tabUsage];
    offlineQueue = offlineQueue.filter(item => item.date !== currentDate);
    await saveAllData();
    
    notifyUser('Sync completed successfully', 'success');
  } catch (error) {
    console.error('Sync error:', error.message);
    const deltaTotalTime = totalTime - lastSyncedTotalTime;
    const batchedTabUsage = combineTabUsageByUrl(calculateTabUsageDelta(tabUsage, lastSyncedTabUsage));
    const deltaData = { totalTime: deltaTotalTime, tabs: batchedTabUsage, date: new Date().toISOString().split('T')[0] };
    if (deltaData.totalTime > 0 || deltaData.tabs.length > 0) {
      offlineQueue.push(deltaData);
      await saveAllData();
    }
    notifyUser('Sync failed - data queued', 'error');
  }
}

// Poll network status since window is not available
function startNetworkPolling() {
  setInterval(() => {
    const wasOnline = isOnline;
    isOnline = navigator.onLine;
    if (wasOnline !== isOnline) {
      if (isOnline) {
        console.log('Back online, attempting sync');
        notifyUser('Back online - syncing data', 'info');
        setTimeout(syncData, 2000);
      } else {
        console.log('Went offline');
        notifyUser('Offline mode active', 'warning');
      }
    }
  }, 5000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
    chrome.tabs.create({ url: 'https://chillboard-6uoj.onrender.com' });
    sendResponse({ success: true });
    return true;
  }
  return false;
});

initializeStorage();

// Focus-based idle detection with error handling
function setupIdleDetection() {
  if (typeof chrome.idle !== 'undefined' && chrome.idle.setDetectionInterval) {
    chrome.idle.setDetectionInterval(30);
    chrome.idle.onStateChanged.addListener(state => {
      console.log('Idle state changed:', state);
      if (state === 'locked' || state === 'idle') stopTracking();
      else if (currentTabId && currentTabUrl) setTimeout(checkFocus, 100);
    });
  } else {
    console.warn('chrome.idle API not available, focus-based tracking only.');
  }
}

chrome.runtime.onInstalled.addListener(setupIdleDetection);
chrome.runtime.onStartup.addListener(setupIdleDetection);