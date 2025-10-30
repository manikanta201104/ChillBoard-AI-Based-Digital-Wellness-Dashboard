# ChillBoard Chrome Extension — Technical Guide (MV3)

Version: 1.0

---

# Table of Contents

- 1. Overview
- 2. Capabilities and Permissions
- 3. Architecture and Core Flows
- 4. Data Model and Sync Protocol
- 5. Authentication and Security
- 6. Error Handling, Offline, and Idle Management
- 7. Setup (Local Dev) and Configuration
- 8. Packaging and Chrome Web Store Release
- 9. Troubleshooting & Diagnostics
- 10. Future Improvements

---

# 1. Overview

The ChillBoard Chrome Extension (Manifest V3) tracks browser screen time per hostname and synchronizes daily snapshots with the ChillBoard backend. It also periodically pulls the server state so the database remains the source of truth. All processing stays client-side; only aggregated time data (hostnames + seconds) is transmitted.

Key properties:
- MV3 service worker entry: `background.js`
- Popup UI: `popup.html`, `popup.js`, `popup.css`
- Manifest: `ChillBoardExtension/manifest.json`

---

# 2. Capabilities and Permissions

- storage: Persist tracking counters and queued snapshots
- tabs, windows: Determine current active tab and focused window
- alarms: Periodic sync (push) and pull from server (5-minute cadence)
- idle: Pause tracking when system is locked/idle (unless media is active)
- webNavigation: React to navigation updates in the active tab
- host_permissions: Backend/API origins and app web UI

---

# 3. Architecture and Core Flows

- Initialization
  - On install/startup, `background.js` loads persisted state and computes authentication from stored JWT (if any).
  - If a new day is detected, the previous day’s snapshot is queued and the counters reset.

- Tracking Loop
  - When the browser window is focused and a valid tab is active (HTTP/HTTPS), the extension increments per-hostname seconds every 1s.
  - Tracking is paused when the system is idle/locked (unless `isMediaActive` heuristic) or browser loses focus.
  - Badge reflects status: tracking, paused, syncing, warning, errors.

- Sync
  - Alarms every 5 minutes: `syncData` (POST absolute snapshot) and `pullServerData` (GET), both with timeouts and retries.
  - Offline or failure: Queue per-day absolute snapshots in `chrome.storage.local` for later retry.
  - Server responses overwrite local state for consistency.

- JWT Refresh
  - On 401 during sync/pull, the extension calls a refresh-token endpoint; on failure it clears JWT and prompts the user to log in via the web app.

---

# 4. Data Model and Sync Protocol

- Runtime State
  - totalTime: integer (seconds)
  - tabUsage: array of `{ tabId, url (hostname), timeSpent }` merged by hostname
  - lastSyncDate: `YYYY-MM-DD`
  - offlineQueue: array of snapshots `{ date, totalTime, tabs[] }`
  - lastSyncedTotalTime, lastSyncedTabUsage: server-acknowledged baseline

- Absolute Daily Snapshot (one per date)
  - date: `YYYY-MM-DD`
  - totalTime: total seconds counted for the day
  - tabs: array of `{ url, timeSpent }` with hostname-level aggregation

- Protocol
  - Push: `POST /screen-time` with `{ userId, date, totalTime, tabs }`
  - Pull: `GET /screen-time` and filter for today; overwrite local counters
  - At midnight boundary: move current day into queue and start fresh counters

---

# 5. Authentication and Security

- The extension stores only JWT and refresh token from the web app login flow (user-initiated).
- All requests use HTTPS with `Authorization: Bearer <JWT>`.
- No PII or full URLs are stored; only hostnames + time spent.
- Tracking is disabled when not authenticated.

---

# 6. Error Handling, Offline, and Idle Management

- Error Handling
  - Network and timeouts are retried with exponential backoff (bounded).
  - On repeated errors, the snapshot remains queued and badge shows warning.

- Offline Mode
  - Detects online/offline transitions; queues data while offline, auto-syncs when online.

- Idle/Lock Handling
  - Uses `chrome.idle` to pause tracking when system inactive; resumes when active.
  - Special-case for media sites (e.g., YouTube, Netflix) to avoid pausing when the user is watching videos.

---

# 7. Setup (Local Dev) and Configuration

- Load Unpacked
  - Chrome → `chrome://extensions` → Enable Developer mode → Load unpacked → select `ChillBoardExtension/`

- Manifest Host Permissions
  - Include your backend dev origin (e.g., `http://localhost:5000`) and prod (`https://chillboard-6uoj.onrender.com`).
  - Include the web app origin (e.g., `https://www.chillboard.in/`).

- Dev Tips
  - Use extension service worker console for logs.
  - Use the badge/status to monitor tracking and sync.

---

# 8. Packaging and Chrome Web Store Release

- Versioning
  - Update `version` in `manifest.json` for each release (e.g., 1.7.1).

- Assets
  - Icons: 16/48/128 px PNGs.
  - Privacy Policy: `Privacy_Policy.pdf` included.

- Submission
  - Build (no bundling required) → Zip the `ChillBoardExtension/` directory → Upload to Web Store Developer Dashboard → Fill listing → Publish.

---

# 9. Troubleshooting & Diagnostics

- Status badge stuck on sync/warning
  - Check service worker console for network errors and CORS.
  - Confirm host_permissions include all required origins.

- No tracking occurring
  - Ensure user is authenticated (JWT present and not expired).
  - Confirm the active tab is HTTP/HTTPS and window is focused.

- Data mismatch with dashboard
  - Wait for the next 5-min cycle or trigger manual sync from popup.
  - Server is source of truth; local will be overwritten on pull.

- Midnight rollover issues
  - Verify `lastSyncDate` updates and snapshot push on the new day.

---

# 10. Future Improvements

- Migrate state to IndexedDB (for larger queues and better durability).
- Add fine-grained site categories (productivity/social/etc.) computed locally.
- Optional per-tab pause/ignore list managed from the popup.
- Rich diagnostics panel in popup (recent syncs, queued snapshots).
