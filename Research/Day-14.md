# Day 14: Save Mood Data to Backend for ChillBoard

**Date**: June 11, 2025 (Completed early for June 15, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Complete emotion detection by saving mood data to the backend and adding a mood correction option.

## Task Overview
On Day 14, I added a backend endpoint to save mood data, updated the frontend to send detected moods to the backend, and added a mood correction feature. I also simulated a `TriggerLink` for future recommendations.

## What Was Done
1. **Backend Endpoint**:
   - Created `POST /mood` in `routes/mood.js` to save mood data to the `Mood` collection.
   - Simulated a `TriggerLink` by logging it (to be implemented in Day 15).

2. **Frontend Update**:
   - Updated `api.js` with `saveMood` to call `POST /mood`.
   - Updated `Dashboard.js` to send detected moods every 10 seconds and allow mood correction via a dropdown.
   - Logged a `TriggerLink` in the console.

3. **Tested the Feature**:
   - Detected a mood, confirmed it was saved in MongoDB.
   - Corrected a mood, verified the corrected mood was saved.
   - Checked the `TriggerLink` log in the console.

## Key Components
- **Backend Files**:
  - `routes/mood.js`: New endpoint to save moods.
- **Frontend Files**:
  - `utils/api.js`: Added `saveMood`.
  - `pages/Dashboard.js`: Added mood saving and correction.
- **Features**:
  - Save detected moods to backend.
  - Mood correction dropdown.
  - Simulated `TriggerLink` for recommendations.

## Outcomes
- Moods are saved in MongoDB with user corrections.
- `TriggerLink` simulation prepares for recommendations.
- Emotion detection feature is fully integrated.

## Notes
- **Success**: Moods saved, correction worked, `TriggerLink` logged.
- **Issues**: None (or note any, e.g., “CORS issue”).
- **Next Steps**: Add recommendations (Day 15).
- **Resources**:
  - Axios: `axios-http.com`
  - Mongoose: `mongoosejs.com`
  - YouTube: “React Axios Tutorial” by Traversy Media (searched: “Traversy Media Axios”)

## Next Steps
- **Day 15**: Add recommendations based on mood and screen time.
- Commit files to GitHub.
- Update Notion/Trello board.