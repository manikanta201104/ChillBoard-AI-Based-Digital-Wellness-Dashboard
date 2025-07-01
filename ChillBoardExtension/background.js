let isTracking = false;
let totalTime = 0;
let currentTabId = null;
let tabStartTime = null;
let tabUsage = [];
let lastSyncDate = new Date().toISOString().split('T')[0]; // Track last synced day

console.log('Service worker started');

function initializeStorage() {
  chrome.storage.local.get(['totalTime', 'tabUsage', 'lastSyncDate'], (result) => {
    totalTime = result.totalTime || 0;
    tabUsage = result.tabUsage || [];
    lastSyncDate = result.lastSyncDate || new Date().toISOString().split('T')[0];
    console.log('Initialized storage:', { totalTime, tabUsage, lastSyncDate });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id && tabs[0].url) {
        currentTabId = tabs[0].id;
        console.log('Set initial active tab:', { currentTabId, url: tabs[0].url });
        if (isTracking) tabStartTime = Date.now();
      } else {
        console.log('No active tab found on startup');
      }
      checkFocus();
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
  chrome.windows.getAll({ windowTypes: ['normal'] }, (windows) => {
    isTracking = windows.some((window) => window.focused);
    console.log('Tracking status:', isTracking ? 'Started' : 'Stopped');
    if (!isTracking) {
      updateTabTime();
      chrome.storage.local.set({ totalTime, tabUsage, lastSyncDate }, () => {
        console.log('Saved data on focus loss:', { totalTime, tabUsage, lastSyncDate });
      });
    } else if (currentTabId !== null && tabStartTime === null) {
      tabStartTime = Date.now();
      console.log('Started tracking for tab:', { currentTabId, tabStartTime });
    }
  });
}

function updateTabTime() {
  if (currentTabId !== null && tabStartTime) {
    const timeSpent = Math.floor((Date.now() - tabStartTime) / 1000);
    console.log('Calculating time spent for tab:', { currentTabId, timeSpent, tabStartTime });

    chrome.tabs.get(currentTabId, (tab) => {
      if (chrome.runtime.lastError || !tab || !tab.url) {
        console.warn('Tab not found or invalid:', chrome.runtime.lastError?.message || tab);
        tabUsage.push({ url: 'unknown', timeSpent });
        return;
      }

      try {
        const url = new URL(tab.url).hostname;
        let existing = tabUsage.find((entry) => entry.url === url);
        if (existing) {
          existing.timeSpent = (existing.timeSpent || 0) + timeSpent;
        } else {
          existing = { url, timeSpent };
          tabUsage.push(existing);
        }
        console.log('Updated tab time:', { url, timeSpent, tabUsage });
        chrome.storage.local.set({ totalTime, tabUsage, lastSyncDate }, () => {
          console.log('Saved updated tab data:', { url, timeSpent, tabUsage });
        });
      } catch (error) {
        console.warn('Invalid tab URL:', tab.url, error.message);
        tabUsage.push({ url: 'invalid', timeSpent });
      }
    });

    // Only reset tabStartTime if still tracking
    tabStartTime = isTracking ? Date.now() : null;
  } else {
    console.log('No valid tab/time to update:', { currentTabId, tabStartTime });
  }
}

chrome.windows.onFocusChanged.addListener(checkFocus);

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (isTracking) {
    updateTabTime(); // Save time for the previous tab
    currentTabId = activeInfo.tabId;
    chrome.tabs.get(currentTabId, (tab) => {
      if (tab && tab.url) {
        try {
          const url = new URL(tab.url).hostname;
          console.log('Switched to tab:', { currentTabId, url, tabStartTime });
          tabStartTime = Date.now(); // Reset timer after confirming the new tab
        } catch (error) {
          console.warn('Invalid URL on activation:', tab.url, error.message);
          tabStartTime = null; // Reset if invalid
        }
      } else {
        console.warn('No tab data on activation:', tab);
        tabStartTime = null; // Reset if no data
      }
    });
  } else {
    console.log('Tab activated but not tracking:', { tabId: activeInfo.tabId });
    currentTabId = activeInfo.tabId;
    tabStartTime = null; // Reset if not tracking
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isTracking && tabId === currentTabId && changeInfo.url) {
    updateTabTime();
    currentTabId = tabId;
    tabStartTime = Date.now();
    console.log('Tab updated:', { currentTabId, url: changeInfo.url });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentTabId) {
    updateTabTime();
    currentTabId = null;
    tabStartTime = null;
    chrome.storage.local.set({ totalTime, tabUsage, lastSyncDate }, () => {
      console.log('Tab closed, saved data:', { totalTime, tabUsage, lastSyncDate });
    });
  }
});

