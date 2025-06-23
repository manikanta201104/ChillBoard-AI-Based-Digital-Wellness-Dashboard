# ChillBoard - AI-Based Digital Wellness Dashboard - Day 24

### I have worked for this setup since last 3 days

## Overview
Welcome to Day 24 of the ChillBoard project! On June 25, 2025, we enhanced the ChillBoard Dashboard by integrating a Spotify player to play mood-based playlists recommended by the system. This update makes music recommendations actionable, improving user engagement and supporting digital wellness goals. We used the React Spotify Web Playback SDK to embed the player, leveraging existing backend infrastructure for authentication and playlist data.

## Features Added
- **Spotify Player Integration**: Added a Spotify player to the Dashboard that plays playlists based on the user's mood (e.g., "Chill Vibes" for stressed users).
- **Mood-Based Playlists**: Recommendations now trigger the player with a `spotifyPlaylistId` when the type is "music," fetched from saved playlists.
- **Spotify Authentication**: Implemented a "Connect Spotify" prompt and OAuth flow to link user accounts, storing access tokens for playback.
- **Dynamic Playback**: The player auto-plays the recommended playlist and allows user control (play, pause, skip) with a wellness-themed UI.

## Setup Instructions

### Prerequisites
- Node.js and npm installed.
- MongoDB running locally or via a remote instance.
- Spotify Developer account with `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REDIRECT_URI` set as environment variables.
- Chrome extension (for screen time tracking) installed from the Chrome Web Store.

### Backend Setup
1. **Clone the Repository**:
   - Navigate to `ChillBoard/Backend/` and run `npm install` to install dependencies.
2. **Configure Environment**:
   - Create a `.env` file in `ChillBoard/Backend/` with:
     ```
     PORT=5000
     MONGO_URI=your_mongo_connection_string
     JWT_SECRET=your_jwt_secret
     SPOTIFY_CLIENT_ID=your_spotify_client_id
     SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
     SPOTIFY_REDIRECT_URI=http://localhost:5000/spotify/callback
     ```
3. **Run the Server**:
   - Execute `nodemon index.js` to start the backend on `http://localhost:5000`.

### Frontend Setup
1. **Navigate to Frontend**:
   - Go to `ChillBoard/frontend/` and run `npm install` to install dependencies, including `react-spotify-web-playback`.
2. **Configure Environment**:
   - Ensure the backend URL (`http://localhost:5000`) is used in `src/utils/api.js` for API calls.
3. **Run the App**:
   - Run `npm start` to launch the app at `http://localhost:3000`.

### Initial Data
- Sign up or log in with `email: "user@example.com"`, `password: "password123"`.
- Enable mood detection to generate mood data, or manually insert `ScreenTime` and `Mood` documents in MongoDB for testing.
- Connect Spotify via the Dashboard to enable music playback.

## Usage
1. **Access the Dashboard**:
   - Log in and navigate to `/dashboard` to view screen time, mood, and recommendations.
2. **Mood Detection**:
   - Enable the webcam to detect emotions, which triggers recommendations based on mood (e.g., "stressed" → "calm" playlist).
3. **Spotify Integration**:
   - If not connected, click "Connect Spotify" to start the OAuth flow. After authorization, the `spotifyToken` is saved.
   - For a "music" recommendation (e.g., after 5+ hours of screen time and "stressed" mood), the Spotify player loads with the playlist.
4. **Player Controls**:
   - The player auto-plays the playlist (e.g., "Chill Vibes"). Use play/pause and skip buttons to control playback.
5. **Recommendations**:
   - Accept or decline recommendations, with timers for "break" types and music playback for "music" types.

## File Changes
### Backend
- **`routes/spotify.js`**:
  - Added token refresh logic to handle expired `accessToken`s.
  - Enhanced `/playlist` to map moods to Spotify categories (e.g., "stressed" → "calm") and save playlists.
  - Updated `/login` and `/callback` to support the React Spotify Web Playback SDK with `streaming` scope.
- **`routes/auth.js`**:
  - Added a `/user` endpoint to fetch the `spotifyToken` for the frontend.
  - Maintained `/signup` and `/login` for user management.
- **`models/user.js`** (Unchanged but Referenced):
  - Uses the existing `spotifyToken` field to store access and refresh tokens.

### Frontend
- **`src/pages/Dashboard.js`**:
  - Integrated `SpotifyPlayer` from `react-spotify-web-playback` to play playlists.
  - Added state for `spotifyToken` and `currentPlaylistId`, with conditional rendering for the player or "Connect Spotify" prompt.
  - Styled the player with a wellness-themed design (light gray background, green loader).
- **`src/utils/api.js`**:
  - Added `getUser` to fetch `spotifyToken` and updated existing calls to use the JWT token.
- **`src/index.js`**:
  - No changes needed, as the SDK is an npm package.
- **`src/App.js`**:
  - No changes needed, as routing remains unaffected.

## Testing
- **Playback Test**: Generate a "music" recommendation (e.g., 5+ hours screen time, "stressed" mood) and verify the player loads and plays.
- **Authentication Test**: Disconnect the `spotifyToken` in MongoDB, check for the "Connect Spotify" prompt, and complete the OAuth flow.
- **Error Handling**: Test token expiration by setting an old `obtainedAt` date and ensure refresh works.

## Challenges and Solutions
- **Scope Reduction**: Reduced Spotify scopes to `streaming`, `user-read-private`, and `user-read-email`, resolving initial authentication issues.
- **Token Management**: Implemented token refresh to handle expiration, ensuring continuous playback.

## Future Improvements
- **Day 25**: Add custom player controls (e.g., volume slider) or multiple playlist options.
- **Token Refresh Automation**: Enhance `/spotify/callback` to periodically refresh tokens using `refreshToken`.
- **UI Enhancements**: Improve player styling or add mood-specific animations.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License (or your preferred license).

## Acknowledgements
- Thanks to the xAI team for support and the Spotify Developer Platform for the Web Playback SDK.