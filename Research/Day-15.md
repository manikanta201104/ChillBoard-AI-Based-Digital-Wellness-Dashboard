# Day 15: Create Recommendations Endpoint for ChillBoard

**Date**: June 13, 2025 (Completed early for June 16, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Create a `/recommendations` endpoint to generate suggestions based on screen time and mood data.

## Task Overview
On Day 15, I implemented a `POST /recommendations` endpoint in the backend to fetch the latest `ScreenTime` and `Mood` data, apply predefined rules, and generate personalized wellness suggestions for the user. The endpoint saves the recommendation to the `Recommendation` collection and returns it to the client. I also inserted test data into MongoDB Atlas and verified the endpoint using Postman.

## What Was Done
1. **Created Recommendations Endpoint**:
   - Added `POST /recommendations` in `routes/recommendations.js`.
   - Fetched the latest `ScreenTime` and `Mood` data for the authenticated user using `userId` from the JWT.
   - Defined rules:
     - If `totalTime > 300 minutes` (5 hours) and `mood: "stressed"`, suggest a 5-minute walk.
     - If `totalTime > 180 minutes` (3 hours) and `mood: "tired"`, suggest a 10-minute break.
     - If `mood: "happy"`, suggest a positive message (“You’re doing great!”).
   - Saved the recommendation to the `Recommendation` collection and returned it (e.g., `{ type: "message", details: { message: "You’re doing great!" } }`).

2. **Inserted Test Data**:
   - Added a `ScreenTime` document: `totalTime: 3206 seconds` (53.43 minutes), `userId: "6847a8a8e573f7060ec30f3c"`.
   - Added a `Mood` document: `mood: "happy"`, `userId: "6847a8a8e573f7060ec30f3c"`.

3. **Tested the Endpoint**:
   - Used Postman to call `/recommendations` with the correct JWT.
   - Initially faced issues (see Challenges below), but eventually verified the response: `{ type: "message", details: { message: "You’re doing great!" } }`.
   - Confirmed the recommendation was saved in the `recommendations` collection in MongoDB Atlas.

## Key Components
- **Files**:
  - `routes/recommendations.js`: Endpoint logic to fetch data, apply rules, and save recommendations.
  - `models/screenTime.js`: Updated `userId` to `String` to match JWT and other models.
  - `models/user.js`: Removed duplicate index definitions to resolve Mongoose warnings.
- **Features**:
  - Fetches the latest `ScreenTime` and `Mood` data using `sort({ date: -1 })` and `sort({ timestamp: -1 })`.
  - Applies rules based on `totalTime` and `mood` to generate personalized suggestions.
  - Saves recommendations to MongoDB Atlas for future tracking.

## Challenges Faced
1. **ScreenTime Data Not Found**:
   - **Issue**: The endpoint initially returned the default recommendation (`{ type: "message", details: { message: "Keep up the good work!" } }`) because `ScreenTime` data was `null`.
   - **Cause**: The `ScreenTime` model had `userId` as `mongoose.Schema.ObjectId`, while the JWT provided `userId` as a string, causing a query mismatch.
   - **Solution**: Updated the `ScreenTime` model to use `userId: { type: String }`, reinserted the test data, and ensured the `userId` matched the JWT.

2. **Corrupted Data in `moods` Collection**:
   - **Issue**: Even after fixing the `ScreenTime` issue, the endpoint still returned the default recommendation because `latestMood` was a `ScreenTime` document.
   - **Cause**: The `moods` collection in MongoDB Atlas contained a `ScreenTime` document (with `screenTimeId` and `totalTime`) instead of a `Mood` document, likely due to a manual insertion error.
   - **Solution**: Cleared the incorrect documents from the `moods` collection using `db.moods.deleteMany({ screenTimeId: { $exists: true } })`, then reinserted the correct `Mood` document (`mood: "happy"`).

3. **Duplicate Index Warnings**:
   - **Issue**: Mongoose warnings appeared during server startup: `Duplicate schema index on {"userId":1}` and `{"email":1}`.
   - **Cause**: The `User` model had duplicate index definitions (e.g., `unique: true` and `schema.index()` for the same field).
   - **Solution**: Removed explicit `schema.index()` calls in `user.js` since `unique: true` already creates the necessary indexes.

4. **Incorrect Logging**:
   - **Issue**: The `"Applying rules"` log in `recommendations.js` didn’t include the `mood` value, making debugging harder.
   - **Solution**: Updated the log to `logger.info('Applying rules', { totalTime, mood })`, which helped confirm the `mood` value during testing.

5. **Older `ScreenTime` Data Used**:
   - **Issue**: The endpoint fetched a `ScreenTime` document with `totalTime: 3206` instead of a newer one with `totalTime: 1385`.
   - **Cause**: The `date` field of the newer document was older, so `sort({ date: -1 })` fetched the older document.
   - **Note**: This didn’t affect the recommendation since both `totalTime` values were below the thresholds (180 and 300 minutes), and the `mood` was `"happy"`. This can be addressed in the future by ensuring the `date` field reflects the correct timestamp.

## Outcomes
- The `/recommendations` endpoint now correctly generates suggestions based on the rules.
- For the test data (`totalTime: 53.43 minutes`, `mood: "happy"`), the endpoint returns `{ type: "message", details: { message: "You’re doing great!" } }`.
- Recommendations are saved in the `recommendations` collection in MongoDB Atlas.
- Duplicate index warnings are resolved, ensuring cleaner database operations.

## Key Takeaways
- **Data Consistency**: Ensure all models use consistent field types (e.g., `userId` as `String` across `ScreenTime`, `Mood`, and `Recommendation`).
- **Data Validation**: Double-check data in collections to avoid inserting incorrect documents (e.g., `ScreenTime` data in the `moods` collection).
- **Debugging**: Adding detailed logs (e.g., logging `mood` in the rules) can significantly speed up troubleshooting.

## Next Steps
- **Day 16**: Display recommendations on the Dashboard using the `/recommendations` endpoint’s output.
- Verify the latest `ScreenTime` data is used by checking the `date` field in the `screenTimes` collection.
- Commit changes to GitHub and update the Notion/Trello board.

## Resources
- **MongoDB Atlas**: Used for database management (`mongodb.com`).
- **Mongoose Documentation**: For schema and index management (`mongoosejs.com`).
- **Postman**: For testing the API (`postman.com`).
- **YouTube**: “Debugging Node.js APIs” by Traversy Media (searched: “Traversy Media Node.js debugging”).