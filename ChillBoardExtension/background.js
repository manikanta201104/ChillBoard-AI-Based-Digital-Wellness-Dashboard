let isTracking = false;
let totalTime = 0;
let currentTabId = null;
let tabStartTime = null;
let tabUsage = [];

// Initialize values when extension is installed or reloaded
function initializeStorage() {
  chrome.storage.local.get(['totalTime', 'tabUsage'], result => {
    totalTime = result.totalTime || 0;
    tabUsage = result.tabUsage || [];
    checkFocus(); // Only start tracking after initialization
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('ChillBoard Extension installed');
  initializeStorage();
});

chrome.runtime.onStartup.addListener(() => {
  initializeStorage();
});

// Checks if any window is currently focused
function checkFocus() {
  chrome.windows.getAll({ windowTypes: ['normal'] }, windows => {
    isTracking = windows.some(window => window.focused);
    if (!isTracking) {
      updateTabTime();
      chrome.storage.local.set({ totalTime, tabUsage });
    }
  });
}

// Updates the time spent on the current tab
function updateTabTime() {
  if (currentTabId && tabStartTime) {
    const timeSpent = Math.floor((Date.now() - tabStartTime) / 1000);

    chrome.tabs.get(currentTabId, tab => {
      if (chrome.runtime.lastError || !tab.url) return;

      try {
        const url = new URL(tab.url).hostname;
        const existing = tabUsage.find(entry => entry.url === url);

        if (existing) {
          existing.timeSpent = (existing.timeSpent || existing.time) + timeSpent;
          delete existing.time; // Clean up old property name
        } else {
          tabUsage.push({ url, timeSpent });
        }

        chrome.storage.local.set({ totalTime, tabUsage });
      } catch (error) {
        console.warn('Invalid URL:', tab.url);
      }
    });
  }

  tabStartTime = isTracking ? Date.now() : null;
}

// Event: window focus changes
chrome.windows.onFocusChanged.addListener(() => {
  checkFocus();
});

// Event: tab switch
chrome.tabs.onActivated.addListener(activeInfo => {
  if (isTracking) {
    updateTabTime();
    currentTabId = activeInfo.tabId;
    tabStartTime = Date.now();
  }
});

// Event: tab URL update
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isTracking && tabId === currentTabId && changeInfo.url) {
    updateTabTime();
    currentTabId = tabId;
    tabStartTime = Date.now();
  }
});

// Event: tab closed
chrome.tabs.onRemoved.addListener(tabId => {
  if (tabId === currentTabId) {
    updateTabTime();
    currentTabId = null;
    tabStartTime = null;
    chrome.storage.local.set({ totalTime, tabUsage });
  }
});

// Track time every second
setInterval(() => {
  if (isTracking) {
    totalTime += 1;
    updateTabTime();
    console.log(`Total time: ${totalTime}s, Tab usage:`, tabUsage);
  }
}, 1000);

// Sync interval (5 minutes)
const SYNC_INTERVAL_MINUTES = 5;
chrome.alarms.create('syncData', { periodInMinutes: SYNC_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') {
    syncData();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openWebApp') {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  }
});

async function syncData() {
  chrome.storage.local.get(['jwt', 'totalTime', 'tabUsage'], async (result) => {
    const jwt = result.jwt;
    const totalTime = result.totalTime || 0;
    const tabs = result.tabUsage || [];

    if (!jwt) {
      console.log('Not logged in, skipping sync');
      return;
    }

    const data = { totalTime, tabs };

    if (!navigator.onLine) {
      console.log('Offline, caching data');
      chrome.storage.local.get(['offlineQueue'], (result) => {
        const queue = result.offlineQueue || [];
        queue.push(data);
        chrome.storage.local.set({ offlineQueue: queue });
      });
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/screen-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to sync data');

      console.log('Data synced successfully');
      chrome.storage.local.set({ totalTime: 0, tabUsage: [] });

      chrome.storage.local.get(['offlineQueue'], async (result) => {
        const queue = result.offlineQueue || [];
        if (queue.length > 0) {
          for (const queuedData of queue) {
            await fetch('http://localhost:5000/screen-time', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`,
              },
              body: JSON.stringify(queuedData),
            });
          }
          chrome.storage.local.set({ offlineQueue: [] });
          console.log('Offline queue synced');
        }
      });
    } catch (error) {
      console.error('Sync error:', error);
      chrome.storage.local.get(['offlineQueue'], (result) => {
        const queue = result.offlineQueue || [];
        queue.push(data);
        chrome.storage.local.set({ offlineQueue: queue });
      });
    }
  });
}

// ✅ Correct global listener for service worker (use `self` not `window`)
self.addEventListener('online', () => {
  console.log('Back online, attempting to sync');
  syncData();
});
