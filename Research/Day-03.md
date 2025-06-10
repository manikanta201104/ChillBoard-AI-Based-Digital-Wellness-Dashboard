# Day 3: Chrome Extension for Screen Time Tracking

**Date**: June 04, 2025  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Build a Chrome extension to track screen time (time spent actively using Chrome) and store it locally, serving as the data source for ChillBoard’s wellness metrics.

## Task Overview
On Day 3, I created a Chrome extension named “ChillBoard Extension” to track screen time using the `chrome.windows` API and store the total time in `chrome.storage.local`. The extension detects when Chrome is focused, calculates time in seconds, and saves it locally for later use in the ChillBoard Dashboard.

## What Was Done
1. **Set Up Extension Structure**:
   - Created a folder: `ChillBoardExtension`.
   - Added two files:
     - `manifest.json`: Configures the extension with Manifest V3, name, version, and permissions.
     - `background.js`: Contains logic for tracking screen time.
   - Configured `manifest.json`:
     - `name`: “ChillBoard Extension”
     - `version`: “1.0”
     - `permissions`: `["tabs", "windows", "storage"]`
     - `background.service_worker`: `background.js`

2. **Implemented Screen Time Tracking**:
   - Used `chrome.windows.getAll` to check if any Chrome window is focused (`windowTypes: ['normal']`).
   - Used `chrome.windows.onFocusChanged` to detect focus changes (e.g., to another app or `WINDOW_ID_NONE`).
   - Incremented `totalTime` every second when Chrome is focused using `setInterval`.
   - Stored `totalTime` (in seconds) in `chrome.storage.local` using `chrome.storage.local.set`.
   - Loaded saved `totalTime` on extension start with `chrome.runtime.onInstalled`.

3. **Tested the Extension**:
   - Loaded the extension in Chrome via Developer Mode (`chrome://extensions/` > Load Unpacked).
   - Browsed websites (e.g., YouTube, Google Docs) for ~25 minutes.
   - Switched to another app (e.g., Notion) to confirm tracking pauses.
   - Checked `chrome.storage.local` in DevTools (`chrome.storage.local.get(['totalTime']`).
   - Observed: `{ totalTime: 1554 }` (~25 minutes), confirming correct tracking.
   - Verified: Console logs in `background.js` showed `totalTime` incrementing (e.g., “Total time: 1554”).

## Key Components
- **Files**:
  - `manifest.json`: Defines extension metadata and permissions.
  - `background.js`: Tracks screen time and saves data.
- **APIs**:
  - `chrome.windows.getAll`: Checks focused windows.
  - `chrome.windows.onFocusChanged`: Detects focus changes.
  - `chrome.storage.local`: Stores `{ totalTime: X }`.
- **Logic**:
  - `isTracking`: True when Chrome is focused.
  - `totalTime`: Increments by 1 second when tracking.
  - Saves to storage on focus loss or every second.

## Outcomes
- Successfully created a Chrome extension that tracks screen time.
- Confirmed accurate tracking (~25 minutes = 1554 seconds).
- Data stored locally in `chrome.storage.local`, ready for tab tracking (Day 4) and backend sync (Day 9).
- Extension works in Chrome with Manifest V3, ensuring compatibility.

## Notes
- **Success**: Tracking works as expected; pauses when Chrome loses focus.
- **Limitations**: Incognito mode not tracked (requires `"incognito": "split"` in `manifest.json` if needed).
- **Next Steps**: Add tab tracking with `chrome.tabs.query` and `onActivated` (Day 4).
- **Resources**:
  - Chrome Extensions Docs: `developer.chrome.com/docs/extensions/mv3`
  - YouTube: “Build a Chrome Extension” by freeCodeCamp (searched: “freeCodeCamp Chrome Extension tutorial”)

## Next Steps
- **Day 4**: Extend the extension to track tab usage (e.g., time spent on specific URLs like YouTube).
- Commit files to GitHub and update Notion/Trello board.