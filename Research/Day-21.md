# Day 21: Set Up Spotify API Authentication for ChillBoard

**Date**: June 18, 2025 (Completed early for June 22, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Set up Spotify API authentication in the backend to connect user accounts.

## Task Overview
On Day 21, I set up Spotify API authentication using the Authorization Code Flow. I created `/spotify/login` and `/spotify/callback` endpoints, installed the `spotify-web-api-node` package, and stored Spotify access tokens in the `User` collection. The task was completed successfully with the access token saved in MongoDB.

## What Was Done
1. **Spotify Developer Dashboard Setup**:
   - Configured the app with redirect URI `http://127.0.0.1:5000/spotify/callback`.
   - Noted client ID and client secret.

2. **Backend Setup**:
   - Installed `spotify-web-api-node@5.0.2`.
   - Added Spotify credentials to `.env`.
   - Updated `User` model with `spotifyToken` field.
   - Created `/spotify/login` to initiate OAuth flow.
   - Created `/spotify/callback` to handle redirect and save tokens.

3. **Tested OAuth Flow**:
   - Called `/spotify/login` from the Dashboard, completed authorization, and verified the access token in MongoDB.

## Key Components
- **Files**:
  - `models/user.js`: Added `spotifyToken` field.
  - `routes/spotify.js`: Added OAuth endpoints.
  - `index.js`: Mounted Spotify routes.
- **Features**:
  - Users can connect their Spotify accounts.
  - Access and refresh tokens are stored securely.

## Outcomes
- Backend now supports Spotify OAuth.
- Access tokens are saved in the `User` collection (e.g., `userId: "6847a8a8e573f7060ec30f3c"`).
- Ready for playlist fetching based on mood.

## Challenges
- **Redirect URI Issue**: Initially used `http://localhost:5000/spotify/callback`, which is not allowed by Spotify. Solved by updating to `http://127.0.0.1:5000/spotify/callback` to comply with Spotify’s loopback address requirements, ensuring consistency across the Spotify Developer Dashboard and `.env`.
- **Authorization Header Error**: Encountered `Authorization header missing or malformed` when calling `/spotify/login` directly in the browser. Solved by using `axios` to call `/spotify/login` with the JWT from `localStorage` and redirecting to the Spotify authorization URL from the response, replacing the initial `window.location.href` approach.
- **User Not Found Error**: Encountered `User not found` in `/spotify/callback` due to the `userId` not matching any document in MongoDB. Solved by verifying the user exists (e.g., logging in or signing up with `userId: "6847a8a8e573f7060ec30f3c"`) before initiating the OAuth flow and adding a pre-check in the callback endpoint.
- **Invalid Grant Error**: Encountered `invalid_grant` due to an expired or reused authorization code, likely from a previous failed attempt. Solved by ensuring the redirect URI was consistent, restarting the OAuth flow, and adding error handling in `/spotify/callback` to distinguish between `invalid_grant` and other errors.

## Notes
- **Success**: OAuth flow works, tokens are stored (e.g., access token obtained at `1750222773123`).
- **Issues**: None remaining after fixes.
- **Next Steps**: Fetch Spotify playlists based on mood (Day 22).
- **Resources**:
  - Spotify Developer Dashboard: `developer.spotify.com`
  - `spotify-web-api-node`: `npmjs.com/package/spotify-web-api-node`
  - YouTube: “Spotify API OAuth” by Traversy Media (searched: “Traversy Media Spotify API”)

## Next Steps
- **Day 22**: Fetch Spotify playlists based on mood.
- Commit files to GitHub.
- Update Notion/Trello board.