setInterval(() => {
  const currentDate = new Date().toISOString().split('T')[0];
  if (isTracking) {
    totalTime += 1;
    updateTabTime();
    console.log(`Tracking - Total time: ${totalTime}s, Tab usage:`, tabUsage);
    if (currentDate !== lastSyncDate) {
      // Reset for new day
      totalTime = 0;
      tabUsage = [];
      lastSyncDate = currentDate;
      chrome.storage.local.set({ totalTime, tabUsage, lastSyncDate }, () => {
        console.log('Day changed, reset data:', { totalTime, tabUsage, lastSyncDate });
      });
    }
  }
}, 1000);

const SYNC_INTERVAL_MINUTES = 5;
chrome.alarms.create('syncData', { periodInMinutes: SYNC_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') {
    console.log('Sync alarm triggered');
    syncData();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openWebApp') {
    chrome.tabs.create({ url: 'http://localhost:3000' }, () => {
      console.log('Opened web app');
    });
  }
});

async function syncData() {
  console.log('Starting data sync');
  chrome.storage.local.get(['jwt', 'totalTime', 'tabUsage', 'offlineQueue', 'lastSyncDate'], async (result) => {
    const jwt = result.jwt || null;
    const totalTime = result.totalTime || 0;
    let tabs = result.tabUsage || [];
    const queue = result.offlineQueue || [];
    const lastSyncDate = result.lastSyncDate || new Date().toISOString().split('T')[0];
    const currentDate = new Date().toISOString().split('T')[0];

    if (!jwt) {
      console.log('No JWT found, saving to queue');
      queue.push({ totalTime, tabs, date: currentDate });
      chrome.storage.local.set({ offlineQueue: queue, lastSyncDate });
      notifyUser('Authentication required. Please log in via the web app.');
      return;
    }

    const totalTabTime = tabs.reduce((sum, tab) => sum + (tab.timeSpent || 0), 0);
    const unaccountedTime = totalTime - totalTabTime;
    if (unaccountedTime > 0 && tabs.length > 0) {
      // Distribute unaccounted time proportionally based on recorded times
      const totalRecordedTime = totalTabTime || 1; // Avoid division by zero
      tabs.forEach(tab => {
        if (tab.timeSpent) {
          const proportion = tab.timeSpent / totalRecordedTime;
          tab.timeSpent += Math.floor(unaccountedTime * proportion);
        }
      });
      console.log(`Distributed ${unaccountedTime}s proportionally:`, tabs);
    }

    const dataToSync = { totalTime, tabs, date: currentDate }; // Send only current day's data

    let isServerAvailable = false;
    try {
      const pingResponse = await fetch('http://localhost:5000/ping', { method: 'GET' });
      isServerAvailable = pingResponse.ok;
    } catch (err) {
      console.log('Server is not available:', err.message);
    }

    if (!navigator.onLine || !isServerAvailable) {
      console.log('Offline or server down: saving to queue');
      queue.push(dataToSync);
      chrome.storage.local.set({ offlineQueue: queue, lastSyncDate });
      notifyUser('Server is down or offline. Data will be synced later.');
      return;
    }

    try {
      console.log('Sending sync request:', dataToSync);
      const res = await fetch('http://localhost:5000/screen-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify(dataToSync),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Fetch failed:', res.status, text);
        if (res.status === 401) {
          notifyUser('Session expired. Please log in again.');
          chrome.storage.local.remove('jwt');
          return;
        }
        throw new Error(`Sync failed: ${res.status} ${text}`);
      }

      const data = await res.json();
      console.log('Sync response:', data);
      // Reset local data after successful sync
      chrome.storage.local.set({ totalTime: 0, tabUsage: [], lastSyncDate: currentDate });
    } catch (err) {
      console.error('Sync failed:', err.message);
      chrome.storage.local.set({ offlineQueue: [...queue, dataToSync], lastSyncDate });
      notifyUser('Failed to sync data. Data will be synced when connection is restored.');
    }
  });
}

function notifyUser(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon128.png',
    title: 'Screen Time Extension',
    message: message,
    priority: 2,
  });
}

self.addEventListener('online', () => {
  console.log('Back online, syncing...');
  syncData();
});