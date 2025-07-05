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
  const trackingStatusSpan = document.getElementById('tracking-status');
  const currentTabSpan = document.getElementById('current-tab');

  let isLoading = false;
  let statsUpdateInterval = null;
  let isPopupClosing = false;

  function jwtDecode(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  initializePopup();

  async function initializePopup() {
    try {
      const result = await getStorageData(['jwt', 'refreshToken']);
      
      if (result.jwt) {
        const decoded = jwtDecode(result.jwt);
        if (!decoded || decoded.exp * 1000 < Date.now()) {
          console.log('JWT expired, attempting refresh');
          const newJwt = await refreshJwt();
          if (!newJwt) {
            showLogin();
            return;
          }
        }
        
        await showStats();
        const currentDate = new Date().toISOString().split('T')[0];
        await fetchScreenTimeWithRetry(result.jwt, currentDate);
      } else {
        showLogin();
      }
    } catch (error) {
      console.error('Error initializing popup:', error);
      showLogin();
      if (loginError) {
        loginError.textContent = 'Error loading extension. Please try again.';
      }
    }
  }

  async function fetchScreenTimeWithRetry(jwt, date, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const success = await fetchScreenTime(jwt, date, 1);
        if (success) {
          await updateStatsDisplay();
          return true;
        }
      } catch (error) {
        console.error(`Fetch attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          console.log('Max retries reached, using local data');
          if (loginError) {
            loginError.textContent = 'Server connection failed. Showing offline data.';
            setTimeout(() => { if (loginError) loginError.textContent = ''; }, 3000);
          }
          await updateStatsDisplay();
          return false;
        }
        await sleep(1000 * attempt);
      }
    }
    return false;
  }

  async function fetchScreenTime(jwt, date, retries = 1) {
    if (isLoading || isPopupClosing) return false;
    
    isLoading = true;
    if (totalTimeSpan) totalTimeSpan.textContent = 'Loading...';
    if (tabCountSpan) tabCountSpan.textContent = '';
    if (tabUsageList) tabUsageList.innerHTML = '';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('http://localhost:5000/screen-time', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${jwt}` },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('JWT expired, attempting to refresh');
          const newJwt = await refreshJwt();
          if (newJwt) {
            isLoading = false;
            return await fetchScreenTime(newJwt, date, retries);
          }
          throw new Error('Authentication failed');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const screenTimeData = await response.json();
      const todayData = screenTimeData.find(entry => entry.date === date);
      
      if (todayData) {
        const combinedTabUsage = combineTabUsageByUrl(todayData.tabs.map(tab => ({
          tabId: tab.tabId || null,
          url: tab.url || 'unknown',
          timeSpent: tab.timeSpent || 0
        })));

        await setStorageData({ 
          totalTime: todayData.totalTime || 0, 
          tabUsage: combinedTabUsage,
          lastSyncedTotalTime: todayData.totalTime || 0,
          lastSyncedTabUsage: combinedTabUsage,
          lastServerSync: Date.now()
        });
      }
      
      isLoading = false;
      return true;
    } catch (error) {
      console.error('Fetch screen time failed:', error.message);
      isLoading = false;
      throw error;
    }
  }

  async function refreshJwt() {
    try {
      const result = await getStorageData(['jwt', 'refreshToken']);
      let refreshToken = result.refreshToken;

      if (!refreshToken) {
        const profileResponse = await fetch('http://localhost:5000/auth/profile', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${result.jwt}` },
          signal: AbortSignal.timeout(5000)
        });
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          refreshToken = profileData.spotifyToken?.refreshToken;
        }
      }

      if (!refreshToken) throw new Error('No refresh token available');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('http://localhost:5000/screen-time/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Refresh token failed: ${response.status}`);

      const data = await response.json();
      await setStorageData({ jwt: data.token, refreshToken: refreshToken });
      return data.token;
    } catch (error) {
      console.error('Error refreshing JWT:', error.message);
      if (loginError) loginError.textContent = 'Session expired. Please log in again.';
      await clearStorageData(['jwt', 'refreshToken']);
      showLogin();
      return null;
    }
  }

  function combineTabUsageByUrl(tabUsageArray) {
    if (!Array.isArray(tabUsageArray)) return [];
    const urlMap = new Map();
    tabUsageArray.forEach(tab => {
      if (!tab || !tab.url) return;
      const url = tab.url.toString();
      if (urlMap.has(url)) {
        urlMap.get(url).timeSpent += tab.timeSpent || 0;
      } else {
        urlMap.set(url, { tabId: tab.tabId, url, timeSpent: tab.timeSpent || 0 });
      }
    });
    return Array.from(urlMap.values());
  }

  async function updateStatsDisplay() {
    if (isPopupClosing) return;
    
    try {
      const syncResponse = await sendMessageToBackgroundWithRetry({ action: 'syncData' });
      if (!syncResponse) console.warn('Failed to sync data with background script');
      
      await sleep(300);
      
      const response = await sendMessageToBackgroundWithRetry({ action: 'getCurrentStats' });
      let totalTime = 0, tabUsage = [], trackingStatus = null;
      
      if (response && response.status === 'success') {
        totalTime = response.totalTime || 0;
        tabUsage = response.tabUsage || [];
        const statusResponse = await sendMessageToBackgroundWithRetry({ action: 'getTrackingStatus' });
        if (statusResponse && statusResponse.status === 'success') {
          trackingStatus = statusResponse;
        }
      } else {
        const localData = await getStorageData(['totalTime', 'tabUsage']);
        totalTime = localData.totalTime || 0;
        tabUsage = localData.tabUsage || [];
      }

      tabUsage = combineTabUsageByUrl(tabUsage);

      if (totalTimeSpan) totalTimeSpan.textContent = isLoading ? 'Loading...' : formatTime(totalTime);
      if (tabCountSpan) tabCountSpan.textContent = tabUsage.length.toString();
      if (trackingStatus && trackingStatusSpan) {
        trackingStatusSpan.textContent = trackingStatus.isTracking ? 'Active' : 'Inactive';
        trackingStatusSpan.className = trackingStatus.isTracking ? 'status-active' : 'status-inactive';
      }
      if (trackingStatus && currentTabSpan && trackingStatus.currentTabUrl) {
        currentTabSpan.textContent = trackingStatus.currentTabUrl;
      }

      if (tabUsageList) {
        tabUsageList.innerHTML = '';
        const sortedTabs = [...tabUsage].sort((a, b) => (b.timeSpent || 0) - (a.timeSpent || 0));
        sortedTabs.forEach(entry => {
          if (!entry || !entry.url || entry.timeSpent <= 0) return;
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
      }
    } catch (error) {
      console.error('Error updating stats display:', error);
      if (totalTimeSpan) totalTimeSpan.textContent = 'Error loading stats';
      if (loginError) {
        loginError.textContent = 'Error loading stats. Please refresh.';
        setTimeout(() => { if (loginError) loginError.textContent = ''; }, 3000);
      }
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
    const email = emailInput?.value?.trim();
    const password = passwordInput?.value?.trim();
    
    if (!email || !password) {
      if (loginError) loginError.textContent = 'Please enter email and password';
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';
    }
    if (loginError) loginError.textContent = '';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || `Login failed: ${response.status}`);

      const decoded = jwtDecode(data.token);
      if (!decoded) throw new Error('Invalid token received');

      await setStorageData({ jwt: data.token, refreshToken: data.refreshToken || null });
      await showStats();
      const currentDate = new Date().toISOString().split('T')[0];
      await fetchScreenTimeWithRetry(data.token, currentDate);
    } catch (error) {
      console.error('Login error:', error);
      if (loginError) {
        if (error.name === 'AbortError') loginError.textContent = 'Login request timed out. Please try again.';
        else loginError.textContent = error.message || 'Login failed. Please try again.';
      }
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
      }
    }
  }

  async function handleLogout() {
    try {
      await clearStorageData(['jwt', 'refreshToken', 'lastServerSync']);
      showLogin();
    } catch (error) {
      console.error('Logout error:', error);
      if (loginError) loginError.textContent = 'Error during logout. Please try again.';
    }
  }

  function handleOpenWebApp() {
    sendMessageToBackgroundWithRetry({ action: 'openWebApp' });
  }

  function showLogin() {
    if (loginContainer) loginContainer.style.display = 'block';
    if (statsContainer) statsContainer.style.display = 'none';
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (loginError) loginError.textContent = '';
    if (statsUpdateInterval) {
      clearInterval(statsUpdateInterval);
      statsUpdateInterval = null;
    }
  }

  async function showStats() {
    if (loginContainer) loginContainer.style.display = 'none';
    if (statsContainer) statsContainer.style.display = 'block';
    await updateStatsDisplay();
    if (statsUpdateInterval) clearInterval(statsUpdateInterval);
    statsUpdateInterval = setInterval(async () => {
      if (!isPopupClosing) await updateStatsDisplay();
    }, 3000);
  }

  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (openWebAppBtn) openWebAppBtn.addEventListener('click', handleOpenWebApp);
  if (emailInput) emailInput.addEventListener('keypress', e => e.key === 'Enter' && passwordInput?.focus());
  if (passwordInput) passwordInput.addEventListener('keypress', e => e.key === 'Enter' && handleLogin());
  window.addEventListener('beforeunload', () => { isPopupClosing = true; if (statsUpdateInterval) { clearInterval(statsUpdateInterval); statsUpdateInterval = null; } });

  function getStorageData(keys) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get(keys, result => {
          if (chrome.runtime.lastError) {
            console.error('Error getting storage data:', chrome.runtime.lastError.message);
            resolve({});
          } else resolve(result || {});
        });
      } catch (error) {
        console.error('Storage access error:', error);
        resolve({});
      }
    });
  }

  function setStorageData(data) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) console.error('Error setting storage data:', chrome.runtime.lastError.message);
          resolve();
        });
      } catch (error) {
        console.error('Storage set error:', error);
        resolve();
      }
    });
  }

  function clearStorageData(keys) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.remove(keys, () => {
          if (chrome.runtime.lastError) console.error('Error clearing storage data:', chrome.runtime.lastError.message);
          resolve();
        });
      } catch (error) {
        console.error('Storage clear error:', error);
        resolve();
      }
    });
  }

  async function sendMessageToBackgroundWithRetry(message, maxRetries = 3, retryDelay = 1000) {
    if (isPopupClosing) {
      console.warn('Popup is closing, aborting message send');
      return null;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Message send timed out')), 5000);
          chrome.runtime.sendMessage(message, response => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(response);
          });
        });
        if (response !== null && response !== undefined) return response;
        if (attempt < maxRetries) {
          console.log(`Retrying background message (attempt ${attempt + 1})...`);
          await sleep(retryDelay * attempt);
        }
      } catch (error) {
        console.error(`Attempt ${attempt} - Message send error:`, error);
        if (attempt === maxRetries) {
          console.error('Max retries reached for background message');
          return null;
        }
        await sleep(retryDelay * attempt);
      }
    }
    return null;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});