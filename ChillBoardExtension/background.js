
let isTracking = false;
let totalTime = 0;
let currentTabId = null;
let tabStartTime = null;
let tabUsage = [];

console.log('Service worker started');

function initializeStorage() {
  chrome.storage.local.get(['totalTime', 'tabUsage'], result => {
    totalTime = result.totalTime || 0;
    tabUsage = result.tabUsage || [];
    console.log('Initialized storage:', { totalTime, tabUsage });

    // Set initial active tab
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs.length > 0 && tabs[0].id && tabs[0].url) {
        currentTabId = tabs[0].id;
        console.log('Set initial active tab:', { currentTabId, url: tabs[0].url });
        if (isTracking) {
          tabStartTime = Date.now();
        }
      } else {
        console.log('No active tab found on startup');
      }
      checkFocus(); // Ensure isTracking is set after setting currentTabId
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
  chrome.windows.getAll({ windowTypes: ['normal'] }, windows => {
    isTracking = windows.some(window => window.focused);
    console.log('Tracking status:', isTracking ? 'Started' : 'Stopped');
    if (!isTracking) {
      updateTabTime();
      chrome.storage.local.set({ totalTime, tabUsage }, () => {
        console.log('Saved data on focus loss:', { totalTime, tabUsage });
      });
    } else if (currentTabId !== null && tabStartTime === null) {
      // Start tracking if a tab is active and tracking just started
      tabStartTime = Date.now();
      console.log('Started tracking for tab:', { currentTabId, tabStartTime });
    }
  });
}

function updateTabTime() {
  if (currentTabId !== null && tabStartTime) {
    const timeSpent = Math.floor((Date.now() - tabStartTime) / 1000);
    console.log('Calculating time spent:', { currentTabId, timeSpent });

    chrome.tabs.get(currentTabId, tab => {
      if (chrome.runtime.lastError || !tab || !tab.url) {
        console.warn('Tab not found or invalid:', chrome.runtime.lastError?.message || tab);
        return;
      }

      // Skip URLs that Chrome doesn't allow access to (e.g., chrome://, about://)
      if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
        console.warn('Skipping non-HTTP tab URL:', tab.url);
        return;
      }

      try {
        const url = new URL(tab.url).hostname;
        let existing = tabUsage.find(entry => entry.url === url);
        if (existing) {
          existing.timeSpent = (existing.timeSpent || 0) + timeSpent;
        } else {
          existing = { url, timeSpent };
          tabUsage.push(existing);
        }

        chrome.storage.local.set({ totalTime, tabUsage }, () => {
          console.log('Updated tab time:', { url, timeSpent, tabUsage });
        });
      } catch (error) {
        console.warn('Invalid tab URL:', tab.url, error.message);
      }
    });
  } else {
    console.log('No valid tab/time to update:', { currentTabId, tabStartTime });
  }

  tabStartTime = isTracking ? Date.now() : null;
}

chrome.windows.onFocusChanged.addListener(checkFocus);

