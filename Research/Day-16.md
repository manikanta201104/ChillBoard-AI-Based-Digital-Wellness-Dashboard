# Day 16: Save Recommendations with TriggerLink for ChillBoard

**Date**: June 13, 2025 (Completed early for June 17, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Update the `/recommendations` endpoint to save recommendations to the `Recommendation` collection and link them to a new `TriggerLink` collection.

## Task Overview
On Day 16, I updated the `/recommendations` endpoint to save generated recommendations with detailed trigger information and created a new `TriggerLink` model to link recommendations to their sources (e.g., mood, screen time). I tested the endpoint to ensure data was saved correctly.

## What Was Done
1. **Created TriggerLink Model**:
   - Added `models/triggerLink.js` to define the `TriggerLink` schema.

2. **Updated Recommendations Endpoint**:
   - Modified `routes/recommendations.js` to save recommendations with a `trigger` field (e.g., `{ screenTime: ">5h", mood: "stressed" }`).
   - Created a `TriggerLink` document after saving each recommendation.

3. **Tested the Endpoint**:
   - Used Postman to call `/recommendations` with existing test data.
   - Verified the `Recommendation` collection had the saved recommendation.
   - Confirmed the `TriggerLink` collection had a corresponding entry.

## Key Components
- **Files**:
  - `models/triggerLink.js`: New `TriggerLink` model.
  - `routes/recommendations.js`: Updated to save recommendations and create `TriggerLink` entries.
- **Features**:
  - Saves recommendations with detailed triggers.
  - Links recommendations to their sources via `TriggerLink`.

## Outcomes
- Recommendations are saved in MongoDB with trigger details.
- `TriggerLink` entries connect recommendations to their sources.
- Test confirmed the end-to-end flow works.

## Notes
- **Success**: Recommendation and `TriggerLink` saved correctly.
- **Issues**: None (or note any, e.g., “MongoDB index issue”).
- **Next Steps**: Display recommendations on Dashboard (Day 17).
- **Resources**:
  - Mongoose: `mongoosejs.com`
  - Express.js: `expressjs.com`
  - YouTube: “Mongoose Relationships” by Net Ninja (searched: “Net Ninja Mongoose”)

## Next Steps
- **Day 17**: Display recommendations on the Dashboard.
- Commit files to GitHub.
- Update Notion/Trello board.