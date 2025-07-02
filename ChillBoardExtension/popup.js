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

  let isLoading = false;

  async function fetchScreenTime(jwt, date, retries = 3) {
    if (isLoading) return false;
    isLoading = true;
    totalTimeSpan.textContent = 'Loading stats...';
    tabCountSpan.textContent = '';
    tabUsageList.innerHTML = '';

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch('http://localhost:5000/screen-time', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${jwt}` },
        });
        if (!response.ok) {
          if (response.status === 401 && attempt === 1) {
            console.log('JWT expired, attempting to refresh');
            const newJwt = await refreshJwt();
            if (newJwt) {
              return await fetchScreenTime(newJwt, date, retries);
            }
            throw new Error('JWT refresh failed');
          }
          throw new Error(`Fetch screen time failed: ${response.status}`);
        }
        const screenTimeData = await response.json();
        const todayData = screenTimeData.find((entry) => entry.date === date);
        if (todayData) {
          chrome.storage.local.set({ totalTime: todayData.totalTime, tabUsage: todayData.tabs }, () => {
            console.log('Updated local storage from server:', { totalTime: todayData.totalTime, tabUsage: todayData.tabs });
            updateStats();
          });
        } else {
          console.log('No server data for today, using local data');
          updateStats();
        }
        isLoading = false;
        return true;
      } catch (error) {
        console.error(`Fetch screen time attempt ${attempt} failed:`, error.message);
        if (attempt === retries) {
          loginError.textContent = 'Failed to fetch screen time data. Showing local data.';
          isLoading = false;
          updateStats();
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async function refreshJwt() {
    try {
      const result = await new Promise((resolve) => chrome.storage.local.get(['refreshToken'], resolve));
      const refreshToken = result.refreshToken;
      if (!refreshToken) throw new Error('No refresh token available');
      
      const response = await fetch('http://localhost:5000/screen-time/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) throw new Error(`Refresh token failed: ${response.status}`);
      
      const data = await response.json();
      chrome.storage.local.set({ jwt: data.token }, () => {
        console.log('JWT refreshed successfully');
      });
      return data.token;
    } catch (error) {
      console.error('Error refreshing JWT:', error.message);
      loginError.textContent = 'Session expired. Please log in again.';
      chrome.storage.local.remove('jwt');
      showLogin();
      return null;
    }
  }

  async function updateStats() {
    try {
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getCurrentStats' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error getting stats from background:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(response);
          }
        });
      });

      let totalTime, tabUsage;
      if (result && result.status === 'success') {
        totalTime = result.totalTime || 0;
        tabUsage = result.tabUsage || [];
      } else {
        // Fallback to local storage
        const localResult = await new Promise((resolve) => chrome.storage.local.get(['totalTime', 'tabUsage'], resolve));
        totalTime = localResult.totalTime || 0;
        tabUsage = localResult.tabUsage || [];
      }

      const minutes = Math.floor(totalTime / 60);
      const hours = Math.floor(minutes / 60);
      const displayTime = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

      totalTimeSpan.textContent = isLoading ? 'Loading stats...' : displayTime;
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
      statsContainer.style.display = 'block';
      loginContainer.style.display = 'none';
    } catch (error) {
      console.error('Error updating stats:', error.message);
      loginError.textContent = 'Error loading stats. Try again.';
      statsContainer.style.display = 'none';
      loginContainer.style.display = 'block';
    }
  }

  function renderFallback() {
    loginError.textContent = 'Unable to load data. Please try again.';
    statsContainer.style.display = 'none';
    loginContainer.style.display = 'block';
    console.log('Rendered fallback login screen due to initialization failure');
  }

  chrome.storage.local.get(['jwt', 'totalTime', 'tabUsage'], async (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error accessing chrome.storage.local:', chrome.runtime.lastError);
      renderFallback();
      return;
    }
    if (result.jwt) {
      const success = await fetchScreenTime(result.jwt, new Date().toISOString().split('T')[0]);
      if (!success) {
        updateStats();
      }
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

      chrome.storage.local.set({ jwt: data.token, refreshToken: data.refreshToken || '' }, async () => {
        console.log('Login successful, checking storage state');
        await fetchScreenTime(data.token, new Date().toISOString().split('T')[0]);
        chrome.storage.local.get(['totalTime', 'tabUsage', 'lastSyncDate'], (result) => {
          console.log('Storage state after login:', result);
        });
      });
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['jwt', 'refreshToken'], () => {
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
    console.log('Showing login screen');
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