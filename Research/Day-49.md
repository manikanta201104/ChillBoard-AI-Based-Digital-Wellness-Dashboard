# ChillBoard - AI-Based Digital Wellness Dashboard - Day 49

## Overview
Welcome to Day 49 of the ChillBoard project! On July 20, 2025, we tested the Chrome extension’s screen time tracking with multiple tabs on a single device, ensuring accurate data collection and successful synchronization to the MongoDB backend. This test validated the core tracking logic essential for ChillBoard’s analytics and recommendations.

## Features Tested
- **Screen Time Tracking**: Verified total time across 5–10 tabs over 15–30 minutes, accounting for active usage with an inactivity threshold.
- **Tab Usage Tracking**: Confirmed per-tab time logs with domain-level URLs (e.g., "youtube.com" instead of full URLs).
- **Sync Test**: Ensured data syncs to the MongoDB ScreenTime collection every 5 minutes using the logged-in user’s JWT token, with offline queue handling.

## Why This Task Matters for ChillBoard
ChillBoard’s mission is to combat digital fatigue with AI-driven wellness tools, relying on precise screen time data to power its dashboard analytics, mood-based recommendations, and gamified challenges. Testing multi-tab tracking ensures:
- **Accuracy**: Reflects real-world multitasking (e.g., YouTube, Google Docs) for reliable trends and progress bars.
- **Engagement**: Supports challenge goals (e.g., 420-minute reduction) with dynamic updates.
- **Integration**: Validates backend sync, enabling multi-device scalability.
- **Privacy**: Confirms domain-level tracking aligns with privacy policies.
- **Demo Readiness**: Proves the technical foundation for evaluators.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- `.env` file with `MONGO_URI`, `JWT_SECRET`, and CORS configured (from Day 24).
- Backend running on `http://localhost:5000` (see Day 24 README).
- Chrome browser with Developer Mode enabled.

### Extension Setup
1. Navigate to `ChillBoard/extension/` (created on Day 4) and run `npm install` if dependencies exist.
2. Open `chrome://extensions/`, enable “Developer mode,” and load the unpacked extension folder.
3. Clear `chrome.storage.local` via DevTools (“Application” tab) to start with a fresh state.

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure the `/screen-time` endpoint accepts POST requests with `{ totalTime, tabs, userId }` using JWT authentication.
3. Implement a `/ping` endpoint for server availability checks.
4. Run `nodemon index.js` to start the server.

## Usage
1. **Test Screen Time**:
   - Open 5–10 tabs (e.g., YouTube, Google Docs, Twitter) and browse actively for 15–30 minutes.
   - Switch tabs frequently to simulate varied usage patterns.
2. **Check Tab Usage**:
   - Inspect `chrome.storage.local.tabs` via DevTools for domain-level entries matching activity.
3. **Verify Sync**:
   - After 10 minutes, check the MongoDB ScreenTime collection (e.g., via MongoDB Compass) for data entries.

## File Changes
### Extension
- **`manifest.json`**: Maintained permissions and structure for tracking and sync.
- **`background.js`**: Enhanced for multi-tab tracking with per-tab timers, added inactivity threshold (30 seconds), improved debugging with timestamps, and optimized sync with alarms and intervals.

## Testing
- **Screen Time Test**: Confirmed `totalTime` in `chrome.storage.local` matched active duration (±10% margin, e.g., 25–28 minutes for 30 minutes of use).
- **Tab Usage Test**: Verified `tabs` array reflected activity (e.g., more time on YouTube if a video was watched).
- **Sync Test**: Ensured MongoDB updates every 5 minutes, with offline data queued and synced on reconnection.

## Challenges and Fixes
- **Multi-Tab Accuracy**: Initial single-tab tracking was replaced with `tabTimers` to handle concurrent tabs.
- **Idle Detection**: Added a 30-second threshold to exclude inactive time, preventing overcounting.
- **Sync Reliability**: Added a fallback `setInterval` (commented out) alongside alarms to ensure consistent syncs.
- **Debugging**: Timestamps in logs helped identify a sync delay, fixed by adjusting alarm periodicity.

## Future Improvements
- Add a real-time popup UI to display tracking stats.
- Implement tab grouping for enhanced analytics.
- Test extension on multiple devices for cross-platform validation.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Chrome API documentation.

## Commit Message
"Test Chrome extension with multiple tabs and sync to MongoDB on Day 49"