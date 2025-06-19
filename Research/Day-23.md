# Day 23: Save Spotify Playlists and Link to Recommendations for ChillBoard

**Date**: June 18, 2025 (Completed early for June 24, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Save Spotify playlist data to the Playlist collection and link it to recommendations.

## Task Overview
On Day 23, I updated the `/spotify/playlist` endpoint to save fetched playlists to the `Playlist` collection and modified the `/recommendations` endpoint to include `spotifyPlaylistId` in music recommendations, linking them via `TriggerLink`.

## What Was Done
1. **Created Playlist Model**:
   - Defined a schema with `userId`, `spotifyPlaylistId`, `name`, `mood`, `timestamp`, and `saved`.

2. **Updated /spotify/playlist**:
   - Added logic to save playlists to the `Playlist` collection.

3. **Updated /recommendations**:
   - Included `spotifyPlaylistId` in music recommendations.
   - Created `TriggerLink` entries for music suggestions.

4. **Tested**:
   - Called `/spotify/playlist` and verified a playlist was saved.
   - Generated a recommendation and confirmed the link via `Recommendation` and `TriggerLink`.

## Key Components
- **Files**:
  - `models/playlist.js`: New playlist schema.
  - `routes/spotify.js`: Updated to save playlists.
  - `routes/recommendations.js`: Updated to include playlists.
- **Features**:
  - Playlists are saved and linked to recommendations.

## Outcomes
- Playlists are stored in MongoDB.
- Recommendations are linked to playlists via `TriggerLink`.
- Ready to display playlists on the Dashboard.

## Challenges
- None (or note any, e.g., “Duplicate playlist issue; fixed by checking `spotifyPlaylistId`”).

## Notes
- **Success**: Playlists saved and linked successfully.
- **Issues**: None (or note any).
- **Next Steps**: Display playlists on Dashboard (Day 24).
- **Resources**:
  - Mongoose Docs: `mongoosejs.com`
  - YouTube: “MongoDB Schema Design” by freeCodeCamp (searched: “freeCodeCamp MongoDB Schema”)

## Next Steps
- **Day 24**: Display playlists on Dashboard.
- Commit files to GitHub.
- Update Notion/Trello board.