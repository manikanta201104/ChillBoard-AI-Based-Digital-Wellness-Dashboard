# ChillBoard - AI-Based Digital Wellness Dashboard - Day 27

## Overview
Welcome to Day 27 of the ChillBoard project! On June 28, 2025, we implemented caching in the `/spotify/playlist` endpoint to handle Spotify API rate limits, storing playlists in the `Playlist` collection for 24 hours. We re-tested the integration to ensure reliability under heavy usage, enhancing ChillBoard’s scalability for digital wellness.

## Features Added
- **Playlist Caching**: Added logic to check for existing playlists within 24 hours before calling the Spotify API, reducing rate limit hits.
- **Re-Testing**: Verified caching prevents repeated API calls and maintains playback functionality.

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
- Insert a test `ScreenTime` and `Mood` if needed (e.g., `mood: "stressed"`).

## Usage
1. **Trigger a Recommendation**:
   - Enable mood detection on the Dashboard to generate a “music” recommendation (e.g., “calm” for “stressed”).
2. **Test Caching**:
   - Use Postman to send 10 requests to `/spotify/playlist?mood=calm` in quick succession.
   - Verify playback works with the cached playlist on the Dashboard.
3. **Monitor API Calls**:
   - Check Spotify’s Developer Dashboard for API call counts (expect ≤1 call).
4. **Document**:
   - Add to your report: “Implemented caching to handle Spotify API rate limits.”

## File Changes
### Backend
- **`routes/spotify.js`**:
  - Added caching logic to `/playlist`, checking for playlists within 24 hours.
  - Enhanced logging for cache hits and misses.

### Frontend
- No changes required (uses existing `/spotify/playlist` calls).

## Testing
- **Caching Test**: Send multiple requests with the same mood and confirm only one API call via Spotify logs.
- **Playback Test**: Verify the cached playlist plays correctly in the Dashboard player.
- **Edge Case Test**: Test with an expired cache (e.g., set `createdAt` to 25 hours ago) to ensure a new fetch occurs.

## Challenges and Solutions
- **Cache Staleness**: Set a 24-hour TTL to balance freshness and rate limit avoidance.
- **API Call Detection**: Used Spotify logs to confirm caching, adjusting query logic if needed.

## Future Improvements
- Add a configurable TTL for caching (e.g., via environment variables).
- Implement cache invalidation for saved playlists.
- Enhance logging for cache performance metrics.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Spotify for the Web Playback SDK.