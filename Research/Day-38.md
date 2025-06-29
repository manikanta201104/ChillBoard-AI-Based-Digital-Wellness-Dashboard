# ChillBoard - AI-Based Digital Wellness Dashboard - Day 38

## Overview
Welcome to Day 38 of the ChillBoard project! On July 09, 2025, we implemented the ability to save settings to the User collection’s preferences field, enhancing personalization.

## Features Added
- **Backend Endpoint**: Created POST `/settings` to update the `preferences` field with `{ webcamEnabled, notifyEvery, showOnLeaderboard }`.
- **Frontend Update**: Added a “Save” button to the Settings page, sending toggle values to `/settings` and displaying success/error messages.
- **Persistence**: Ensured settings persist in MongoDB and reload correctly on the Settings page.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- `.env` with `MONGO_URI`, `JWT_SECRET`, and other credentials (from Day 24).
- Frontend and backend running (see Day 24 README).

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure `type: module` is set in `package.json`.
3. Update `index.js` to include `routes/settings.js` (see file changes).
4. Run `nodemon index.js` to start the server.

### Frontend Setup
1. Navigate to `ChillBoard/frontend/` and run `npm install`.
2. Run `npm start` to launch the app at `http://localhost:3000`.

## Usage
1. **Navigate to Settings**:
   - Login with a test user.
   - Go to `http://localhost:3000/settings`.
   - Adjust toggles (e.g., webcam on, notifications “4h”, leaderboard off).
2. **Save Settings**:
   - Click “Save”; expect “Settings saved successfully” message.
   - Check MongoDB `User` collection for updated `preferences` field.
3. **Reload Test**:
   - Refresh the page; verify toggles match saved values.
4. **Error Test**:
   - Simulate API failure (e.g., disconnect MongoDB); expect error message.

## File Changes
### Backend
- **`routes/settings.js`**: Added POST `/settings` to update user preferences.
- **`index.js`**: Updated to include `settingsRoutes`.

### Frontend
- **`src/pages/Settings.js`**: Added “Save” button and persistence logic.

## Testing
- **Save Test**: Verify toggles save to MongoDB after clicking “Save”.
- **Reload Test**: Check toggles retain saved state on page reload.
- **Error Test**: Ensure error handling works with invalid requests.
- **Auth Test**: Test without JWT; expect `401`.

## Challenges and Solutions
- **Initial Fetch**: Handled cases where `preferences` might be undefined with default values.
- **UI Feedback**: Added a temporary success message to confirm save action.

## Future Improvements
- Add real-time settings sync across pages.
- Implement validation for `notifyEvery` values.
- Add a “Reset to Default” button.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and MongoDB for persistence.

## Commit Message
"Add settings persistence to User collection with Save button on Day 38"