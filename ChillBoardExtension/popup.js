// popup.js (updated full file)

document.addEventListener('DOMContentLoaded', () => {
  // DOM references (may be null if not present in HTML)
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

  // These were missing in popup.html previously; create placeholders if absent
  let trackingStatusSpan = document.getElementById('tracking-status');
  let currentTabSpan = document.getElementById('current-tab');

  if (!trackingStatusSpan && statsContainer) {
    const p = document.createElement('p');
    p.innerHTML = 'Tracking: <span id="tracking-status">Inactive</span>';
    statsContainer.insertBefore(p, statsContainer.firstChild);
    trackingStatusSpan = document.getElementById('tracking-status');
  }
  if (!currentTabSpan && statsContainer) {
    const p = document.createElement('p');
    p.innerHTML = 'Current Tab: <span id="current-tab">—</span>';
    statsContainer.insertBefore(p, statsContainer.firstChild.nextSibling);
    currentTabSpan = document.getElementById('current-tab');
  }

  // runtime state
  let isLoading = false;
  let statsUpdateInterval = null;
  let isPopupClosing = false;

  // utils
  function jwtDecode(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Storage helpers (wrapped safely)
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

  // Keep a robust combine helper
  function combineTabUsageByUrl(tabUsageArray) {
    if (!Array.isArray(tabUsageArray)) return [];
    const urlMap = new Map();
    tabUsageArray.forEach(tab => {
      if (!tab || !tab.url) return;
      const url = String(tab.url);
      const time = Number(tab.timeSpent) || 0;
      if (urlMap.has(url)) {
        urlMap.get(url).timeSpent += time;
      } else {
        urlMap.set(url, { tabId: tab.tabId || null, url, timeSpent: time });
      }
    });
    return Array.from(urlMap.values());
  }

  // Keep message sending to background robust with retries and timeout
  async function sendMessageToBackgroundWithRetry(message, maxRetries = 5, retryDelay = 1000) {
    if (isPopupClosing) {
      console.warn('Popup is closing, aborting message send');
      return null;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Message send timed out')), 20000);
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
        console.error(`Attempt ${attempt} - Message send error:`, error.message);
        if (attempt === maxRetries) {
          console.error('Max retries reached for background message');
          return null;
        }
        await sleep(retryDelay * attempt);
      }
    }
    return null;
  }

  // Fetch screen time (with abort pattern and handling offline)
  async function fetchScreenTime(jwt, date, retries = 1) {
    if (!navigator.onLine) {
      console.warn('Offline, skipping remote fetch');
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch('https://chillboard-6uoj.onrender.com/screen-time', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${jwt}` },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 401) {
          // let caller attempt refresh
          throw new Error('401');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const screenTimeData = await response.json();
      const todayData = screenTimeData.find(entry => entry.date === date);

      if (todayData) {
        const combinedTabUsage = combineTabUsageByUrl(
          (todayData.tabs || []).map(tab => ({
            tabId: tab.tabId || null,
            url: tab.url || 'unknown',
            timeSpent: tab.timeSpent || 0
          }))
        );

        await setStorageData({
          totalTime: todayData.totalTime || 0,
          tabUsage: combinedTabUsage,
          lastSyncedTotalTime: todayData.totalTime || 0,
          lastSyncedTabUsage: combinedTabUsage
        });
      }
      return true;
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.warn('Fetch screen time aborted/timed out');
      }
      // bubble up the error to the caller to handle retry/refresh logic
      throw error;
    }
  }

  // Wrapper with retries and refresh handling
  async function fetchScreenTimeWithRetry(jwt, date, maxRetries = 3) {
    if (!navigator.onLine) {
      if (loginError) {
        loginError.textContent = 'Offline mode: Using cached data.';
        setTimeout(() => { if (loginError) loginError.textContent = ''; }, 3000);
      }
      await updateStatsDisplay(); // use local data
      return false;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const success = await fetchScreenTime(jwt, date, attempt);
        if (success) {
          await updateStatsDisplay();
          return true;
        }
      } catch (error) {
        // If it's 401, try to refresh once
        if (error.message === '401' && attempt === 1) {
          const newJwt = await refreshJwt();
          if (newJwt) {
            jwt = newJwt;
            continue; // try again with refreshed token
          } else {
            // refresh failed: break and fall back to local
            break;
          }
        }
        console.error(`Fetch attempt ${attempt} failed:`, error.message || error);
        if (attempt === maxRetries) {
          console.log('Max retries reached, using local data');
          if (loginError && !navigator.onLine) {
            loginError.textContent = 'Offline mode: Using cached data.';
            setTimeout(() => { if (loginError) loginError.textContent = ''; }, 3000);
          } else if (loginError) {
            loginError.textContent = 'Server connection failed. Showing offline data.';
            setTimeout(() => { if (loginError) loginError.textContent = ''; }, 3000);
          }
          await updateStatsDisplay();
          return false;
        }
        await sleep(2000 * attempt);
      }
    }
    return false;
  }

  // Refresh JWT: prefer stored refreshToken; if absent, fail fast
  async function refreshJwt() {
    try {
      const result = await getStorageData(['refreshToken', 'jwt']);
      const refreshToken = result.refreshToken;

      if (!refreshToken) {
        console.warn('No refresh token available in storage');
        throw new Error('No refresh token available');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('https://chillboard-6uoj.onrender.com/screen-time/refresh-token', {
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
      console.error('Error refreshing JWT:', error.message || error);
      if (loginError) loginError.textContent = 'Session expired. Please log in again.';
      await clearStorageData(['jwt', 'refreshToken']);
      showLogin();
      return null;
    }
  }

  // Update UI with stats — debounced to avoid flash updates
  let updateUiDebounce = null;
  function scheduleUpdateStatsDisplay(delay = 100) {
    if (updateUiDebounce) clearTimeout(updateUiDebounce);
    updateUiDebounce = setTimeout(() => {
      updateStatsDisplay().catch(err => console.error('updateStatsDisplay error:', err));
      updateUiDebounce = null;
    }, delay);
  }

  async function updateStatsDisplay() {
    if (isPopupClosing) return;

    try {
      const pingResponse = await sendMessageToBackgroundWithRetry({ action: 'ping' }, 5, 1000);
      if (!pingResponse || pingResponse.status !== 'success') {
        console.warn('Background script not ready, using local data');
        await useLocalData();
        return;
      }

      const syncResponse = await sendMessageToBackgroundWithRetry({ action: 'syncData' }, 5, 1000);
      if (!syncResponse) console.warn('Failed to sync data with background script');

      // gentle delay for background to update storage
      await sleep(300);

      const response = await sendMessageToBackgroundWithRetry({ action: 'getCurrentStats' }, 5, 1000);
      let totalTime = 0, tabUsage = [], trackingStatus = null;

      if (response && response.status === 'success') {
        totalTime = response.totalTime || 0;
        tabUsage = response.tabUsage || [];
        const statusResponse = await sendMessageToBackgroundWithRetry({ action: 'getTrackingStatus' }, 5, 1000);
        if (statusResponse && statusResponse.status === 'success') trackingStatus = statusResponse;
      } else {
        await useLocalData();
        return;
      }

      tabUsage = combineTabUsageByUrl(tabUsage);

      if (totalTimeSpan) totalTimeSpan.textContent = isLoading ? 'Loading...' : formatTime(totalTime);
      if (tabCountSpan) tabCountSpan.textContent = (tabUsage.length || 0).toString();

      if (trackingStatus && trackingStatusSpan) {
        const active = trackingStatus.isTracking;
        trackingStatusSpan.textContent = active ? 'Active' : 'Inactive';
        trackingStatusSpan.className = active ? 'status-active' : 'status-inactive';
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
      console.error('Error updating stats display:', error.message || error);
      await useLocalData();
      if (loginError) {
        loginError.textContent = 'Error loading stats. Using cached data.';
        setTimeout(() => { if (loginError) loginError.textContent = ''; }, 3000);
      }
    }
  }

  async function useLocalData() {
    const localData = await getStorageData(['totalTime', 'tabUsage', 'lastSyncedTotalTime', 'lastSyncedTabUsage', 'isTracking', 'currentTabUrl']);
    const totalTime = localData.totalTime || localData.lastSyncedTotalTime || 0;
    const tabUsage = localData.tabUsage || localData.lastSyncedTabUsage || [];
    const trackingStatus = { isTracking: localData.isTracking || false, currentTabUrl: localData.currentTabUrl || '' };

    if (totalTimeSpan) totalTimeSpan.textContent = formatTime(totalTime);
    if (tabCountSpan) tabCountSpan.textContent = (tabUsage.length || 0).toString();
    if (trackingStatusSpan) {
      trackingStatusSpan.textContent = trackingStatus.isTracking ? 'Active' : 'Inactive';
      trackingStatusSpan.className = trackingStatus.isTracking ? 'status-active' : 'status-inactive';
    }
    if (currentTabSpan) currentTabSpan.textContent = trackingStatus.currentTabUrl || '';

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

  // Login / logout handlers
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
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch('https://chillboard-6uoj.onrender.com/auth/login', {
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
      console.error('Login error:', error.message || error);
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
      await clearStorageData(['jwt', 'refreshToken', 'lastServerSync', 'tabStartTime', 'currentTabId', 'currentTabUrl', 'isTracking']);
      showLogin();
    } catch (error) {
      console.error('Logout error:', error);
      if (loginError) loginError.textContent = 'Error during logout. Please try again.';
    }
  }

  function handleOpenWebApp() {
    sendMessageToBackgroundWithRetry({ action: 'openWebApp' }, 5, 1000);
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
    }, 5000);
  }

  // Initialize popup
  async function initializePopup() {
    try {
      const result = await getStorageData(['jwt', 'refreshToken']);
      if (result.jwt) {
        const decoded = jwtDecode(result.jwt);
        if (!decoded || decoded.exp * 1000 < Date.now()) {
          // token expired - attempt refresh
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
      console.error('Error initializing popup:', error.message || error);
      showLogin();
      if (loginError) loginError.textContent = 'Error loading extension. Please try again.';
    }
  }

  // Events & bindings
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (openWebAppBtn) openWebAppBtn.addEventListener('click', handleOpenWebApp);
  if (emailInput) emailInput.addEventListener('keypress', e => e.key === 'Enter' && passwordInput?.focus());
  if (passwordInput) passwordInput.addEventListener('keypress', e => e.key === 'Enter' && handleLogin());

  window.addEventListener('beforeunload', () => {
    isPopupClosing = true;
    if (statsUpdateInterval) { clearInterval(statsUpdateInterval); statsUpdateInterval = null; }
  });

  // finally run initialization
  initializePopup();
});
