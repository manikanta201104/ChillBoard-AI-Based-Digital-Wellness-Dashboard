// Initial Setup and DOM Elements
document.addEventListener('DOMContentLoaded', () => {
  const loginContainer = document.getElementById('login-container');
  const statsContainer = document.getElementById('stats-container');
  const loginError = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const openWebAppBtn = document.getElementById('open-webapp-btn');
  const totalTimeSpan = document.getElementById('total-time');
  const tabCountSpan = document.getElementById('tab-count');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  // Check Login Status on Load
  chrome.storage.local.get(['jwt'], (result) => {
    if (result.jwt) {
      showStats();
    } else {
      showLogin();
    }
  });

  // Login Button Handler
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

  // Logout Button Handler
  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove('jwt', () => {
      showLogin();
    });
  });

  // Open Web App Button Handler
  openWebAppBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openWebApp' });
  });
  // Show Login Function
  function showLogin() {
    loginContainer.style.display = 'block';
    statsContainer.style.display = 'none';
    emailInput.value = '';
    passwordInput.value = '';
    loginError.textContent = '';
  }
  // Show Stats Function
  function showStats() {
    loginContainer.style.display = 'none';
    statsContainer.style.display = 'block';

    chrome.storage.local.get(['totalTime', 'tabUsage'], (result) => {
      const totalTime = result.totalTime || 0;
      const tabUsage = result.tabUsage || [];
      const minutes = Math.floor(totalTime / 60);
      const hours = Math.floor(minutes / 60);
      const displayTime = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

      totalTimeSpan.textContent = displayTime;
      tabCountSpan.textContent = tabUsage.length;
    });
  }
});