chrome.tabs.onActivated.addListener(activeInfo => {
  if (isTracking) {
    updateTabTime();
    currentTabId = activeInfo.tabId;
    tabStartTime = Date.now();
    console.log('Tab activated:', { currentTabId, tabStartTime });
  } else {
    console.log('Tab activated but not tracking:', { tabId: activeInfo.tabId });
    currentTabId = activeInfo.tabId; // Still set the currentTabId for when tracking starts
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

chrome.tabs.onRemoved.addListener(tabId => {
  if (tabId === currentTabId) {
    updateTabTime();
    currentTabId = null;
    tabStartTime = null;
    chrome.storage.local.set({ totalTime, tabUsage }, () => {
      console.log('Tab closed, saved data:', { totalTime, tabUsage });
    });
  }
});

setInterval(() => {
  if (isTracking) {
    totalTime += 1;
    updateTabTime();
    console.log(`Tracking - Total time: ${totalTime}s, Tab usage:`, tabUsage);
  }
}, 1000);

// Sync data periodically
const SYNC_INTERVAL_MINUTES = 5;
chrome.alarms.create('syncData', { periodInMinutes: SYNC_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener(alarm => {
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

// ... (Previous code remains unchanged until the syncData function)

async function syncData() {
  console.log('Starting data sync');
  chrome.storage.local.get(['jwt', 'totalTime', 'tabUsage', 'offlineQueue'], async result => {
    let jwt = result.jwt;
    const totalTime = result.totalTime || 0;
    let tabs = result.tabUsage || [];
    const queue = result.offlineQueue || [];

    // Distribute unaccounted time
    const totalTabTime = tabs.reduce((sum, tab) => sum + (tab.timeSpent || 0), 0);
    const unaccountedTime = totalTime - totalTabTime;
    if (unaccountedTime > 0 && tabs.length > 0) {
      tabs[tabs.length - 1].timeSpent += unaccountedTime;
      console.log(`Distributed ${unaccountedTime}s to last tab:`, tabs[tabs.length - 1]);
    }

    const dataToSync = [...queue, { totalTime, tabs }];

    if (!jwt) {
      console.log('No JWT found, saving to queue');
      queue.push({ totalTime, tabs });
      chrome.storage.local.set({ offlineQueue: queue });
      notifyUser('Authentication required. Please log in via the web app.');
      return;
    }

    if (!navigator.onLine) {
      console.log('Offline: saving to queue');
      queue.push({ totalTime, tabs });
      chrome.storage.local.set({ offlineQueue: queue });
      return;
    }

    try {
      // Attempt to refresh the token before syncing
      jwt = await refreshToken(jwt);
      if (!jwt) {
        console.log('Token refresh failed, saving to queue');
        queue.push({ totalTime, tabs });
        chrome.storage.local.set({ offlineQueue: queue });
        notifyUser('Session expired. Please log in again.');
        return;
      }

      for (const item of dataToSync) {
        const res = await fetch('http://localhost:5000/screen-time', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify(item)
        });

        if (!res.ok) {
          const error = await res.json();
          if (error.message === 'Invalid or expired token') {
            console.log('Invalid token detected, attempting refresh');
            jwt = await refreshToken(jwt);
            if (!jwt) {
              throw new Error('Token refresh failed');
            }
            // Retry the request with the new token
            const retryRes = await fetch('http://localhost:5000/screen-time', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`
              },
              body: JSON.stringify(item)
            });
            if (!retryRes.ok) {
              throw new Error(`Retry failed: ${await retryRes.text()}`);
            }
          } else {
            throw new Error(`Sync failed: ${JSON.stringify(error)}`);
          }
        }
      }

      console.log('✅ Data synced');
      // Only clear storage after successful sync
      chrome.storage.local.set({ totalTime: 0, tabUsage: [], offlineQueue: [] });

    } catch (err) {
      console.error('Sync failed:', err.message);
      chrome.storage.local.set({ offlineQueue: dataToSync });
      notifyUser('Failed to sync data. Data will be synced when connection is restored.');
    }
  });
}

// Helper function to refresh the JWT (adjust endpoint as needed)
async function refreshToken(currentJwt) {
  try {
    const res = await fetch('http://localhost:5000/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentJwt}`
      }
    });

    if (!res.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await res.json();
    const newJwt = data.token;
    if (newJwt) {
      chrome.storage.local.set({ jwt: newJwt });
      console.log('Token refreshed successfully');
      return newJwt;
    } else {
      throw new Error('No token returned from refresh endpoint');
    }
  } catch (err) {
    console.error('Token refresh error:', err.message);
    return null;
  }
}

// Helper function to notify the user
function notifyUser(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png', // Ensure you have an icon.png in your extension
    title: 'Screen Time Extension',
    message: message,
    priority: 2
  });
}

self.addEventListener('online', () => {
  console.log('Back online, syncing...');
  syncData();
});

