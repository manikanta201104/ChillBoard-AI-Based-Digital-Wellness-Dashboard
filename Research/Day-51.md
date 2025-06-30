# ChillBoard - AI-Based Digital Wellness Dashboard

## Overview
Welcome to the ChillBoard project! This Chrome extension, developed from June 2025 onwards, tracks screen time and tab usage to promote digital wellness. It integrates with a backend server for data aggregation and a web dashboard for visualization. This README covers the progress through Day 51 (July 22, 2025), including multi-tab and multi-device tracking, edge case testing, and debugging.

## Features
- **Screen Time Tracking**: Monitors active tab usage across multiple devices.
- **Multi-Device Support**: Aggregates data for the same user account across devices.
- **Offline Mode**: Caches data offline and syncs upon reconnection.
- **Real-Time Stats**: Displays updated screen time and tab count in the popup.
- **Edge Case Handling**: Supports 20+ tabs, minimal activity, and robust sync.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- Chrome browser with Developer Mode enabled.
- Backend server configured with `.env` (e.g., `MONGO_URI`, `JWT_SECRET`, CORS settings).

### Extension Setup
1. Navigate to `ChillBoard/extension/`, open `chrome://extensions/`, enable “Developer mode,” and load the unpacked folder.
2. Clear `chrome.storage.local` via DevTools (“Application” tab) to start fresh.

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure `/screen-time` endpoint aggregates data by `userId` and date.
3. Run `nodemon index.js` to start the server on `http://localhost:5000`.

### Web App Setup
1. Navigate to `ChillBoard/WebApp/` and run `npm install`.
2. Run `npm start` to launch the dashboard on `http://localhost:3000`.

## Usage
1. **Install and Authenticate**:
   - Log in via the popup using your email and password to obtain a JWT token.
   - Copy the token to other devices for multi-device testing.
2. **Track Usage**:
   - Open multiple tabs and browse; the extension tracks active time.
   - Test offline by disconnecting, then reconnect to sync.
3. **View Data**:
   - Check the popup for real-time stats.
   - Visit the dashboard to see aggregated data.

## File Changes
### Extension
- **`manifest.json`**: Defines permissions and popup.
- **`background.js`**: Implements multi-tab tracking, sync, and edge case fixes (e.g., 60s inactivity threshold).
- **`popup.html`**: Includes login and stats views with device ID.
- **`popup.js`**: Adds real-time stats refresh and sync status.
- **`popup.css`**: Enhances styling for readability.

### Backend
- **`screenTime.js`**: Defines the ScreenTime model with unique indexing.
- **`screenTimeRoutes.js`**: Handles data aggregation and deduplication.

## Testing
- **Day 49**: Tested multi-tab tracking (5–10 tabs, 15–30 minutes).
- **Day 50**: Verified multi-device aggregation (20 + 15 minutes across two devices).
- **Day 51**: Confirmed edge cases (20+ tabs, offline mode, minimal activity) with debugging fixes.

## Challenges and Fixes
- **Multi-Tab Overload**: Handled with per-tab timers and optimized storage.
- **Inactive Time Overcounting**: Adjusted with a 60-second threshold and `getLastFocused`.
- **Sync Failures**: Resolved with JWT validation and offline queue.
- **Duplicates**: Prevented with unique index and aggregation logic.

## Future Improvements
- Add tab limit warnings in the popup.
- Implement push notifications for sync success.
- Expand testing to mobile devices.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Chrome API documentation.

## Commit Message
"Integrate multi-tab tracking (Day 49), multi-device support with popup enhancements (Day 50), and edge case fixes with debugging (Day 51) for ChillBoard extension"