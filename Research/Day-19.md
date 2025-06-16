# Day 19: Track User Interaction with Recommendations for ChillBoard

**Date**: June 15, 2025 (Completed early for June 20, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Add user interaction to track if users follow recommendations by updating the `accepted` field.

## Task Overview
On Day 19, I added “Accept” and “Decline” buttons to the Dashboard, created a `PATCH /recommendations/:id` endpoint to update the `accepted` field, and tested the functionality to ensure user actions are recorded in MongoDB.

## What Was Done
1. **Updated Dashboard**:
   - Added “Accept” and “Decline” buttons to the recommendation card.
   - Integrated API calls to update the `accepted` field on button clicks.

2. **Created PATCH Endpoint**:
   - Added `PATCH /recommendations/:id` to update the `accepted` field in the `Recommendation` collection.

3. **Tested the Feature**:
   - Generated a recommendation, clicked “Accept,” and verified `accepted: true` in MongoDB.
   - Repeated with “Decline,” confirming `accepted: false`.

## Key Components
- **Frontend Files**:
  - `utils/api.js`: Added `updateRecommendation` function.
  - `pages/Dashboard.js`: Added “Accept” and “Decline” buttons.
- **Backend Files**:
  - `routes/recommendations.js`: Added `PATCH /:id` route.
- **Features**:
  - Users can accept or decline recommendations.
  - `accepted` field updates in MongoDB based on user actions.

## Outcomes
- Dashboard now allows users to interact with recommendations.
- `accepted` field updates correctly in MongoDB.
- Feature provides feedback for future improvements.

## Notes
- **Success**: User interactions are tracked successfully.
- **Issues**: None (or note any, e.g., “API error handling issue”).
- **Next Steps**: Add Spotify integration (Day 20).
- **Resources**:
  - Axios: `axios-http.com`
  - Express.js: `expressjs.com`
  - YouTube: “React API Calls” by Net Ninja (searched: “Net Ninja React API”)

## Next Steps
- **Day 20**: Add Spotify integration for mood-based playlists.
- Commit files to GitHub.
- Update Notion/Trello board.