# ChillBoard - AI-Based Digital Wellness Dashboard - Day 25

## Overview
Welcome to Day 25 of the ChillBoard project! On June 26, 2025, we enhanced the Spotify player on the Dashboard by adding "Save" and "Skip" buttons, allowing users to personalize their music experience based on mood-based recommendations. This update modifies the `Playlist` collection in MongoDB to track saved playlists and enables fetching new playlists on skip, improving user control and engagement.

## Features Added
- **Save Playlist**: Users can save a playlist they enjoy, updating its `saved` field to `true` in the `Playlist` collection via a `PATCH /playlists/:id` request.
- **Skip Playlist**: Users can skip an unsuitable playlist, triggering a new playlist fetch with the same mood via a `GET /spotify/playlist` call, and the player updates accordingly.
- **User Interface**: Added "Save" and "Skip" buttons next to the Spotify player for intuitive interaction.

## Setup Instructions

### Prerequisites
- Node.js and npm installed.
- MongoDB running locally or via a remote instance.
- Spotify Developer account credentials (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`) set as environment variables.
- ChillBoard Chrome extension installed for screen time tracking.

### Backend Setup
1. **Clone the Repository**:
   - Navigate to `ChillBoard/Backend/` and run `npm install` to install dependencies.
2. **Configure Environment**:
   - Create or update a `.env` file in `ChillBoard/Backend/` with:
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
   - Go to `ChillBoard/frontend/` and run `npm install` to install dependencies, ensuring `react-spotify-web-playback` is included.
2. **Configure Environment**:
   - Verify the backend URL (`http://localhost:5000`) is set in `src/utils/api.js` for API calls.
3. **Run the App**:
   - Run `npm start` to launch the app at `http://localhost:3000`.

### Initial Data
- Sign up or log in with `email: "user@example.com"`, `password: "password123"`.
- Enable mood detection via the Dashboard to generate mood data, or manually insert `ScreenTime` and `Mood` documents in MongoDB for testing.
- Connect Spotify via the Dashboard to enable music playback.

## Usage
1. **Access the Dashboard**:
   - Log in and navigate to `/dashboard` to view screen time, mood, and recommendations.
2. **Trigger a Music Recommendation**:
   - Enable mood detection (e.g., detect “stressed” after 5+ hours of screen time) to load a playlist like “Chill Vibes.”
3. **Save a Playlist**:
   - Click the "Save" button next to the player to mark the current playlist as saved. A success message will appear if successful.
4. **Skip a Playlist**:
   - Click the "Skip" button to load a new playlist with the same mood. The player will update to the new playlist.
5. **Verify Changes**:
   - Check the Dashboard UI for updates and use a MongoDB client to confirm the `saved` field changes in the `Playlist` collection.

## File Changes
### Backend
- **`routes/spotify.js`**:
  - Added a `PATCH /playlists/:id` endpoint to update the `saved` field of a playlist document based on the `spotifyPlaylistId`.
  - Ensured the existing `GET /playlist` endpoint supports fetching new playlists for the skip functionality.
- **`models/playlist.js`** (Unchanged but Referenced):
  - Utilizes the existing schema with `userId`, `spotifyPlaylistId`, `name`, `mood`, and `saved` fields.

### Frontend
- **`src/pages/Dashboard.js`**:
  - Added "Save" and "Skip" buttons below the `SpotifyPlayer` component.
  - Implemented `handleSavePlaylist` to send a PATCH request to `/playlists/:id` and `handleSkipPlaylist` to fetch a new playlist.
  - Updated state to manage the current playlist’s ID and name.
- **`src/utils/api.js`**:
  - Added `savePlaylist` for the PATCH request to update a playlist.
  - Added `fetchNewPlaylist` to call `/spotify/playlist` with the current mood.

## Testing
- **Save Playlist Test**:
  - Load a music recommendation (e.g., “stressed” mood).
  - Click "Save" and verify the `saved` field in MongoDB changes to `true` for the corresponding `spotifyPlaylistId`.
  - Check the Dashboard for a success message or error if it fails.
- **Skip Playlist Test**:
  - With a playlist playing, click "Skip" and ensure a new `spotifyPlaylistId` loads and plays (verify via the player’s track name).
  - Confirm the new playlist matches the current mood (e.g., “calm” for “stressed”).
- **Error Handling Test**:
  - Test with no detected mood or an invalid `spotifyPlaylistId` to ensure error messages appear (e.g., “No mood detected” or “Failed to fetch new playlist”).
  - Simulate an expired token by updating the `obtainedAt` field in the `User` collection and verify token refresh works.

## Challenges and Solutions
- **Duplicate Playlists on Skip**: Ensured `/spotify/playlist` fetches a new playlist by relying on Spotify’s search API with a `limit: 1`, accepting potential duplicates as a minor trade-off for simplicity.
- **State Synchronization**: Handled playlist updates in React state to prevent UI mismatches, using `setCurrentPlaylist` to refresh the player.

## Future Improvements
- **Saved Playlists View**: Add a section on the Dashboard to display saved playlists.
- **Skip Uniqueness**: Enhance `/spotify/playlist` to exclude previously skipped or saved playlists.
- **Token Refresh Automation**: Implement periodic token refresh using the `refreshToken` to avoid manual reconnection.

## Contributors
- Manikanta Mettu - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and the Spotify Developer Platform for the Web Playback SDK.