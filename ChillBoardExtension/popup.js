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
  const loadingMessage = document.getElementById('loading-message');

  let isLoading = false;
  let statsUpdateInterval = null;
  let isPopupClosing = false;

  function safeJwtDecode(token) {
    try {
      const [header, payload, signature] = token.split('.');
      if (!signature) throw new Error('Invalid token');
      const jsonPayload = decodeURIComponent(atob(payload.replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('JWT decode error:', error);
      return null;
    }
  }

  initializePopup();

  function initializePopup() {
    loadingMessage.textContent = 'Loading...';
    getStorageData(['jwt', 'refreshToken']).then(result => {
      if (result.jwt) {
        const decoded = safeJwtDecode(result.jwt);
        if (!decoded || decoded.exp * 1000 < Date.now()) {
          console.log('JWT expired, refreshing');
          refreshJwt().then(newJwt => {
            if (newJwt) showStats();
            else showLogin();
          });
          return;
        }
        showStats();
        const currentDate = new Date().toISOString().split('T')[0];
        fetchScreenTimeWithRetry(result.jwt, currentDate);
      } else {
        showLogin();
      }
    }).catch(error => {
      console.error('Init error:', error);
      showLogin();
      loginError.textContent = 'Error loading. Try again.';
    }).finally(() => loadingMessage.textContent = '');
  }

  function fetchScreenTimeWithRetry(jwt, date, maxRetries = 3) {
    let attempt = 1;
    const fetchFn = async () => {
      if (attempt > maxRetries) return false;
      try {
        const success = await fetchScreenTime(jwt, date);
        if (success) return true;
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        return await fetchFn();
      } catch (error) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        return await fetchFn();
      }
    };
    return fetchFn();
  }

  async function fetchScreenTime(jwt, date) {
    isLoading = true;
    totalTimeSpan.textContent = 'Loading...';
    tabCountSpan.textContent = '';
    tabUsageList.innerHTML = '';
    try {
      const response = await fetch('https://chillboard-6uoj.onrender.com/screen-time', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${jwt}` },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        if (response.status === 401) {
          const newJwt = await refreshJwt();
          if (newJwt) return await fetchScreenTime(newJwt, date);
          throw new Error('Authentication failed');
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const screenTimeData = await response.json();
      const todayData = screenTimeData.find(entry => entry.date === date);
      if (todayData) {
        const combinedTabUsage = combineTabUsageByUrl(todayData.tabs);
        await setStorageData({ 
          totalTime: todayData.totalTime, 
          tabUsage: combinedTabUsage,
          lastSyncedTotalTime: todayData.totalTime,
          lastSyncedTabUsage: combinedTabUsage
        });
      }
      isLoading = false;
      updateStatsDisplay();
      return true;
    } catch (error) {
      console.error('Fetch screen time failed:', error);
      isLoading = false;
      updateStatsDisplay(); // Fallback to local
      loginError.textContent = 'Server connection failed. Showing offline data.';
      setTimeout(() => loginError.textContent = '', 3000);
      return false;
    }
  }

  async function refreshJwt() {
    try {
      const result = await getStorageData(['refreshToken']);
      const refreshToken = result.refreshToken;
      if (!refreshToken) throw new Error('No refresh token available');
      const response = await fetch('https://chillboard-6uoj.onrender.com/screen-time/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      await setStorageData({ jwt: data.token, refreshToken: data.refreshToken || null });
      return data.token;
    } catch (error) {
      console.error('Refresh JWT error:', error);
      loginError.textContent = 'Session expired. Please log in again.';
      await clearStorageData(['jwt', 'refreshToken']);
      return null;
    }
  }

  function combineTabUsageByUrl(tabUsageArray) {
    const urlMap = new Map();
    tabUsageArray.forEach(tab => {
      if (urlMap.has(tab.url)) {
        const existing = urlMap.get(tab.url);
        existing.timeSpent += tab.timeSpent;
      } else {
        urlMap.set(tab.url, { tabId: tab.tabId, url: tab.url, timeSpent: tab.timeSpent });
      }
    });
    return Array.from(urlMap.values());
  }

  async function updateStatsDisplay() {
    try {
      const response = await sendMessageToBackgroundWithRetry({ action: 'getCurrentStats' }, 3, 1000);
      let totalTime = 0, tabUsage = [];
      if (response && response.status === 'success') {
        totalTime = response.totalTime || 0;
        tabUsage = response.tabUsage || [];
      } else {
        const localData = await getStorageData(['totalTime', 'tabUsage']);
        totalTime = localData.totalTime || 0;
        tabUsage = localData.tabUsage || [];
      }

      tabUsage = combineTabUsageByUrl(tabUsage);

      totalTimeSpan.textContent = formatTime(totalTime);
      tabCountSpan.textContent = tabUsage.length.toString();

      tabUsageList.innerHTML = '';
      const sortedTabs = [...tabUsage].sort((a, b) => b.timeSpent - a.timeSpent);
      sortedTabs.forEach(entry => {
        if (!entry.url || entry.timeSpent <= 0) return;
        const li = document.createElement('li');
        li.className = 'tab-entry';
        const urlSpan = document.createElement('span');
        urlSpan.className = 'tab-url';
        urlSpan.textContent = entry.url;
        urlSpan.title = entry.url;
        const timeSpan = document.createElement('span');
        timeSpan.className = 'tab-time';
        timeSpan.textContent = formatTime(entry.timeSpent);
        li.appendChild(urlSpan);
        li.appendChild(timeSpan);
        tabUsageList.appendChild(li);
      });
    } catch (error) {
      console.error('Update stats error:', error);
      totalTimeSpan.textContent = 'Error';
      tabCountSpan.textContent = '0';
    }
  }

  function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0s';
    const totalSeconds = Math.floor(seconds);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    if (minutes < 60) return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  async function handleLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
      loginError.textContent = 'Please enter email and password';
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    loginError.textContent = '';

    try {
      const response = await fetch('https://chillboard-6uoj.onrender.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(20000)
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Login failed');

      const decoded = safeJwtDecode(data.token);
      if (!decoded) throw new Error('Invalid token');

      await setStorageData({ jwt: data.token, refreshToken: data.refreshToken || null });
      showStats();
      const currentDate = new Date().toISOString().split('T')[0];
      fetchScreenTimeWithRetry(data.token, currentDate);
    } catch (error) {
      console.error('Login error:', error.message);
      loginError.textContent = error.message || 'Login failed. Try again.';
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  }

  async function handleLogout() {
    try {
      await clearStorageData(['jwt', 'refreshToken']);
      showLogin();
    } catch (error) {
      console.error('Logout error:', error);
      loginError.textContent = 'Error during logout. Try again.';
    }
  }

  function handleOpenWebApp() {
    chrome.runtime.sendMessage({ action: 'openWebApp' });
  }

  function showLogin() {
    loginContainer.style.display = 'block';
    statsContainer.style.display = 'none';
    emailInput.value = '';
    passwordInput.value = '';
    loginError.textContent = '';
    if (statsUpdateInterval) {
      clearInterval(statsUpdateInterval);
      statsUpdateInterval = null;
    }
  }

  function showStats() {
    loginContainer.style.display = 'none';
    statsContainer.style.display = 'block';
    updateStatsDisplay();
    if (statsUpdateInterval) clearInterval(statsUpdateInterval);
    statsUpdateInterval = setInterval(updateStatsDisplay, 5000);
  }

  window.addEventListener('beforeunload', () => { isPopupClosing = true; if (statsUpdateInterval) clearInterval(statsUpdateInterval); });

  function getStorageData(keys) {
    return new Promise(resolve => chrome.storage.local.get(keys, result => resolve(result || {})));
  }

  function setStorageData(data) {
    return new Promise(resolve => chrome.storage.local.set(data, resolve));
  }

  function clearStorageData(keys) {
    return new Promise(resolve => chrome.storage.local.remove(keys, resolve));
  }

  async function sendMessageToBackgroundWithRetry(message, maxRetries = 5, retryDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Timeout')), 20000);
          chrome.runtime.sendMessage(message, (response) => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(response);
          });
        });
        if (response !== null && response !== undefined) return response;
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      } catch (error) {
        console.error(`Attempt ${attempt} - Message send error:`, error.message);
        if (attempt === maxRetries) return null;
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
    return null;
  }

  loginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  openWebAppBtn.addEventListener('click', handleOpenWebApp);
  emailInput.addEventListener('keypress', e => e.key === 'Enter' && passwordInput.focus());
  passwordInput.addEventListener('keypress', e => e.key === 'Enter' && handleLogin());
});