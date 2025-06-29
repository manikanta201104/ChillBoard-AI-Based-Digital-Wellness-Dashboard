# ChillBoard - AI-Based Digital Wellness Dashboard - Day 41

## Overview
Welcome to Day 41 of the ChillBoard project! On July 12, 2025, we conducted end-to-end testing of all pages (Profile, Settings, About/Help), ensuring functionality and integration for the demo.

## Features Tested
- **Profile Page**: Verified user details, trends, saved playlists, and Spotify linking/unlinking.
- **Settings Page**: Tested toggle adjustments, saving, and persistence in MongoDB.
- **About/Help Page**: Checked content display and contact form submission.
- **Cross-Page Testing**: Ensured navigation and links work across the app.

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
1. **Profile Test**:
   - Login and go to `/profile`.
   - Verify “User123” and trends display.
   - Link/unlink Spotify and check UI updates.
2. **Settings Test**:
   - Go to `/settings`.
   - Adjust toggles, save, and confirm in MongoDB.
   - Reload to verify persistence.
3. **About/Help Test**:
   - Visit `/about`.
   - Submit “Test User,” “test@example.com,” “Help needed” via form.
   - Check console/MongoDB for data.
4. **Cross-Page Test**:
   - Navigate via menu; click guide links.

## Testing Results
- **Profile**: User details and trends loaded; Spotify linking/unlinking worked with UI updates.
- **Settings**: Toggles saved and persisted on reload.
- **About/Help**: Content displayed; form submission logged data.
- **Cross-Page**: Navigation seamless; links prompted appropriately.

## Challenges and Fixes
- **Trend Chart Delay**: Initial load failed due to missing Chart.js data; fixed by ensuring static data mapping.
- **Form Submission Error**: Invalid email caused 500 error; added basic validation in `routes/contact.js`.
- **Navigation Glitch**: Occasional 404 on `/about`; resolved by clearing browser cache.

## Future Improvements
- Add real-time trend data from backend.
- Implement email sending for contact form.
- Enhance navigation with a persistent sidebar.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and MongoDB for testing.

## Commit Message
"Conduct end-to-end testing and fix issues across all pages on Day 41"