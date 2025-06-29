# ChillBoard - AI-Based Digital Wellness Dashboard - Day 37

## Overview
Welcome to Day 37 of the ChillBoard project! On July 08, 2025, we created the Settings page with toggles for webcam, notifications, and challenge visibility, enhancing user control.

## Features Added
- **Settings Page**: Added a `/settings` route with a layout for webcam, notification, and challenge visibility settings.
- **Toggles and Inputs**: Included “Enable Webcam for Mood Detection” (off by default), “Notification Frequency” dropdown (Off, Every 2 hours, Every 4 hours), and “Show My Name on Leaderboard” toggle (on by default with anonymous option).
- **Styling**: Applied Tailwind CSS with a gray background and white toggles for a functional design.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- `.env` with `MONGO_URI`, `JWT_SECRET`, and other credentials (from Day 24).
- Frontend and backend running (see Day 24 README).

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure `type: module` is set in `package.json`.
3. Run `nodemon index.js` to start the server.

### Frontend Setup
1. Navigate to `ChillBoard/frontend/` and run `npm install`.
2. Run `npm start` to launch the app at `http://localhost:3000`.

## Usage
1. **Navigate to Settings**:
   - Login with a test user.
   - Go to `http://localhost:3000/settings`.
   - Verify “Settings” heading, webcam toggle (off), notification dropdown (Off), and leaderboard toggle (on) display.
2. **Test Interactions**:
   - Toggle webcam on/off; expect state change.
   - Select “Every 2 hours” in dropdown; verify selection updates.
   - Toggle leaderboard off; expect anonymous note appears.
3. **Check Styling**:
   - Ensure gray background and white toggle containers.

## File Changes
### Frontend
- **`src/App.js`**: Updated routing to include `/settings` route.
- **`src/pages/Settings.js`**: Created with toggle and dropdown controls, styled with Tailwind CSS.

## Testing
- **Navigation Test**: Access `/settings` after login; expect page load without errors.
- **Toggle Test**: Verify webcam and leaderboard toggles change state.
- **Dropdown Test**: Check notification frequency updates on selection.
- **Styling Test**: Confirm gray theme and responsiveness.
- **Auth Test**: Log out; expect redirect or access denial (if protected).

## Challenges and Solutions
- **Initial State**: Ensured default values (webcam off, notifications off, leaderboard on) are clear.
- **UI Consistency**: Aligned toggle and dropdown styling with Tailwind defaults.

## Future Improvements
- Add backend endpoint to save settings (e.g., POST `/settings`).
- Implement real-time UI updates based on saved preferences.
- Add confirmation dialogs for sensitive changes (e.g., webcam toggle).

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Tailwind CSS for styling.

## Commit Message
"Add Settings page with toggles for webcam, notifications, and challenge visibility on Day 37"