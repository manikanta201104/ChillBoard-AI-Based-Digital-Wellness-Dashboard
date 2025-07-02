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

console.log('Service worker started');

function initializeStorage() {
  chrome.storage.local.get(['totalTime', 'tabUsage', 'lastSyncDate', 'offlineQueue'], (result) => {
    const currentDate = new Date().toISOString().split('T')[0];
    lastSyncDate = result.lastSyncDate || currentDate;
    
    // Only reset totalTime and tabUsage if date has changed
    if (lastSyncDate !== currentDate) {
      totalTime = 0;
      tabUsage = [];
      offlineQueue = result.offlineQueue || [];
      console.log('Date changed, resetting totalTime and tabUsage', { lastSyncDate, currentDate });
    } else {
      totalTime = result.totalTime || 0;
      tabUsage = result.tabUsage || [];
      offlineQueue = result.offlineQueue || [];
    }
    
    console.log('Initialized storage:', { totalTime, tabUsage, lastSyncDate, offlineQueue });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id && tabs[0].url && (tabs[0].url.startsWith('http://') || tabs[0].url.startsWith('https://'))) {
        currentTabId = tabs[0].id;
        currentTabUrl = new URL(tabs[0].url).hostname;
        console.log('Set initial active tab:', { currentTabId, url: currentTabUrl });
        checkFocus();
      } else {
        console.warn('No valid initial tab found');
        stopTracking();
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  initializeStorage();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup');
  initializeStorage();
});

function checkFocus() {
  chrome.windows.getLastFocused({ populate: true }, (window) => {
    if (!window || window.state === 'minimized' || !window.focused) {
      console.log(`Window focus state: ${window?.focused ? 'focused' : 'not focused'}`);
      stopTracking();
      return;
    }

    const activeTab = window.tabs.find((tab) => tab.active);
    if (!activeTab || !activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://')) {
      console.log(`Window focus state: ${window?.focused ? 'focused' : 'not focused'}, invalid tab`);
      stopTracking();
      return;
    }

    if (currentTabId !== activeTab.id) {
      if (isTracking && tabStartTime && currentTabId !== null && currentTabUrl) {
        updateTabTime(currentTabUrl);
      }
      currentTabId = activeTab.id;
      currentTabUrl = new URL(activeTab.url).hostname;
      console.log('Active tab changed:', { currentTabId, url: currentTabUrl });
    } else if (!isTracking && currentTabId === activeTab.id && !currentTabUrl) {
      currentTabUrl = new URL(activeTab.url).hostname;
      console.log('Re-fetched URL for existing tab:', { currentTabId, url: currentTabUrl });
    }

    if (!isTracking) {
      isTracking = true;
      tabStartTime = Date.now();
      lastUpdateTime = null;
      console.log('Tracking status: Started');
      console.log('Started tracking for tab:', { currentTabId, url: currentTabUrl });
      startActiveTabTimer();
    }
  });
}

function stopTracking() {
  if (isTracking && tabStartTime && currentTabId !== null && currentTabUrl) {
    updateTabTime(currentTabUrl);
  }
  isTracking = false;
  tabStartTime = null;
  lastUpdateTime = null;
  currentTabUrl = null;
  clearInterval(activeTabTimer);
  activeTabTimer = null;
  saveData();
  console.log('Tracking status: Stopped');
}

function startActiveTabTimer() {
  if (activeTabTimer) {
    clearInterval(activeTabTimer);
    activeTabTimer = null;
  }
  activeTabTimer = setInterval(() => {
    if (isTracking && currentTabId !== null && tabStartTime !== null && currentTabUrl) {
      updateTabTime(currentTabUrl);
    }
  }, 1000);
}

function updateTabTime(url) {
  if (!isTracking || !tabStartTime || !url) {
    tabStartTime = isTracking ? Date.now() : null;
    return;
  }

  const currentTime = Date.now();
  const timeSpent = Math.floor((currentTime - tabStartTime) / 1000);
  if (timeSpent >= 1 && (!lastUpdateTime || currentTime - lastUpdateTime >= 1000)) {
    totalTime += timeSpent;
    console.log('Calculating time spent:', { currentTabId, url, timeSpent, totalTime });
    console.log('Tab switch update for:', url);

    let existing = tabUsage.find((entry) => entry.url === url);
    if (existing) {
      existing.timeSpent = (existing.timeSpent || 0) + timeSpent;
    } else {
      tabUsage.push({ url, timeSpent });
    }
    console.log('Updated tab usage:', { url, timeSpent, tabUsage });
    saveData();

    tabStartTime = currentTime;
    lastUpdateTime = currentTime;
  }
}

function saveData() {
  chrome.storage.local.set({ totalTime, tabUsage, lastSyncDate, offlineQueue }, () => {
    console.log('Saved data:', { totalTime, tabUsage, lastSyncDate, offlineQueue });
  });
}

chrome.windows.onFocusChanged.addListener(() => {
  console.log('Focus changed, checking...');
  checkFocus();
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (isTracking && tabStartTime && currentTabId !== null && currentTabUrl) {
    updateTabTime(currentTabUrl);
  }
  currentTabId = activeInfo.tabId;
  chrome.tabs.get(currentTabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url || tab.url.startsWith('chrome://')) {
      console.warn('Tab not found or invalid on activation:', chrome.runtime.lastError?.message || tab);
      stopTracking();
      return;
    }
    currentTabUrl = new URL(tab.url).hostname;
    tabStartTime = isTracking ? Date.now() : null;
    console.log('Tab activated:', { currentTabId, url: currentTabUrl });
    if (isTracking) startActiveTabTimer();
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isTracking && tabId === currentTabId && changeInfo.url) {
    if (tabStartTime && currentTabUrl) {
      updateTabTime(currentTabUrl);
    }
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      currentTabUrl = new URL(tab.url).hostname;
      tabStartTime = isTracking ? Date.now() : null;
      console.log('Tab updated:', { currentTabId, url: currentTabUrl });
      if (isTracking) startActiveTabTimer();
    } else {
      console.warn('Invalid tab URL on update:', tab.url);
      stopTracking();
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentTabId) {
    if (isTracking && tabStartTime && currentTabUrl) {
      updateTabTime(currentTabUrl);
    }
    stopTracking();
  }
});

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
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['jwt', 'totalTime', 'tabUsage', 'offlineQueue', 'lastSyncDate'], resolve);
    });
    let jwt = result.jwt || null;
    let syncTotalTime = result.totalTime || 0;
    let syncTabUsage = result.tabUsage || [];
    let offlineQueue = result.offlineQueue || [];
    let syncLastSyncDate = result.lastSyncDate || new Date().toISOString().split('T')[0];
    const currentDate = new Date().toISOString().split('T')[0];

    console.log('Sync data state:', { jwt, syncTotalTime, syncTabUsageLength: syncTabUsage.length, offlineQueueLength: offlineQueue.length, syncLastSyncDate });

    if (!jwt) {
      console.log('No JWT, queuing data');
      offlineQueue.push({ totalTime: syncTotalTime, tabs: syncTabUsage, date: currentDate });
      saveData();
      notifyUser('Please log in to sync data.');
      return;
    }

    if (currentDate !== syncLastSyncDate) {
      offlineQueue.push({ totalTime: syncTotalTime, tabs: syncTabUsage, date: syncLastSyncDate });
      syncTotalTime = 0;
      syncTabUsage = [];
      syncLastSyncDate = currentDate;
      saveData();
      console.log('Date changed, queued previous day and reset:', { syncTotalTime, syncTabUsage, syncLastSyncDate });
    }

    const dataToSync = [...offlineQueue, { totalTime: syncTotalTime, tabs: syncTabUsage, date: currentDate }].filter(
      (item) => item.date === currentDate
    );

    if (!navigator.onLine) {
      console.log('Offline, queuing data');
      offlineQueue.push({ totalTime: syncTotalTime, tabs: syncTabUsage, date: currentDate });
      saveData();
      notifyUser('Offline. Data will sync when online.');
      return;
    }

    for (const item of dataToSync) {
      const response = await fetch('http://localhost:5000/screen-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          userId: (jwt && jwtDecode(jwt)?.userId) || 'unknown',
          date: item.date,
          totalTime: item.totalTime,
          tabs: item.tabs,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          notifyUser('Session expired. Please log in again.');
          chrome.storage.local.remove('jwt');
          offlineQueue.push(item);
          saveData();
          console.log('JWT expired, queued data:', { item });
          return;
        }
        throw new Error(`Sync failed: ${response.status}`);
      }

      console.log('Sync successful:', await response.json());
    }

    offlineQueue = offlineQueue.filter((item) => item.date !== currentDate);
    saveData();
  } catch (error) {
    console.error('Sync error:', error.message);
    if (error.message.includes('No SW')) {
      console.warn('Service worker unavailable, retrying sync on next alarm');
      notifyUser('Service worker issue. Data will sync later.');
    } else {
      offlineQueue.push({ totalTime, tabs: tabUsage, date: new Date().toISOString().split('T')[0] });
      saveData();
      notifyUser('Failed to sync data. Will retry later.');
    }
  }
}

function notifyUser(message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'ChillBoard Extension',
      message,
      priority: 2,
    });
  } catch (error) {
    console.warn('Notification failed:', error.message);
  }
}

self.addEventListener('online', () => {
  console.log('Back online, syncing...');
  syncData();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'openWebApp') {
      chrome.tabs.create({ url: 'http://localhost:3000' }, () => {
        if (chrome.runtime.lastError) {
          console.warn('Failed to open web app:', chrome.runtime.lastError.message);
        }
      });
    } else if (message.action === 'syncData') {
      syncData();
    }
    sendResponse({ status: 'success' });
  } catch (error) {
    console.warn('Message handling error:', error.message);
    sendResponse({ status: 'error', message: error.message });
  }
});

// Helper function to decode JWT
function jwtDecode(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('JWT decode error:', e);
    return null;
  }
}