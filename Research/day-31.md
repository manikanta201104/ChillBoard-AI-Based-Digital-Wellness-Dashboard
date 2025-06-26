# ChillBoard - AI-Based Digital Wellness Dashboard - Day 31

## Overview
Welcome to Day 31 of the ChillBoard project! On July 02, 2025, we created a `/challenges/progress` endpoint to calculate screen time reduction based on `ScreenTime` data and update the `participants` array in the `Challenge` collection. This enhances the gamification feature with progress tracking.

## Features Added
- **POST /challenges/progress**: Calculates reduction using a 7-day baseline and updates the user’s reduction value.
- **Baseline Calculation**: Averages `ScreenTime` totalTime from 7 days before `startDate`, subtracting the current day’s value.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- `.env` with `MONGO_URI`, `JWT_SECRET`, and other credentials (from Day 24).
- Frontend and backend running (see Day 24 README).

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure `type: module` is set in `package.json`.
3. Run `nodemon index.js` to start the server.

### Frontend Setup
1. Navigate to `ChillBoard/frontend/` and run `npm install`.
2. Run `npm start` to launch the app at `http://localhost:3000` (no changes needed yet).

## Usage
1. **Insert Test Data**:
   - Use a MongoDB client to insert `ScreenTime` data (e.g., 6 hours/day for June 24–30, 2025, and 5 hours for July 01, 2025).
2. **Update Progress**:
   - Use Postman to send `POST http://localhost:5000/challenges/progress` with `{ "userId": "6858c6eba064f00ab3c98108", "challengeId": "challenge_1750835894918" }` and a JWT.
3. **Check MongoDB**:
   - Verify the `participants` array reflects the calculated reduction (e.g., 1 hour).

## File Changes
### Backend
- **`routes/challenges.js`**:
  - Added `POST /challenges/progress` to calculate and update screen time reduction.
- **`models/ScreenTime.js`**:
  - Assumed schema for `ScreenTime` data (from Day 10).

## Testing
- **Data Insertion Test**: Insert 7 `ScreenTime` documents (6 hours) for June 24–30, 2025, and 1 (5 hours) for July 01, 2025. Verify in MongoDB.
- **Progress Test**: Send a valid POST request; expect `200` with `reduction: 1` (6 - 5 hours) in `participants`.
- **Validation Test**: Send without `challengeId`; expect `400` with “challengeId is required”.
- **Auth Test**: Omit JWT; expect `401` unauthorized.
- **Non-Participant Test**: Use a non-participating `userId`; expect `403` with “User not participating”.
- **Baseline Test**: Insert no baseline data; expect `400` with “Insufficient baseline data”.
- **Multiple Days Test**: Add July 02 data (4 hours); recalculate and expect `reduction: 2`.
- **Edge Case Test**: Set `startDate` to future date; expect `400` with “Challenge is not active”.
- **Performance Test**: Send 10 requests in quick succession; verify no errors or duplicates.
- **Concurrency Test**: Use two Postman instances simultaneously; ensure correct updates for each `userId`.

## Challenges and Solutions
- **Baseline Accuracy**: Used aggregation to ensure a precise 7-day average.
- **Date Handling**: Added checks for active challenge periods to avoid invalid updates.

## Future Improvements
- Add a frontend progress display on the Challenges page.
- Implement a PATCH endpoint to manually adjust reductions.
- Create a leaderboard based on total reductions.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Mongoose for MongoDB integration.

## Commit Message
"Add /challenges/progress endpoint for screen time reduction on Day 31"