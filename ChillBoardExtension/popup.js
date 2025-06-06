document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['totalTime', 'tabUsage'], result => {
    const totalTime = result.totalTime || 0;
    const tabUsage = result.tabUsage || [];
    const minutes = Math.floor(totalTime / 60);
    const hours = Math.floor(minutes / 60);
    const displayTime = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

    document.getElementById('screenTime').innerText = `Screen time: ${displayTime}`;
    document.getElementById('tabCount').innerText = `Tabs open: ${tabUsage.length}`;
  });

  document.getElementById('webAppButton').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });
});
