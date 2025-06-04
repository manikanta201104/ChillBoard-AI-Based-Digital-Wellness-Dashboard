// File: ChillBoardExtension/background.js
let isTracking = false;
let totalTime = 0;

function checkFocus() {
  chrome.windows.getAll({ windowTypes: ['normal'] }, windows => {
    isTracking = windows.some(window => window.focused);
    if (!isTracking) {
      chrome.storage.local.set({ totalTime });
    }
  });
}

chrome.windows.onFocusChanged.addListener(windowId => {
  checkFocus();
});

setInterval(() => {
  if (isTracking) {
    totalTime += 1;
    chrome.storage.local.set({ totalTime });
    console.log('Total time:', totalTime);
  }
}, 1000);

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['totalTime'], result => {
    totalTime = result.totalTime || 0;
    checkFocus();
  });
});