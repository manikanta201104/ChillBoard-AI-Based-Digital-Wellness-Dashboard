# Day 5: Popup Interface for ChillBoard Chrome Extension

**Date**: June 06, 2025  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Add a popup interface to the Chrome extension to display screen time and tab stats, with a button linking to the web app.

## Task Overview
On Day 5, I added a popup interface to the ChillBoard Chrome extension to show current session stats (screen time, tabs open) and a button to open the web app (placeholder: `http://localhost:3000`). The popup fetches data from `chrome.storage.local` and enhances user interaction.

## What Was Done
1. **Created Popup Files**:
   - Added `popup.html`: HTML for stats display and button.
   - Added `popup.css`: Styles for a clean UI.
   - Updated `manifest.json`: Added `"action": {"default_popup": "popup.html"}`.

2. **Displayed Stats**:
   - Used `chrome.storage.local.get(['totalTime', 'tabUsage'])` to fetch data.
   - Converted `totalTime` (seconds) to hours/minutes (e.g., 1554s → “26m”).
   - Counted unique domains in `tabUsage` (e.g., 3 entries → “3 tabs open”).
   - Updated DOM elements in `popup.html` to show stats.

3. **Added Web App**:
   - Included a `<button>` in `popup.html` with `onclick="openWebApp()"`.
   - Used `chrome.tabs.create` to open `http://localhost:3000` in a new tab.

4. **Tested the Popup**:
   - Reloaded the extension in Chrome (`chrome://extensions/` > Reload).
   - Clicked the extension icon to open the popup.
   - Verified stats displayed (e.g., “26m online, 3 tabs open” for `totalTime: 1554`, 3 tabUsage entries).
   - Clicked button; confirmed new tab opened to `http://localhost:3000` (expected error if no server running).
   - Checked `chrome.storage.local` in DevTools to confirm data consistency:
     ```javascript
     chrome.storage.local.get(['totalTime', 'tabUsage'], result => console.log(result));
     ```

## Key Components
- **Files**:
  - `popup.html`: HTML structure with stats and button.
  - `popup.css`: CSS for styling (300px width, green button).
  - `manifest.json`: Registers popup.
- **APIs**:
  - `chrome.storage.local.get`: Fetches `totalTime`, `tabUsage`.
  - `chrome.tabs.create`: Opens web app URL.
- **Logic**:
  - Formats `totalTime` into hours/minutes.
  - Counts `tabUsage` entries for tab stats.
  - Button triggers new tab.

## Outcomes
- Extension now includes a user-friendly popup.
- Successfully displayed stats (e.g., “26m online, 3 tabs open”).
- Button links to `http://localhost:3000`, ready for web app (Day 10).
- Data remains local, ensuring privacy.

## Notes
- **Success**: Popup displays stats accurately; button functions.
- **Issues**: None (or e.g., “localhost error without server, expected”).
- **Limitations**: Tab count based on unique domains; may refine later (Day 43).
- **Next Steps**: Set up backend for data sync (Day 9).
- **Resources**:
  - Chrome Extensions: `developer.chrome.com/docs/extensions/mv3/user-interface`
  - YouTube: “Build a Chrome Extension” by freeCodeCamp (searched: “freeCodeCamp Chrome Extension tutorial”)

## Next Steps
- **Day 9**: Implement backend to receive extension data.
- Commit files to GitHub.
- Update Notion/Trello board.