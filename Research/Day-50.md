# ChillBoard - AI-Based Digital Wellness Dashboard - Day 50

## Overview
Welcome to Day 50 of the ChillBoard project! On July 21, 2025, we tested the Chrome extension’s tracking across multiple devices with the same user account, ensuring accurate data aggregation. Additionally, we enhanced the popup interface to reflect real-time stats and device information.

## Features Tested
- **Multi-Device Tracking**: Verified screen time and tab usage across two devices with overlapping sessions.
- **Data Aggregation**: Confirmed MongoDB and the Dashboard reflect combined usage data.
- **Popup Enhancements**: Added real-time stats refresh, device identifier, and sync status display.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- `.env` with `MONGO_URI`, `JWT_SECRET`, and CORS configured (from Day 24).
- Backend running (e.g., `http://localhost:5000` or deployed server).
- Chrome browser with Developer Mode enabled on two devices.

### Extension Setup
1. On both devices, navigate to `ChillBoard/extension/`, open `chrome://extensions/`, enable “Developer mode,” and load the unpacked folder.
2. Clear `chrome.storage.local` on both devices via DevTools (“Application” tab).
3. Ensure `popup.html`, `popup.js`, `popup.css`, and updated `background.js` are in the extension directory.

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure `/screen-time` endpoint aggregates `totalTime` and `tabs` by `userId`.
3. Run `nodemon index.js` to start the server.

## Usage
1. **Setup Authentication**:
   - Log in on the first device, copy the JWT token, and set it on the second device.
2. **Test Tracking**:
   - First device: Browse 3 tabs (YouTube, Google, Twitter) for 20 minutes.
   - Second device: Browse 2 tabs (Gmail, Wikipedia) for 15 minutes with a 5-minute overlap.
3. **Check Aggregation**:
   - Inspect MongoDB’s ScreenTime collection.
   - Verify Dashboard data on `http://localhost:3000/dashboard`.
4. **Monitor Popup**:
   - Click the extension icon on both devices to view real-time stats and device info.

## File Changes
### Extension
- **`popup.html`**: Added device ID and sync status display.
- **`popup.js`**: Implemented real-time stats refresh and sync status check.
- **`popup.css`**: Enhanced styling for better readability.
- **`background.js`**: Added sync status message handler.

## Testing
- **Multi-Device Test**: Confirm sync from both devices within 5–10 minutes.
- **Aggregation Test**: Verify `totalTime` (~30 minutes) and `tabs` match usage (±10%).
- **Dashboard Test**: Ensure charts reflect combined data.
- **Popup Test**: Check real-time updates and device identification.

## Challenges and Fixes
- **Overlap Handling**: May require backend logic to adjust for concurrent sessions.
- **Sync Delays**: Adjusted interval monitoring if data lags.
- **Popup Refresh**: Ensured 10-second interval doesn’t overwhelm storage.

## Future Improvements
- Add device-specific tab breakdowns in the popup.
- Implement push notifications for sync success.
- Test with more devices.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Chrome API documentation.

## Commit Message
"Test Chrome extension across multiple devices with data aggregation and enhance popup on Day 50"