// service-worker.js
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

console.log('Service worker started');

// Utility functions
function jwtDecode(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

function extractHostname(url) {
  try {
    if (!url || typeof url !== 'string') return 'unknown';
    
    // Handle special cases
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return 'chrome';
    }
    
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    console.error('Error extracting hostname from:', url, error);
    return 'unknown';
  }
}

function getStorageData(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        console.error('Storage get error:', chrome.runtime.lastError);
        resolve({});
      } else {
        resolve(result);
      }
    });
  });
}

function setStorageData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage set error:', chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

function clearStorageData(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage clear error:', chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

function calculateTabUsageDelta(currentTabUsage, lastSyncedTabUsage) {
  const deltaMap = new Map();
  
  // Add current usage
  currentTabUsage.forEach(tab => {
    deltaMap.set(tab.url, {
      tabId: tab.tabId,
      url: tab.url,
      timeSpent: tab.timeSpent
    });
  });
  
  // Subtract last synced usage
  lastSyncedTabUsage.forEach(tab => {
    if (deltaMap.has(tab.url)) {
      const current = deltaMap.get(tab.url);
      current.timeSpent -= tab.timeSpent;
      if (current.timeSpent <= 0) {
        deltaMap.delete(tab.url);
      }
    }
  });
  
  return Array.from(deltaMap.values()).filter(tab => tab.timeSpent > 0);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function notifyUser(message) {
  console.log('Notification:', message);
  // You can implement actual notifications here if needed
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#ff0000' });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 5000);
}

// Initialize storage and start tracking
function initializeStorage() {
  chrome.storage.local.get([
    'totalTime', 'tabUsage', 'lastSyncDate', 'offlineQueue', 
    'lastSyncedTotalTime', 'lastSyncedTabUsage', 'jwt', 'refreshToken',
    'currentTabId', 'currentTabUrl', 'tabStartTime', 'isTracking'
  ], async (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error accessing chrome.storage.local:', chrome.runtime.lastError);
      return;
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    lastSyncDate = result.lastSyncDate || currentDate;

    // Check if it's a new day (midnight reset)
    if (lastSyncDate !== currentDate) {
      console.log('New day detected, resetting data');
      await resetDailyData(currentDate);
    } else {
      // Restore existing data
      totalTime = result.totalTime || 0;
      tabUsage = result.tabUsage || [];
      lastSyncedTotalTime = result.lastSyncedTotalTime || 0;
      lastSyncedTabUsage = result.lastSyncedTabUsage || [];
      offlineQueue = (result.offlineQueue || []).map(item => ({
        ...item,
        date: typeof item.date === 'number' ? new Date(item.date).toISOString().split('T')[0] : item.date
      }));
      
      // Restore tracking state after sleep/wake
      if (result.isTracking && result.currentTabId && result.currentTabUrl) {
        currentTabId = result.currentTabId;
        currentTabUrl = result.currentTabUrl;
        tabStartTime = Date.now(); // Reset start time to current time
        console.log('Restored tracking state after wake:', { currentTabId, currentTabUrl, totalTime });
      }
    }

    // Fetch server data if authenticated
    if (result.jwt) {
      await fetchServerData(result.jwt, currentDate);
    }

    console.log('Initialized storage:', { 
      totalTime, 
      tabUsage: tabUsage.length, 
      lastSyncDate, 
      lastSyncedTotalTime, 
      lastSyncedTabUsage: lastSyncedTabUsage.length, 
      offlineQueue: offlineQueue.length 
    });

    // Start tracking if Chrome is focused
    setTimeout(() => checkFocus(), 1000);
  });
}

async function resetDailyData(newDate) {
  try {
    // Send remaining data to server before reset
    if (totalTime > 0 || tabUsage.length > 0) {
      const deltaData = {
        totalTime: totalTime - lastSyncedTotalTime,
        tabs: calculateTabUsageDelta(tabUsage, lastSyncedTabUsage),
        date: lastSyncDate
      };
      
      if (deltaData.totalTime > 0 || deltaData.tabs.length > 0) {
        offlineQueue.push(deltaData);
        console.log('Queued final data for previous day:', deltaData);
      }
    }

    // Reset all tracking data
    totalTime = 0;
    tabUsage = [];
    lastSyncedTotalTime = 0;
    lastSyncedTabUsage = [];
    lastSyncDate = newDate;
    
    // Stop current tracking and reset state
    isTracking = false;
    currentTabId = null;
    currentTabUrl = null;
    tabStartTime = null;
    
    // Clear any active timers
    if (activeTabTimer) {
      clearInterval(activeTabTimer);
      activeTabTimer = null;
    }
    
    // Save reset state
    await saveAllData();
    
    console.log('Daily data reset complete for:', newDate);
    
    // Trigger sync of queued data
    setTimeout(() => syncData(), 2000);
    
  } catch (error) {
    console.error('Error resetting daily data:', error);
  }
}

async function fetchServerData(jwt, date, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch('http://localhost:5000/screen-time', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${jwt}` },
      });
      
      if (!response.ok) {
        if (response.status === 401 && attempt === 1) {
          console.log('JWT expired, attempting to refresh');
          const newJwt = await refreshJwt();
          if (newJwt) {
            return await fetchServerData(newJwt, date, retries);
          }
          throw new Error('JWT refresh failed');
        }
        throw new Error(`Fetch server data failed: ${response.status}`);
      }
      
      const screenTimeData = await response.json();
      const todayData = screenTimeData.find((entry) => entry.date === date);
      
      if (todayData) {
        // Convert server data to local format and combine same URLs
        const combinedTabUsage = combineTabUsageByUrl(todayData.tabs.map(tab => ({
          tabId: tab.tabId || null,
          url: tab.url,
          timeSpent: tab.timeSpent
        })));
        
        // Update local data with server data
        totalTime = todayData.totalTime;
        tabUsage = combinedTabUsage;
        lastSyncedTotalTime = todayData.totalTime;
        lastSyncedTabUsage = [...combinedTabUsage];
        
        await saveAllData();
        console.log('Updated local storage from server:', { totalTime, tabUsage: tabUsage.length });
      } else {
        console.log('No server data for today, preserving local data');
      }
      return true;
    } catch (error) {
      console.error(`Fetch server data attempt ${attempt} failed:`, error.message);
      if (attempt === retries) {
        console.error('Max retries reached, preserving local data');
        notifyUser('Failed to sync with server. Using local data.');
        return false;
      }
      await sleep(1000);
    }
  }
}

async function refreshJwt() {
  try {
    const result = await getStorageData(['refreshToken']);
    const refreshToken = result.refreshToken;
    if (!refreshToken) throw new Error('No refresh token available');
    
    const response = await fetch('http://localhost:5000/screen-time/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) throw new Error(`Refresh token failed: ${response.status}`);
    
    const data = await response.json();
    await setStorageData({ jwt: data.token });
    console.log('JWT refreshed successfully');
    return data.token;
  } catch (error) {
    console.error('Error refreshing JWT:', error.message);
    notifyUser('Session expired. Please log in again.');
    await clearStorageData(['jwt', 'refreshToken']);
    return null;
  }
}

// Event listeners
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  initializeStorage();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup');
  initializeStorage();
});

// Handle system sleep/suspend
chrome.runtime.onSuspend.addListener(() => {
  console.log('System suspending, saving state and stopping tracking');
  if (isTracking && tabStartTime && currentTabId !== null && currentTabUrl) {
    updateTabTime();
  }
  
  // Save complete state before sleep
  saveAllData({
    isTracking,
    currentTabId,
    currentTabUrl,
    tabStartTime,
    totalTime,
    tabUsage,
    lastSyncDate,
    offlineQueue,
    lastSyncedTotalTime,
    lastSyncedTabUsage
  });
  
  stopTracking();
});

// Handle system wake
chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('System suspend canceled, restoring state');
  // Restore state from storage
  chrome.storage.local.get([
    'isTracking', 'currentTabId', 'currentTabUrl', 'tabStartTime',
    'totalTime', 'tabUsage', 'lastSyncDate', 'offlineQueue',
    'lastSyncedTotalTime', 'lastSyncedTabUsage'
  ], (result) => {
    if (result.isTracking && result.currentTabId && result.currentTabUrl) {
      currentTabId = result.currentTabId;
      currentTabUrl = result.currentTabUrl;
      totalTime = result.totalTime || 0;
      tabUsage = result.tabUsage || [];
      lastSyncedTotalTime = result.lastSyncedTotalTime || 0;
      lastSyncedTabUsage = result.lastSyncedTabUsage || [];
      offlineQueue = result.offlineQueue || [];
      
      console.log('Restored state after wake:', { 
        currentTabId, 
        currentTabUrl, 
        totalTime, 
        tabUsage: tabUsage.length 
      });
    }
    
    // Check if Chrome is still focused and resume tracking
    setTimeout(() => checkFocus(), 1000);
  });
});

function checkFocus() {
  chrome.windows.getLastFocused({ populate: true }, (window) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting focused window:', chrome.runtime.lastError);
      stopTracking();
      return;
    }

    if (!window || window.state === 'minimized') {
      console.log(`Window state: ${window?.state || 'unknown'} - stopping tracking`);
      stopTracking();
      return;
    }

    const activeTab = window.tabs.find((tab) => tab.active);
    if (!activeTab || !activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://')) {
      console.log('No valid active tab found - stopping tracking');
      stopTracking();
      return;
    }

    const newTabId = activeTab.id;
    const newTabUrl = extractHostname(activeTab.url);

    // If switching tabs, update the previous tab's time
    if (isTracking && currentTabId !== null && currentTabId !== newTabId && tabStartTime) {
      updateTabTime();
    }

    // Update current tab info
    currentTabId = newTabId;
    currentTabUrl = newTabUrl;

    if (!isTracking) {
      startTracking();
    } else {
      // Reset start time for new tab or continued tracking
      tabStartTime = Date.now();
      lastUpdateTime = Date.now();
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
  saveAllData();
}

function stopTracking() {
  if (isTracking && tabStartTime && currentTabId !== null) {
    updateTabTime();
  }
  
  isTracking = false;
  tabStartTime = null;
  lastUpdateTime = null;
  clearInterval(activeTabTimer);
  activeTabTimer = null;
  saveAllData();
  console.log('Tracking stopped');
}

function startActiveTabTimer() {
  if (activeTabTimer) {
    clearInterval(activeTabTimer);
  }
  
  activeTabTimer = setInterval(() => {
    if (isTracking && currentTabId !== null && tabStartTime !== null && currentTabUrl) {
      updateTabTime();
    }
  }, 1000);
}

function updateTabTime() {
  if (!isTracking || !tabStartTime || !currentTabUrl || currentTabId === null) {
    return;
  }

  const currentTime = Date.now();
  const timeSpent = Math.floor((currentTime - tabStartTime) / 1000);
  
  if (timeSpent >= 1) {
    totalTime += timeSpent;
    
    // Find existing tab entry by URL only (not tabId)
    let existingTab = tabUsage.find(entry => entry.url === currentTabUrl);
    
    if (existingTab) {
      existingTab.timeSpent += timeSpent;
    } else {
      tabUsage.push({ 
        tabId: currentTabId, 
        url: currentTabUrl, 
        timeSpent: timeSpent 
      });
    }
    
    console.log('Updated tab usage:', { 
      tabId: currentTabId, 
      url: currentTabUrl, 
      timeSpent, 
      totalTime, 
      totalTabs: tabUsage.length 
    });
    
    saveAllData();
    tabStartTime = currentTime;
    lastUpdateTime = currentTime;
  }
}

function combineTabUsageByUrl(tabUsageArray) {
  const urlMap = new Map();
  
  tabUsageArray.forEach(tab => {
    if (urlMap.has(tab.url)) {
      urlMap.get(tab.url).timeSpent += tab.timeSpent;
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

function saveAllData(extraData = {}) {
  // Combine same URLs before saving
  const combinedTabUsage = combineTabUsageByUrl(tabUsage);
  
  const dataToSave = {
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
  };
  
  // Update the in-memory tabUsage with combined data
  tabUsage = combinedTabUsage;
  
  return setStorageData(dataToSave);
}

// Window and tab event listeners
chrome.windows.onFocusChanged.addListener((windowId) => {
  console.log('Window focus changed:', windowId);
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // All windows lost focus
    stopTracking();
  } else {
    // A window gained focus
    setTimeout(() => checkFocus(), 100);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
  
  if (isTracking && currentTabId !== null && tabStartTime) {
    updateTabTime();
  }
  
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url || tab.url.startsWith('chrome://')) {
      console.warn('Invalid tab on activation:', chrome.runtime.lastError?.message);
      stopTracking();
      return;
    }
    
    currentTabId = activeInfo.tabId;
    currentTabUrl = extractHostname(tab.url);
    
    if (isTracking) {
      tabStartTime = Date.now();
      startActiveTabTimer();
    }
    
    console.log('Tab activated and updated:', { currentTabId, url: currentTabUrl });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === currentTabId && changeInfo.url && isTracking) {
    // URL changed on current tab
    if (tabStartTime) {
      updateTabTime();
    }
    
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      currentTabUrl = extractHostname(tab.url);
      tabStartTime = Date.now();
      console.log('Tab URL updated:', { currentTabId, url: currentTabUrl });
      startActiveTabTimer();
    } else {
      console.warn('Invalid tab URL on update:', tab.url);
      stopTracking();
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentTabId) {
    console.log('Current tab removed');
    if (isTracking && tabStartTime) {
      updateTabTime();
    }
    stopTracking();
  }
});

// Sync functionality
const SYNC_INTERVAL_MINUTES = 5;
chrome.alarms.create('syncData', { periodInMinutes: SYNC_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') {
    console.log('Sync alarm triggered');
    syncData();
  }
});

async function syncData() {
  console.log('Starting data sync');
  
  try {
    const result = await getStorageData([
      'jwt', 'totalTime', 'tabUsage', 'offlineQueue', 'lastSyncDate', 
      'lastSyncedTotalTime', 'lastSyncedTabUsage'
    ]);
    
    let jwt = result.jwt;
    const currentDate = new Date().toISOString().split('T')[0];
    
    if (!jwt) {
      console.log('No JWT, queuing data for later sync');
      const deltaData = {
        totalTime: totalTime - lastSyncedTotalTime,
        tabs: calculateTabUsageDelta(tabUsage, lastSyncedTabUsage),
        date: currentDate
      };
      
      if (deltaData.totalTime > 0 || deltaData.tabs.length > 0) {
        offlineQueue.push(deltaData);
        await saveAllData();
      }
      
      notifyUser('Please log in to sync data.');
      return;
    }
    
    // Check if date changed during sync
    if (currentDate !== lastSyncDate) {
      await resetDailyData(currentDate);
      return;
    }
    
    const deltaTotalTime = totalTime - lastSyncedTotalTime;
    const deltaTabUsage = calculateTabUsageDelta(tabUsage, lastSyncedTabUsage);
    
    // Prepare all data to sync (offline queue + current delta)
    const dataToSync = [
      ...offlineQueue,
      ...(deltaTotalTime > 0 || deltaTabUsage.length > 0 ? [{
        totalTime: deltaTotalTime,
        tabs: deltaTabUsage,
        date: currentDate
      }] : [])
    ].filter(item => item.totalTime > 0 || item.tabs.length > 0);
    
    if (!navigator.onLine) {
      console.log('Offline, queuing data');
      if (deltaTotalTime > 0 || deltaTabUsage.length > 0) {
        offlineQueue.push({
          totalTime: deltaTotalTime,
          tabs: deltaTabUsage,
          date: currentDate
        });
        await saveAllData();
      }
      notifyUser('Offline. Data will sync when online.');
      return;
    }
    
    if (dataToSync.length === 0) {
      console.log('No data to sync');
      return;
    }
    
    // Sync each data item
    for (const item of dataToSync) {
      console.log('Syncing data item:', { 
        totalTime: item.totalTime, 
        tabs: item.tabs.length, 
        date: item.date 
      });
      
      // Decode JWT to get userId
      const decodedJwt = jwtDecode(jwt);
      const userId = decodedJwt?.userId || 'unknown';
      
      const response = await fetch('http://localhost:5000/screen-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          userId: userId,
          date: item.date,
          totalTime: item.totalTime,
          tabs: item.tabs,
        }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('JWT expired during sync, refreshing');
          const newJwt = await refreshJwt();
          if (newJwt) {
            jwt = newJwt;
            return await syncData(); // Retry with new JWT
          }
          
          // JWT refresh failed, queue data
          offlineQueue.push(item);
          await saveAllData();
          notifyUser('Session expired. Please log in again.');
          return;
        }
        throw new Error(`Sync failed: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Sync successful:', responseData);
    }
    
    // Update sync markers
    lastSyncedTotalTime = totalTime;
    lastSyncedTabUsage = [...tabUsage];
    
    // Clear synced offline queue items
    offlineQueue = offlineQueue.filter(item => item.date !== currentDate);
    
    await saveAllData();
    console.log('Sync completed successfully');
    
  } catch (error) {
    console.error('Sync error:', error.message);
    
    // Queue current data if sync failed
    const deltaData = {
      totalTime: totalTime - lastSyncedTotalTime,
      tabs: calculateTabUsageDelta(tabUsage, lastSyncedTabUsage),
      date: new Date().toISOString().split('T')[0]
    };
    
    if (deltaData.totalTime > 0 || deltaData.tabs.length > 0) {
      offlineQueue.push(deltaData);
      await saveAllData();
    }
    
    notifyUser('Sync failed. Data queued for retry.');
  }
}

// Message handler for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getScreenTime') {
    sendResponse({
      totalTime: totalTime,
      tabUsage: tabUsage,
      isTracking: isTracking,
      currentTabUrl: currentTabUrl
    });
  } else if (request.action === 'resetData') {
    resetDailyData(new Date().toISOString().split('T')[0]);
    sendResponse({ success: true });
  } else if (request.action === 'syncNow') {
    syncData();
    sendResponse({ success: true });
  }
});

// Initialize on startup
initializeStorage();