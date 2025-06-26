# ChillBoard - AI-Based Digital Wellness Dashboard - Day 32

## Overview
Welcome to Day 32 of the ChillBoard project! On July 03, 2025, we created a `/challenges/leaderboard` endpoint to rank users by their screen time reduction, enhancing the gamification feature with a competitive element.

## Features Added
- **GET /challenges/leaderboard**: Returns a ranked list of top 10 participants by reduction, including `userId`, `username`, and `reduction` in hours. The endpoint accepts a `challengeId` query parameter and fetches usernames from the `User` collection.

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
2. Run `npm start` to launch the app at `http://localhost:3000` (integration pending).

## Usage
1. **Insert Test Data**:
   - Add a `Challenge` with `challengeId: "test_leaderboard_1750904995295"`, `startDate: "2025-07-03"`, and `participants` with reductions (e.g., User1: 5h, User2: 3h, User3: 1h).
   - Add corresponding `User` documents with `userId` and `username` (e.g., "User1", "User2", "User3").
2. **Fetch Leaderboard**:
   - Use Postman to send `GET http://localhost:5000/challenges/leaderboard?challengeId=test_leaderboard_1750904995295` with a JWT.
3. **Check Response**:
   - Verify the ranked list (e.g., User1 #1: 5h, User2 #2: 3h, User3 #3: 1h).

## File Changes
### Backend
- **`routes/challenges.js`**:
  - Added `GET /challenges/leaderboard` to rank participants by reduction, with flexible `userId` matching against both `userId` and `_id` in the `User` collection.

## Testing
- **Data Insertion Test**: Insert a `Challenge` with 3 participants (5h, 3h, 1h) and matching `User` documents. Verify in MongoDB.
- **Leaderboard Test**: Call the endpoint; expect `200` with `[{ rank: 1, userId: "user1_id", username: "User1", reduction: 5 }, ...]`.
- **Validation Test**: Send without `challengeId`; expect `400` with “challengeId is required”.
- **Auth Test**: Omit JWT; expect `401` unauthorized.
- **Empty Test**: Use a non-existent `challengeId`; expect `404` with “Challenge not found”.
- **Limit Test**: Add 15 participants; expect only top 10.
- **Edge Case Test**: Set a negative `reduction`; expect it to rank last with 0.
- **ID Mismatch Test**: Use `userId` as string or ObjectId; expect correct username mapping.
- **Performance Test**: Send 10 requests in quick succession; verify no errors.

## Challenges and Solutions
- **ID Flexibility**: Implemented dual matching (`userId` and `_id`) to handle potential schema variations in `User` collection.
- **Sorting**: Used client-side sorting with `.sort()` and `.slice()` for simplicity, suitable for top 10 limits.

## Future Improvements
- Add frontend integration to display the leaderboard on the Challenges page.
- Implement real-time updates with WebSocket or polling.
- Add tiebreaker logic (e.g., join date) for equal reductions.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Mongoose for MongoDB integration.

## Commit Message
"Add /challenges/leaderboard endpoint for user rankings on Day 32"