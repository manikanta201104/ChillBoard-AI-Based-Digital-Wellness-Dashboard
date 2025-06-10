# Day 9: Chrome Extension Data Sync with Backend for ChillBoard

**Date**: June 08, 2025 (Completed early for June 10, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Update the Chrome extension to authenticate users and sync screen time data with the backend.

## Task Overview
On Day 9, I updated the ChillBoard Chrome extension to include a login prompt, sync screen time data to the backend every 5 minutes, and handle offline scenarios. I also added a `POST /screen-time` endpoint in the backend to save the data.

## What Was Done
1. **Updated Chrome Extension**:
   - Added a login form to `popup.html` and `popup.js`.
   - Stored JWT in `chrome.storage.local` after login.
   - Updated `background.js` to sync data to `POST /screen-time` every 5 minutes.
   - Added offline caching using `chrome.storage.local`.

2. **Added Backend Endpoint**:
   - Created `middleware/auth.js` to verify JWT tokens.
   - Created `routes/screenTime.js` with `POST /screen-time` to save data to the `ScreenTime` collection.

3. **Tested Integration**:
   - Logged in via the extension popup with `email: "user@example.com"`.
   - Browsed for a few minutes, waited for sync.
   - Verified in MongoDB Compass: `screenTimes` collection had the data.
   - Tested offline: Disconnected, browsed, reconnected, and confirmed sync.

## Key Components
- **Extension Files**:
  - `popup.html`, `popup.js`, `popup.css`: Login UI and logic.
  - `background.js`: Data sync and offline caching.
- **Backend Files**:
  - `middleware/auth.js`: JWT verification.
  - `routes/screenTime.js`: Saves screen time data.
- **Features**:
  - Authentication with JWT.
  - Periodic sync (5 minutes).
  - Offline caching and retry.

## Outcomes
- Extension now authenticates users and syncs data to the backend.
- Backend saves screen time data in MongoDB.
- Offline scenarios handled with caching.

## Notes
- **Success**: Login works, data syncs, offline caching works.
- **Issues**: None (or note any, e.g., “CORS issue”).
- **Next Steps**: Set up React app (Day 10).
- **Resources**:
  - Chrome Extensions: `developer.chrome.com/docs/extensions`
  - Fetch API: `developer.mozilla.org/en-US/docs/Web/API/Fetch_API`
  - YouTube: “Chrome Extension Tutorial” by Traversy Media (searched: “Traversy Media Chrome Extension”)

## Next Steps
- **Day 10**: Set up the React app at `http://localhost:3000`.
- Commit files to GitHub.
- Update Notion/Trello board.