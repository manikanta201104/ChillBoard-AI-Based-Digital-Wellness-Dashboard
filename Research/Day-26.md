# ChillBoard - AI-Based Digital Wellness Dashboard - Day 26

## Overview
Welcome to Day 26 of the ChillBoard project! On June 27, 2025, we conducted a comprehensive end-to-end test of the Spotify integration, ensuring seamless functionality from account connection to playlist playback, saving, and skipping. This validates the key music feature, enhancing ChillBoard’s digital wellness capabilities.

## Features Tested
- **Spotify Account Connection**: Verified the `/spotify/login` OAuth flow and token storage.
- **Music Recommendation**: Confirmed mood-based playlist generation (e.g., “stressed” → “calm”).
- **Playlist Playback**: Ensured playlists fetch and play in the Dashboard’s Spotify player.
- **Save Functionality**: Tested saving a playlist and updating the `saved` field in the `Playlist` collection.
- **Skip Functionality**: Verified skipping loads a new playlist with the same mood.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- Spotify credentials in `.env` (from Day 24).
- Frontend and backend running (see Day 24 README).

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Update `.env` with your MongoDB URI and Spotify credentials.
3. Run `nodemon index.js` to start the server.

### Frontend Setup
1. Navigate to `ChillBoard/frontend/` and run `npm install`.
2. Ensure `react-spotify-web-playback` is installed.
3. Run `npm start` to launch the app.

### Initial Data
- Log in with `email: "user@example.com"`, `password: "password123"`.
- Insert test `ScreenTime` (e.g., `totalTime: 18000`) and `Mood` (e.g., `mood: "stressed"`) documents if needed.

## Usage
1. **Connect Spotify**:
   - Log in and click “Connect Spotify” on the Dashboard, completing the OAuth flow.
2. **Generate Recommendation**:
   - Enable mood detection to trigger a “music” recommendation (e.g., “stressed”).
3. **Play and Save**:
   - Verify the playlist plays, click “Save,” and check MongoDB for `saved: true`.
4. **Skip**:
   - Click “Skip” and confirm a new playlist loads and plays.
5. **Review Logs**:
   - Check `ChillBoard/Backend/index.js` logs for errors or successes.

## File Changes
### Backend
- **`routes/spotify.js`**:
  - Added debug logs to track token refresh and playlist fetching.
- **`models/playlist.js`** (Unchanged but Referenced):
  - Used for verifying `saved` field updates.

### Frontend
- **`src/pages/Dashboard.js`**:
  - Added console logs for debugging playback and API calls.

## Testing
- **Connection Test**: Confirm the OAuth flow completes and `spotifyToken` is set.
- **Recommendation Test**: Verify a “calm” playlist loads for “stressed” mood.
- **Playback Test**: Ensure the player plays tracks without errors.
- **Save Test**: Check `saved: true` in MongoDB after saving.
- **Skip Test**: Confirm a new playlist loads and plays.
- **Debug Test**: Simulate token expiration by updating `obtainedAt` and verify refresh.

## Challenges and Solutions
- **Token Expiration**: Tested refresh logic, ensuring playback continues after expiration.
- **Playlist Fetch Failures**: Adjusted mood mapping if no playlists were found, logging API errors.

## Future Improvements
- Add a “Saved Playlists” view on the Dashboard.
- Implement playlist uniqueness on skip.
- Enhance error messages for user feedback.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Spotify for the Web Playback SDK.