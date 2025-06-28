# ChillBoard - AI-Based Digital Wellness Dashboard - Day 36

## Overview
Welcome to Day 36 of the ChillBoard project! On July 07, 2025, we enhanced the Profile page by adding saved Spotify playlists and account linking/unlinking functionality, deepening personalization.

## Features Added
- **Backend Endpoint**: Created GET `/user/playlists` to fetch saved playlists with `name`, `mood`, and `spotifyPlaylistId`.
- **Frontend Update**: Added a “Saved Playlists” section on the Profile page, displaying playlists with Spotify links, a “Link Spotify Account” button if no `spotifyToken`, and an “Unlink Spotify” button if linked.
- **Backend Update**: Implemented DELETE `/spotify/unlink` to remove `spotifyToken` and clear saved playlists.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- `.env` with `MONGO_URI`, `JWT_SECRET`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REDIRECT_URI` (from Day 21).
- Frontend and backend running (see Day 24 README).

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure `type: module` is set in `package.json`.
3. Update `index.js` to include `routes/user.js` and `routes/spotify.js`:
   ```javascript
   import userRoutes from './routes/user.js';
   import spotifyRoutes from './routes/spotify.js';
   app.use('/user', userRoutes);
   app.use('/spotify', spotifyRoutes);
   ```
4. Run `nodemon index.js` to start the server.

### Frontend Setup
1. Navigate to `ChillBoard/frontend/` and run `npm install`.
2. Run `npm start` to launch the app at `http://localhost:3000`.

## Usage
1. **Insert Test Data**:
   - Add a `User` with `userId` and a `Playlist` with `userId`, `name: "Chill Vibes"`, `mood: "Calm"`, `spotifyPlaylistId: "1IvEH3HDObcFnkFW6zeWvM"`, and `saved: true`.
2. **Test Profile Page**:
   - Login and go to `http://localhost:3000/profile`.
   - Verify “Saved Playlists” shows “Chill Vibes - Calm” with a Spotify link.
   - If no `spotifyToken`, click “Link Spotify Account”; expect redirect to Spotify login.
   - If linked, click “Unlink Spotify”; expect token removal and playlist clearance.
3. **Check MongoDB**:
   - Confirm `spotifyToken` updates and `Playlist` entries reflect linking/unlinking.

## File Changes
### Backend
- **`routes/user.js`**: Added GET `/user/playlists` to fetch saved playlists.
- **`routes/spotify.js`**: Added DELETE `/spotify/unlink` to manage account removal.
- **`index.js`**: Updated to include new routes.

### Frontend
- **`src/pages/Profile.js`**: Updated to display saved playlists and handle Spotify linking/unlinking.
- **`src/utils/api.js`**: Added `getUserPlaylists` function.

## Testing
- **Playlist Test**: Verify “Saved Playlists” displays correctly with links.
- **Link Test**: Click “Link Spotify Account”; expect successful redirect and token save.
- **Unlink Test**: Click “Unlink Spotify”; expect token removal and UI update.
- **Auth Test**: Test without JWT; expect `401` on both endpoints.
- **Error Test**: Simulate API failure; expect error messages.

## Challenges and Solutions
- **Token Sync**: Initial delay in UI update after unlinking; resolved by refreshing state immediately.
- **Playlist Fetch**: Empty response if no saved playlists; handled with a “No saved playlists yet” message.

## Future Improvements
- Add playlist playback directly from the Profile page.
- Implement real-time playlist updates with WebSocket.
- Enhance unlink process with confirmation dialog.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Spotify for API integration.

## Commit Message
"Add saved Spotify playlists and account linking/unlinking to Profile page on Day 36"