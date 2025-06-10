# Day 4: Tab Usage Tracking for ChillBoard Chrome Extension

**Date**: June 05, 2025  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Enhance the Chrome extension to track tab usage (URLs and time spent on each domain) and store it in `chrome.storage.local`, complementing screen time tracking.

## Task Overview
On Day 4, I updated the ChillBoard Chrome extension to monitor open tabs, track time spent on each domain (e.g., “youtube.com”), and store the data as an array in `chrome.storage.local`. This provides insights into browsing habits for ChillBoard’s wellness recommendations.

## What Was Done
1. **Updated `background.js`**:
   - Added logic to track tab usage while preserving screen time tracking (from Day 3).
   - Used `chrome.tabs` APIs to monitor tabs and their URLs.
   - Parsed URLs to extract domains (e.g., “www.youtube.com” from “https://www.youtube.com/watch”).
   - Stored tab data as `[{ url, timeSpent }, ...]` in `chrome.storage.local`.

2. **Tab Usage Tracking Implementation**:
   - **APIs Used**:
     - `chrome.tabs.query`: Retrieves open tabs and their URLs.
     - `chrome.tabs.onActivated`: Detects when a tab becomes active (e.g., user switches tabs).
     - `chrome.tabs.onUpdated`: Handles URL changes in the active tab.
     - `chrome.tabs.onRemoved`: Updates data when a tab is closed.
   - **Logic**:
     - Tracks `currentTabId` (active tab’s ID) and `tabStartTime` (when it became active).
     - Calculates time spent when switching tabs, updating URLs, or closing tabs.
     - Saves `tabUsage` array (e.g., `[{ url: "www.youtube.com", timeSpent: 7 }, ...]`) in `chrome.storage.local`.
   - **Domain Parsing**: Used `new URL(url).hostname` to get domains (e.g., “www.youtube.com”).

3. **Tested the Extension**:
   - Reloaded the extension in Chrome (`chrome://extensions/` > Reload).
   - Opened tabs: YouTube (`www.youtube.com`), Gmail (`mail.google.com`), grok.com.
   - Switched between tabs, navigated (e.g., watched a YouTube video), and closed a tab.
   - Spent ~7s on YouTube, 7s on Gmail, 3s on grok.com.
   - Checked `chrome.storage.local` in DevTools with:
     ```javascript
     chrome.storage.local.get(['tabUsage'], result => console.log(result));
     ```
   - Observed:
     ```javascript
     { tabUsage: [
       { url: "www.youtube.com", timeSpent: 7 },
       { url: "mail.google.com", timeSpent: 7 },
       { url: "grok.com", timeSpent: 3 }
     ] }
     ```
   - Verified screen time continued updating (e.g., `Total time: 51` seconds).
   - Confirmed tracking paused when switching to another app (e.g., Notion).

## Key Components
- **Files**:
  - `background.js`: Updated to include tab usage tracking.
  - `manifest.json`: Unchanged (already has `tabs` permission).
- **APIs**:
  - `chrome.tabs.query`, `onActivated`, `onUpdated`, `onRemoved`: Monitor tab activity.
  - `chrome.storage.local`: Stores `{ tabUsage: [{ url, timeSpent }, ...] }`.
  - `chrome.windows.getAll`, `onFocusChanged`: Continue screen time tracking.
- **Logic**:
  - `currentTabId`, `tabStartTime`: Track active tab and start time.
  - `tabUsage`: Array of domain-time pairs.
  - Updates time on tab switch, URL change, or closure.
  - Saves data when Chrome loses focus or tabs change.

## Outcomes
- Extension now tracks **both screen time** and **tab usage**.
- Successfully logged tab usage for YouTube (7s), Gmail (7s), and grok.com (3s).
- Data stored locally in `chrome.storage.local`, ready for backend sync (Day 9) and Dashboard display (Day 11).
- Maintained privacy by processing data locally.

## Notes
- **Success**: Tab usage tracked accurately; screen time unaffected.
- **Limitations**: Incognito tabs not tracked (requires `"incognito": "split"` in `manifest.json` if needed). Subdomains (e.g., “www.youtube.com” vs. “youtube.com”) treated as same domain in parsing.
- **Next Steps**: Sync screen time and tab usage data to backend (Day 9).
- **Resources**:
  - Chrome Extensions Docs: `developer.chrome.com/docs/extensions/reference/api/tabs`
  - YouTube: “Chrome Extensions: Working with Tabs and Windows” by Traversy Media (searched: “Traversy Media Chrome Extension tabs windows”)

## Next Steps
- **Day 9**: Implement backend to receive extension data.
- Commit `background.js` and `day_4_readme.md` to GitHub.
- Update Notion/Trello board to mark Day 4 as Done.