document.addEventListener('DOMContentLoaded', () => {
  const loginContainer = document.getElementById('login-container');
  const statsContainer = document.getElementById('stats-container');
  const loginError = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const openWebAppBtn = document.getElementById('open-webapp-btn');
  const totalTimeSpan = document.getElementById('total-time');
  const tabCountSpan = document.getElementById('tab-count');
  const deviceIdSpan = document.getElementById('device-id');
  const syncStatus = document.getElementById('sync-status');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  // Set device identifier
  deviceIdSpan.textContent = navigator.userAgent.substring(0, 20) + '...';

  chrome.storage.local.get(['jwt'], (result) => {
    if (result.jwt) {
      showStats();
    } else {
      showLogin();
    }
  });

  loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
      loginError.textContent = 'Please enter email and password';
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      chrome.storage.local.set({ jwt: data.token }, () => {
        showStats();
      });
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove('jwt', () => {
      showLogin();
    });
  });

  openWebAppBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openWebApp' });
  });

  function showLogin() {
    loginContainer.style.display = 'block';
    statsContainer.style.display = 'none';
    emailInput.value = '';
    passwordInput.value = '';
    loginError.textContent = '';
  }

  function showStats() {
    loginContainer.style.display = 'none';
    statsContainer.style.display = 'block';

    function updateStats() {
      chrome.storage.local.get(['totalTime', 'tabUsage'], (result) => {
        const totalTime = result.totalTime || 0;
        const tabUsage = result.tabUsage || [];
        const minutes = Math.floor(totalTime / 60);
        const hours = Math.floor(minutes / 60);
        const displayTime = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

        totalTimeSpan.textContent = displayTime;
        tabCountSpan.textContent = tabUsage.length;

        // Check sync status
        chrome.runtime.sendMessage({ action: 'checkSyncStatus' }, (response) => {
          syncStatus.textContent = response?.status || 'Syncing...';
        });
      });
    }

    updateStats(); // Initial update
    setInterval(updateStats, 10000); // Refresh every 10 seconds
  }
});

// Listen for sync status updates from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'syncStatus') {
    syncStatus.textContent = message.status;
    sendResponse({ received: true });
  }
});