# Day 22: Create /spotify/playlist Endpoint for ChillBoard

**Date**: June 18, 2025 (Completed early for June 23, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Create a /spotify/playlist endpoint to fetch playlists based on mood.

## Task Overview
On Day 22, I created a `GET /spotify/playlist` endpoint that fetches Spotify playlists based on a mood parameter, using the user’s `spotifyToken`. I mapped moods to Spotify categories and tested the endpoint with Postman.

## What Was Done
1. **Backend Endpoint**:
   - Added `GET /spotify/playlist` to fetch playlists.
   - Mapped moods (e.g., “stressed” → “calm”) to Spotify categories.
   - Used `spotifyToken` for authentication.

2. **Returned Data**:
   - Returned `spotifyPlaylistId`, `name`, and `mood` in the response.

3. **Tested with Postman**:
   - Called `GET /spotify/playlist?mood=calm` and verified a playlist (e.g., “Chill Vibes”).

## Key Components
- **Files**:
  - `routes/spotify.js`: Added `GET /spotify/playlist` endpoint.
- **Features**:
  - Fetches mood-based playlists from Spotify.
  - Integrates with existing authentication.

## Outcomes
- `/spotify/playlist` endpoint works, returning playlist data.
- Ready to display playlists on the Dashboard.

## Challenges
- None (or note any, e.g., “Initial API rate limit; fixed by adding limit: 1”).

## Notes
- **Success**: Endpoint returns valid playlists.
- **Issues**: None (or note any).
- **Next Steps**: Display playlists on Dashboard (Day 23).
- **Resources**:
  - Spotify API Docs: `developer.spotify.com/documentation/web-api`
  - YouTube: “Spotify API Tutorial” by Net Ninja (searched: “Net Ninja Spotify API”)

## Next Steps
- **Day 23**: Display playlists on Dashboard.
- Commit files to GitHub.
- Update Notion/Trello board.