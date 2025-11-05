# ChillBoard Chrome Extension Architecture

## Overview
- Manifest V3 service worker (background.js) for tracking and syncing.
- Message passing between popup/UI and service worker.
- Syncs screen time with backend; DB is source of truth.
 - Authenticates via the web app (jwt + refreshToken stored in chrome.storage.local).

## Architecture
- Service worker maintains:
  - isTracking, totalTime, tabUsage, currentTabId/url, timers.
  - Auth state from JWT stored in chrome.storage.local.
- Key modules in background.js:
  - Storage helpers: get/set/clear.
  - Tracking engine: start/stop, updateTabTime per second, combineTabUsageByUrl.
  - Network: syncData (POST), fetchServerData (GET), refreshJwt.
  - Alarms: syncData (push) and pullServerData (pull latest from server).
  - Idle detection: pauses tracking when idle/locked; resumes when active/media.
  - Badges/notifications for quick feedback.

## Data Flow
```
[Tabs Activity] -> updateTabTime -> saveAllData -> (periodic) syncData POST /screen-time
                                        ^                                  |
                                        |                                  v
                              fetchServerData GET /screen-time <--- pullServerData alarm
```
- Server merges updates using max totals; client also periodically pulls to reflect manual DB changes.

### Endpoints used
- `GET /screen-time` (auth): returns today's server totals (source of truth)
- `POST /screen-time` (auth): merges posted snapshot with server values
- `GET /screen-time/trends` (auth, optional): historical trends
- `GET /screen-time/refresh-token` (auth): refreshes short-lived token used by the extension

## Popup/UI
- Sends messages (e.g., getScreenTime, syncData, logout) to service worker.
- Opens web app via openWebApp.
 - Forgot Password and account actions are handled in the web app.

## Mood Detection
- Web app uses TensorFlow.js/face-api.js (not inside extension). The extension focuses on usage tracking.

## Permissions
- Required: storage, tabs, activeTab, scripting, alarms, idle, webNavigation, host permissions for tracked sites.
- Badge and notifications via chrome.action.

## Setup and Development
```
1. Load unpacked extension: chrome://extensions -> Developer mode -> Load unpacked -> ChillBoardExtension/
2. Set BASE URL: In background.js (or config), set the API base to your backend URL (e.g., https://chillboard-6uoj.onrender.com).
3. Login in the web app (https://www.chillboard.in) to obtain jwt/refreshToken; the extension reads them from chrome.storage.local.
4. Test tracking by browsing; check the badge and background logs (chrome://extensions -> Inspect service worker).
```

## Sync Cycle Diagram
```
Every 5 min:
- syncData alarm: build snapshot of today + queued days -> POST /screen-time (auth) -> on success, clear sent dates
- pullServerData alarm: GET /screen-time -> set today's totals from DB (source of truth)
On network status change: attempt sync when back online
On new day: resetDailyData and queue previous day snapshot
```

## Troubleshooting
- If totals don't update, check background logs and verify the API base URL.
- Ensure you are logged into the web app and `jwt` is present in chrome.storage.local.
- If backend is protected by CORS, confirm the extension's requests are allowed.
