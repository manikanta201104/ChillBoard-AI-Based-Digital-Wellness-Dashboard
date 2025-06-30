let isTracking = false;
let totalTime = 0;
let tabTimers = {}; // Updated from currentTabId for multi-tab support
let tabUsage = [];
let lastSync = 0;
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const INACTIVITY_THRESHOLD_MS = 60 * 1000; // 60 seconds from Day 51

console.log(getTimestamp(), 'Service worker started');

function getTimestamp() {
  return `[${new Date().toLocaleTimeString('en-US', { hour12: false })}]`;
}

function initializeStorage() {
  chrome.storage.local.get(['totalTime', 'tabUsage', 'offlineQueue'], (result) => {
    totalTime = result.totalTime || 0;
    tabUsage = result.tabUsage || [];
    console.log(getTimestamp(), 'Initialized storage:', { totalTime, tabUsage });

    chrome.tabs.query({}, (tabs) => { // Query all tabs for multi-device init
      tabs.forEach(tab => {
        if (tab.id && tab.url) {
          tabTimers[tab.id] = { startTime: Date.now(), url: new URL(tab.url).hostname.replace('www.', '') };
        }
      });
      checkFocus();
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log(getTimestamp(), 'Extension installed');
  initializeStorage();
});

chrome.runtime.onStartup.addListener(() => {
  console.log(getTimestamp(), 'Extension startup');
  initializeStorage();
});

function checkFocus() {
  chrome.windows.getAll({ windowTypes: ['normal'] }, (windows) => {
    isTracking = windows.some((window) => window.focused);
    console.log(getTimestamp(), 'Tracking status:', isTracking ? 'Started' : 'Stopped');
    if (!isTracking) {
      updateTabTime();
      chrome.storage.local.set({ totalTime, tabUsage }, () => {
        console.log(getTimestamp(), 'Saved data on focus loss:', { totalTime, tabUsage });
      });
    } else {
      chrome.windows.getLastFocused((window) => {
        if (window && window.focused) {
          chrome.tabs.query({ active: true, windowId: window.id }, (tabs) => {
            if (tabs[0]?.id) {
              tabTimers[tabs[0].id] = tabTimers[tabs[0].id] || { startTime: Date.now(), url: new URL(tabs[0].url).hostname.replace('www.', '') };
            }
          });
        }
      });
    }
  });
}

function updateTabTime() {
  const now = Date.now();
  Object.keys(tabTimers).forEach(tabId => {
    const timer = tabTimers[tabId];
    if (timer.startTime) {
      const timeSpent = Math.floor((now - timer.startTime) / 1000);
      if (timeSpent < INACTIVITY_THRESHOLD_MS / 1000) {
        const url = timer.url;
        let existing = tabUsage.find(entry => entry.url === url);
        if (existing) {
          existing.timeSpent = (existing.timeSpent || 0) + timeSpent;
        } else {
          tabUsage.push({ url, timeSpent });
        }
        totalTime += timeSpent;
        console.log(getTimestamp(), 'Updated tab time:', { tabId, url, timeSpent, tabUsage });
      } else {
        console.log(getTimestamp(), 'Skipped inactive tab:', { tabId, url: timer.url, timeSpent });
      }
      timer.startTime = isTracking ? now : null;
    }
  });
  chrome.storage.local.set({ totalTime, tabUsage });
}

chrome.windows.onFocusChanged.addListener(checkFocus);

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (isTracking) {
    updateTabTime();
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      if (tab && tab.url) {
        tabTimers[activeInfo.tabId] = { startTime: Date.now(), url: new URL(tab.url).hostname.replace('www.', '') };
        console.log(getTimestamp(), 'Tab activated:', { tabId: activeInfo.tabId, url: tabTimers[activeInfo.tabId].url });
      }
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isTracking && tabId in tabTimers && changeInfo.url) {
    updateTabTime();
    tabTimers[tabId] = { startTime: Date.now(), url: new URL(changeInfo.url).hostname.replace('www.', '') };
    console.log(getTimestamp(), 'Tab updated:', { tabId, url: tabTimers[tabId].url });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId in tabTimers) {
    updateTabTime();
    delete tabTimers[tabId];
    chrome.storage.local.set({ totalTime, tabUsage }, () => {
      console.log(getTimestamp(), 'Tab closed, saved data:', { totalTime, tabUsage });
    });
  }
});

setInterval(() => {
  if (isTracking) {
    updateTabTime();
    console.log(getTimestamp(), `Tracking - Total time: ${totalTime}s, Tab usage:`, tabUsage);
  }
}, 1000);

const SYNC_INTERVAL_MINUTES = 5;
chrome.alarms.create('syncData', { periodInMinutes: SYNC_INTERVAL_MINUTES });

// Fallback sync interval (optional, uncomment if needed)
// setInterval(syncData, SYNC_INTERVAL_MS);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') {
    console.log(getTimestamp(), 'Sync alarm triggered');
    syncData();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openWebApp') {
    chrome.tabs.create({ url: 'http://localhost:3000' }, () => {
      console.log(getTimestamp(), 'Opened web app');
    });
  } else if (message.action === 'checkSyncStatus') {
    const status = lastSync ? `Last synced: ${new Date(lastSync).toLocaleTimeString()}` : 'Not synced yet';
    sendResponse({ status });
  }
});

