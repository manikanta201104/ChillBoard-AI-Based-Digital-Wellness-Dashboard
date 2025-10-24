// popup.js
// Key fixes:
// - Ensure all functions parse correctly (fixed missing braces).
// - Define updateStatsDisplay before any use; bind to window only after declaration.
// - Warm up background with a ping on initialize to avoid "message port closed" when worker is idle.
// - Shorter timeouts to reduce UI lag and avoid long hangs.
// - Guard updateStatsDisplay usage with a safe fallback to useLocalData.

document.addEventListener('DOMContentLoaded', () => {
  const loginContainer = document.getElementById('login-container');
  const statsContainer = document.getElementById('stats-container');
  const loginError = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const openWebAppBtn = document.getElementById('open-webapp-btn');
  const openWebAppBtnNewUser = document.getElementById('open-webapp-btn-newuser');
  const totalTimeSpan = document.getElementById('total-time');
  const tabCountSpan = document.getElementById('tab-count');
  const tabUsageList = document.getElementById('tab-usage');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  let isLoading = false;
  let statsUpdateInterval = null;
  let isPopupClosing = false;

  // Get YYYY-MM-DD in IST (Asia/Kolkata)
  function getISTDateString(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
  }

  function jwtDecode(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    } catch {
      return null;
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

  async function useLocalData() {
    const localData = await getStorageData(['totalTime', 'tabUsage', 'lastSyncedTotalTime', 'lastSyncedTabUsage']);
    const totalTime = localData.totalTime || localData.lastSyncedTotalTime || 0;
    const tabUsage = combineTabUsageByUrl(localData.tabUsage || localData.lastSyncedTabUsage || []);

    if (totalTimeSpan) totalTimeSpan.textContent = formatTime(totalTime);
    if (tabCountSpan) tabCountSpan.textContent = tabUsage.length.toString();

    if (tabUsageList) {
      tabUsageList.innerHTML = '';
      const sortedTabs = [...tabUsage].sort((a, b) => (b.timeSpent || 0) - (a.timeSpent || 0));
      sortedTabs.forEach((entry, index) => {
        if (!entry || !entry.url || entry.timeSpent <= 0) return;
        const li = document.createElement('li');
        li.className = 'tab-entry';
        li.style.animationDelay = `${index * 50}ms`;
        li.style.animation = 'slideIn 0.4s ease-out forwards';
        li.style.opacity = '0';
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
        setTimeout(() => { li.style.opacity = '1'; }, 50 + index * 50);
      });
    }
  }

  async function updateStatsDisplay() {
    if (isPopupClosing) return;

    // Warm ping to keep background alive for subsequent messages
    await sendMessageToBackgroundWithRetry({ action: 'ping' }, 2, 300);

    try {
      // Attempt a lightweight sync; if it doesn't respond, continue with cached data.
      await sendMessageToBackgroundWithRetry({ action: 'syncData' }, 2, 400);

      await sleep(300);

      const response = await sendMessageToBackgroundWithRetry({ action: 'getCurrentStats' }, 3, 500);
      let totalTime = 0, tabUsage = [];

      if (response && response.status === 'success') {
        totalTime = response.totalTime || 0;
        tabUsage = combineTabUsageByUrl(response.tabUsage || []);
      } else {
        await useLocalData();
        return;
      }

      if (totalTimeSpan) totalTimeSpan.textContent = formatTime(totalTime);
      if (tabCountSpan) tabCountSpan.textContent = (tabUsage.length || 0).toString();

      if (tabUsageList) {
        tabUsageList.innerHTML = '';
        const sortedTabs = [...tabUsage].sort((a, b) => (b.timeSpent || 0) - (a.timeSpent || 0));
        sortedTabs.forEach((entry, index) => {
          if (!entry || !entry.url || entry.timeSpent <= 0) return;
          const li = document.createElement('li');
          li.className = 'tab-entry';
          li.style.animationDelay = `${index * 50}ms`;
          li.style.animation = 'slideIn 0.4s ease-out forwards';
          li.style.opacity = '0';
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
          setTimeout(() => { li.style.opacity = '1'; }, 50 + index * 50);
        });
      }
    } catch (error) {
      console.error('Error updating stats display:', error.message);
      await useLocalData();
      if (loginError) {
        loginError.textContent = 'Error loading stats. Using cached data.';
        loginError.style.background = 'rgba(251, 191, 36, 0.1)';
        loginError.style.borderColor = 'rgba(251, 191, 36, 0.3)';
        loginError.style.color = '#d97706';
        setTimeout(() => {
          if (loginError) {
            loginError.textContent = '';
            loginError.style.background = '';
            loginError.style.borderColor = '';
            loginError.style.color = '';
          }
        }, 3000);
      }
    }
  }

  function showLogin() {
    if (statsContainer) statsContainer.style.display = 'none';
    if (loginContainer) {
      loginContainer.style.display = 'block';
      loginContainer.style.opacity = '0';
      loginContainer.style.animation = 'slideIn 0.4s ease-out forwards';
      setTimeout(() => { loginContainer.style.opacity = '1'; }, 100);
    }
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
    if (statsContainer) {
      statsContainer.style.display = 'block';
      statsContainer.style.opacity = '0';
      statsContainer.style.animation = 'slideIn 0.4s ease-out forwards';
      setTimeout(() => { statsContainer.style.opacity = '1'; }, 100);
    }
    // Show immediate placeholders for better UX while data loads
    if (totalTimeSpan) {
      totalTimeSpan.textContent = 'Loading...';
      totalTimeSpan.style.opacity = '0.8';
    }
    if (tabCountSpan) {
      tabCountSpan.textContent = 'Loading...';
      tabCountSpan.style.opacity = '0.8';
    }
    if (tabUsageList) {
      tabUsageList.innerHTML = '';
      const li = document.createElement('li');
      li.textContent = 'Loading tab usage...';
      li.style.opacity = '0.8';
      tabUsageList.appendChild(li);
    }
    // Ensure function is callable even if rebind needed
    if (typeof updateStatsDisplay === 'function') await updateStatsDisplay();
    else await useLocalData();

    if (statsUpdateInterval) clearInterval(statsUpdateInterval);
    statsUpdateInterval = setInterval(async () => {
      if (!isPopupClosing) await updateStatsDisplay();
    }, 5000);
  }

  async function fetchScreenTimeWithRetry(jwt, date, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const success = await fetchScreenTime(jwt, date, attempt);
        if (success) {
          if (typeof updateStatsDisplay === 'function') await updateStatsDisplay();
          else await useLocalData();
          return true;
        }
      } catch (error) {
        console.error(`Fetch attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          if (loginError) {
            loginError.textContent = navigator.onLine ? 'Server connection failed. Showing offline data.' : 'Offline mode: Using cached data.';
            loginError.style.background = 'rgba(251, 191, 36, 0.1)';
            loginError.style.borderColor = 'rgba(251, 191, 36, 0.3)';
            loginError.style.color = '#d97706';
            setTimeout(() => {
              if (loginError) {
                loginError.textContent = '';
                loginError.style.background = '';
                loginError.style.borderColor = '';
                loginError.style.color = '';
              }
            }, 3000);
          }
          if (typeof updateStatsDisplay === 'function') await updateStatsDisplay();
          else await useLocalData();
          return false;
        }
        await sleep(1200 * attempt);
      }
    }
    return false;
  }

  async function fetchScreenTime(jwt, date, retries = 1) {
    if (isLoading || isPopupClosing || !navigator.onLine) return false;

    isLoading = true;
    if (totalTimeSpan) {
      totalTimeSpan.textContent = 'Loading...';
      totalTimeSpan.style.opacity = '0.7';
      totalTimeSpan.style.animation = 'subtlePulse 1.5s infinite';
    }
    if (tabCountSpan) {
      tabCountSpan.textContent = '';
      tabCountSpan.style.opacity = '0.7';
    }
    if (tabUsageList) tabUsageList.innerHTML = '';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 12000);

      const response = await fetch('https://chillboard-6uoj.onrender.com/screen-time', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${jwt}` },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
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
          lastSyncedTabUsage: combinedTabUsage
        });
      }

      isLoading = false;
      return true;
    } catch (error) {
      console.error('Fetch screen time failed:', error.message);
      isLoading = false;
      throw error;
    } finally {
      if (totalTimeSpan) {
        totalTimeSpan.style.opacity = '1';
        totalTimeSpan.style.animation = '';
      }
      if (tabCountSpan) {
        tabCountSpan.style.opacity = '1';
      }
    }
  }

  async function refreshJwt() {
    try {
      const result = await getStorageData(['jwt', 'refreshToken']);
      let refreshToken = result.refreshToken;

      if (!refreshToken) {
        const profileResponse = await fetch('https://chillboard-6uoj.onrender.com/auth/profile', {
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
      await setStorageData({ jwt: data.token, refreshToken });
      // Notify background that auth state changed
      await sendMessageToBackgroundWithRetry({ action: 'authUpdated' }, 3, 500);
      return data.token;
    } catch (error) {
      console.error('Error refreshing JWT:', error.message);
      if (loginError) {
        loginError.textContent = 'Session expired. Please log in again.';
        loginError.style.animation = 'slideIn 0.3s ease-out';
      }
      await clearStorageData(['jwt', 'refreshToken']);
      showLogin();
      return null;
    }
  }

  async function handleLogin() {
    const email = emailInput?.value?.trim();
    const password = passwordInput?.value?.trim();

    if (!email || !password) {
      if (loginError) {
        loginError.textContent = 'Please enter email and password';
        loginError.style.animation = 'slideIn 0.3s ease-out';
      }
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';
      loginBtn.style.opacity = '0.8';
    }
    if (loginError) loginError.textContent = '';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 12000);

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
      await sendMessageToBackgroundWithRetry({ action: 'authUpdated' }, 3, 500);

      if (loginBtn) {
        loginBtn.textContent = 'Success!';
        loginBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        await sleep(500);
      }

      await sendMessageToBackgroundWithRetry({ action: 'syncData' }, 5, 1000);
      await showStats();
      const currentDate = getISTDateString();
      await fetchScreenTimeWithRetry(data.token, currentDate);
    } catch (error) {
      console.error('Login error:', error.message);
      if (loginError) {
        loginError.textContent = error.name === 'AbortError' ? 'Login request timed out. Please try again.' : (error.message || 'Login failed. Please try again.');
        loginError.style.animation = 'slideIn 0.3s ease-out';
      }
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
        loginBtn.style.opacity = '1';
        loginBtn.style.background = '';
      }
    }
  }

  async function handleLogout() {
    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Logging out...';
      logoutBtn.style.opacity = '0.8';
    }

    try {
      await sendMessageToBackgroundWithRetry({ action: 'logout' }, 5, 1000);
      await clearStorageData(['jwt', 'refreshToken', 'lastServerSync', 'tabStartTime', 'currentTabId', 'currentTabUrl', 'isTracking']);
      if (statsContainer) {
        statsContainer.style.transition = 'opacity 0.3s ease';
        statsContainer.style.opacity = '0.7';
        await sleep(200);
      }
      showLogin();
    } catch (error) {
      console.error('Logout error:', error);
      if (loginError) {
        loginError.textContent = 'Error during logout. Please try again.';
        loginError.style.animation = 'slideIn 0.3s ease-out';
      }
    } finally {
      if (logoutBtn) {
        logoutBtn.disabled = false;
        logoutBtn.textContent = 'Logout';
        logoutBtn.style.opacity = '1';
      }
    }
  }

  function handleOpenWebApp() {
    sendMessageToBackgroundWithRetry({ action: 'openWebApp' }, 5, 1000);
  }

  // Storage helpers
  function getStorageData(keys) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get(keys, result => {
          if (chrome.runtime.lastError) resolve({});
          else resolve(result || {});
        });
      } catch {
        resolve({});
      }
    });
  }

  function setStorageData(data) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.set(data, () => resolve());
      } catch {
        resolve();
      }
    });
  }

  function clearStorageData(keys) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.remove(keys, () => resolve());
      } catch {
        resolve();
      }
    });
  }

  async function sendMessageToBackgroundWithRetry(message, maxRetries = 4, retryDelay = 500) {
    if (isPopupClosing) return null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Message send timed out')), 8000);
          chrome.runtime.sendMessage(message, (response) => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(response);
          });
        });
        if (response !== null && response !== undefined) return response;
        if (attempt < maxRetries) await sleep(retryDelay * attempt);
      } catch (error) {
        if (attempt === maxRetries) return null;
        await sleep(retryDelay * attempt);
      }
    }
    return null;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Expose for DevTools or external code calling it after popup reload
  if (typeof window !== 'undefined') {
    window.updateStatsDisplay = updateStatsDisplay;
  }

  // Events
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (openWebAppBtn) openWebAppBtn.addEventListener('click', handleOpenWebApp);
  if (openWebAppBtnNewUser) openWebAppBtnNewUser.addEventListener('click', handleOpenWebApp);
  if (emailInput) emailInput.addEventListener('keypress', e => e.key === 'Enter' && passwordInput?.focus());
  if (passwordInput) passwordInput.addEventListener('keypress', e => e.key === 'Enter' && handleLogin());
  window.addEventListener('beforeunload', () => {
    isPopupClosing = true;
    if (statsUpdateInterval) {
      clearInterval(statsUpdateInterval);
      statsUpdateInterval = null;
    }
  });

  // Initialize after all functions exist
  initializePopup();

  async function initializePopup() {
    try {
      if (loginContainer) loginContainer.style.opacity = '0.7';
      if (statsContainer) statsContainer.style.opacity = '0.7';

      // Warm up the background worker before other messages
      await sendMessageToBackgroundWithRetry({ action: 'ping' }, 3, 500);

      const result = await getStorageData(['jwt', 'refreshToken']);
      if (result.jwt) {
        const decoded = jwtDecode(result.jwt);
        if (!decoded || decoded.exp * 1000 < Date.now()) {
          const newJwt = await refreshJwt();
          if (!newJwt) {
            showLogin();
            return;
          }
        }
        await sendMessageToBackgroundWithRetry({ action: 'authUpdated' }, 3, 500);
        await sendMessageToBackgroundWithRetry({ action: 'syncData' }, 5, 1000);
        await showStats();
        const currentDate = getISTDateString();
        await fetchScreenTimeWithRetry(result.jwt, currentDate);
      } else {
        showLogin();
      }
    } catch (error) {
      console.error('Error initializing popup:', error);
      showLogin();
      if (loginError) {
        loginError.textContent = 'Error loading extension. Please try again.';
        loginError.style.animation = 'slideIn 0.3s ease-out';
      }
    } finally {
      if (loginContainer) loginContainer.style.opacity = '1';
      if (statsContainer) statsContainer.style.opacity = '1';
    }
  }
});