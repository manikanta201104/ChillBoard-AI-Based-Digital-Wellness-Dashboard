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
          existing.time += timeSpent;
        } else {
          tabUsage.push({ url, time: timeSpent });
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
