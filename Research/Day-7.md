# Day 7: MongoDB Models for ChillBoard

**Date**: June 07, 2025 (Completed early for June 08, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Define MongoDB models for `User`, `ScreenTime`, and `TriggerLink`, and test with a `/test-user` endpoint.

## Task Overview
On Day 7, I defined Mongoose schemas for `User`, `ScreenTime`, and `TriggerLink` in `Backend/models/`, using production-grade practices. I also added a temporary `POST /test-user` endpoint to test the `User` model by saving a test user and verifying it in MongoDB.

## What Was Done
1. **Created Models**:
   - **User**: `userId`, `username`, `email`, `password`, `spotifyToken`, `preferences`, `createdAt`.
   - **ScreenTime**: `screenTimeId`, `userId` (ref to `User`), `date`, `totalTime`, `tabs`, `timestamp`.
   - **TriggerLink**: `fromSource`, `recommendationId`, `timestamp`, `note`.
   - Used `ObjectId` references (e.g., `userId` in `ScreenTime`).
   - Added validation, indexes, and `timestamps`.

2. **Added /test-user Endpoint**:
   - Created `routes/test.js` with `POST /test-user`.
   - Saves a user with fields like `username`, `email`, `password`.

3. **Tested the Models**:
   - Sent `POST http://localhost:5000/test-user` in Postman:
     ```json
     {
       "username": "testuser",
       "email": "test@example.com",
       "password": "test123"
     }
     ```
   - Received response with saved user.
   - Verified in MongoDB Compass: `users` collection had the test user.

## Key Components
- **Files**:
  - `models/user.js`, `models/screenTime.js`, `models/triggerLink.js`.
  - `routes/test.js`.
- **Models**:
  - `User`: For user profiles.
  - `ScreenTime`: For screen time data.
  - `TriggerLink`: For recommendations.
- **Features**:
  - Validation, `ObjectId` references, indexes, `timestamps`.
- **Endpoint**:
  - `POST /test-user`: Saves a test user.

## Outcomes
- MongoDB models defined with production-grade practices.
- Successfully saved a test user and verified in MongoDB.
- Backend ready for data sync endpoints (Day 9).

## Notes
- **Success**: Models created; test user saved and verified.
- **Issues**: None (or note any, e.g., “Validation error”).
- **Next Steps**: Add API endpoints for data sync (Day 9).
- **Resources**:
  - Mongoose: `mongoosejs.com/docs/schemas.html`
  - YouTube: “Mongoose Tutorial” by Net Ninja (searched: “Net Ninja Mongoose tutorial”)

## Next Steps
- **Day 9**: Create API endpoints to receive extension data.
- Commit files to GitHub.
- Update Notion/Trello board.