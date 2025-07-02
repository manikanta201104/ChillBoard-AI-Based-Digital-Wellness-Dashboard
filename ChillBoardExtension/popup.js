document.addEventListener('DOMContentLoaded', () => {
  const loginContainer = document.getElementById('login-container');
  const statsContainer = document.getElementById('stats-container');
  const loginError = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const openWebAppBtn = document.getElementById('open-webapp-btn');
  const totalTimeSpan = document.getElementById('total-time');
  const tabCountSpan = document.getElementById('tab-count');
  const tabUsageList = document.getElementById('tab-usage');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  function updateStats() {
    chrome.storage.local.get(['totalTime', 'tabUsage'], (result) => {
      const totalTime = result.totalTime || 0;
      const tabUsage = result.tabUsage || [];
      const minutes = Math.floor(totalTime / 60);
      const hours = Math.floor(minutes / 60);
      const displayTime = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

      totalTimeSpan.textContent = displayTime;
      tabCountSpan.textContent = tabUsage.length;

      tabUsageList.innerHTML = '';
      tabUsage.forEach((entry) => {
        const li = document.createElement('li');
        const entryMinutes = Math.floor(entry.timeSpent / 60);
        const entrySeconds = entry.timeSpent % 60;
        li.textContent = `${entry.url}: ${entryMinutes}m ${entrySeconds}s`;
        tabUsageList.appendChild(li);
      });
      console.log('Updated stats:', { totalTime, tabUsageLength: tabUsage.length });
    });
  }

  chrome.storage.local.get(['jwt', 'totalTime', 'tabUsage'], (result) => {
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
        console.log('Login successful, checking storage state');
        chrome.storage.local.get(['totalTime', 'tabUsage', 'lastSyncDate'], (result) => {
          console.log('Storage state after login:', result);
          showStats();
        });
      });
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove('jwt', () => {
      console.log('Logged out, checking storage state');
      chrome.storage.local.get(['totalTime', 'tabUsage', 'lastSyncDate'], (result) => {
        console.log('Storage state after logout:', result);
        showLogin();
      });
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
    updateStats();
    setInterval(updateStats, 1000);
    chrome.storage.local.get(['totalTime', 'tabUsage', 'lastSyncDate'], (result) => {
      console.log('showStats storage state:', result);
    });
  }
});