async function syncData() {
  console.log(getTimestamp(), 'Starting data sync');
  chrome.storage.local.get(['jwt', 'totalTime', 'tabUsage', 'offlineQueue'], async (result) => {
    const jwt = result.jwt || null;
    const totalTime = result.totalTime || 0;
    let tabs = result.tabUsage || [];
    const queue = result.offlineQueue || [];

    if (!jwt) {
      console.log(getTimestamp(), 'No JWT found, saving to queue');
      queue.push({ totalTime, tabs });
      chrome.storage.local.set({ offlineQueue: queue });
      notifyUser('Authentication required. Please log in via the web app.');
      return;
    }

    const totalTabTime = tabs.reduce((sum, tab) => sum + (tab.timeSpent || 0), 0);
    const unaccountedTime = totalTime - totalTabTime;
    if (unaccountedTime > 0 && tabs.length > 0) {
      tabs[tabs.length - 1].timeSpent += unaccountedTime;
      console.log(getTimestamp(), `Distributed ${unaccountedTime}s to last tab:`, tabs[tabs.length - 1]);
    }

    const dataToSync = [...queue, { totalTime, tabs }];

    let isServerAvailable = false;
    try {
      const pingResponse = await fetch('http://localhost:5000/ping', { method: 'GET' });
      isServerAvailable = pingResponse.ok;
    } catch (err) {
      console.log(getTimestamp(), 'Server is not available:', err.message);
    }

    if (!navigator.onLine || !isServerAvailable) {
      console.log(getTimestamp(), 'Offline or server down: saving to queue');
      queue.push({ totalTime, tabs });
      chrome.storage.local.set({ offlineQueue: queue });
      notifyUser('Server is down or offline. Data will be synced later.');
      return;
    }

    try {
      for (const item of dataToSync) {
        console.log(getTimestamp(), 'Sending sync request:', item);
        const res = await fetch('http://localhost:5000/screen-time', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify(item),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error(getTimestamp(), 'Fetch failed:', res.status, text);
          if (res.status === 401) {
            notifyUser('Session expired. Please log in again.');
            chrome.runtime.sendMessage({ action: 'reauthenticate' });
            chrome.storage.local.remove('jwt');
            return;
          }
          throw new Error(`Sync failed: ${res.status} ${text}`);
        }

        const data = await res.json();
        console.log(getTimestamp(), 'Sync response:', data);
      }

      console.log(getTimestamp(), '✅ Data synced');
      lastSync = Date.now();
      chrome.storage.local.set({ totalTime: 0, tabUsage: [], offlineQueue: [] });
    } catch (err) {
      console.error(getTimestamp(), 'Sync failed:', err.message);
      chrome.storage.local.set({ offlineQueue: dataToSync });
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
  console.log(getTimestamp(), 'Back online, syncing...');
  syncData();
});