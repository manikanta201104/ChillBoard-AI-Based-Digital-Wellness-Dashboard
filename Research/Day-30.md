# ChillBoard - AI-Based Digital Wellness Dashboard - Day 30

## Overview
Welcome to Day 30 of the ChillBoard project! On July 01, 2025, we enabled users to join challenges, making the “Join” button functional on the Challenges page and creating a `/challenges/join` endpoint to save participation in the `Challenge` collection. This activates the gamification feature with production-grade updates.

## Features Added
- **Frontend Update**: Made the “Join” button send a POST request to `/challenges/join`, disabling it and showing “Joined” status with reduction after joining.
- **Backend Endpoint**: Added `POST /challenges/join` to add `userId` and `reduction: 0` to the `participants` array.
- **UI Update**: Displayed the initial reduction (e.g., “0 hours reduced”) post-join.

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
2. Run `npm start` to launch the app at `http://localhost:3000`.

## Usage
1. **Login**:
   - Log in with a valid user (e.g., `email: "user@example.com"`, `password: "password123"`).
2. **Join a Challenge**:
   - Navigate to `http://localhost:3000/challenges`, click “Join” on a challenge (e.g., “7-Day Digital Detox”), and verify the button disables with “Joined - 0 hours reduced”.
3. **Check MongoDB**:
   - Use a MongoDB client to confirm the `participants` array includes the `userId` with `reduction: 0`.

## File Changes
### Backend
- **`models/Challenge.js`**:
  - Updated `participants` to use a nested schema with `userId` and `reduction`.
- **`routes/challenges.js`**:
  - Added `POST /challenges/join` to handle user participation.

### Frontend
- **`src/pages/Challenges.js`**:
  - Added `joinChallenge` function and UI updates for joined status.
- **`src/utils/api.js`**:
  - Added `joinChallenge` API call.

## Testing
- **Join Test**: Log in, click “Join” on a challenge, and verify the button disables, “Joined” appears, and reduction shows as “0 hours reduced”. Check MongoDB for the update.
- **API Response Test**: Use dev tools’ Network tab to confirm a `POST /challenges/join` request with `200` status.
- **State Test**: Join two challenges; ensure only the clicked challenge updates.
- **Error Test**: Click “Join” with an invalid `challengeId` (e.g., edit the ID manually); expect an error message and no UI change.
- **Performance Test**: Click “Join” 5 times rapidly; verify no duplicate requests or UI glitches.
- **Auth Test**: Log out and click “Join”; expect a 401 error and no join action.
- **Duplicate Test**: Join the same challenge twice; expect a “User already joined” error and no duplicate entry.
- **Concurrency Test**: Use two browser tabs with different users to join the same challenge simultaneously; verify both `userId`s are added correctly.
- **Edge Case Test**: Join a challenge with a `startDate` in the past but within duration; expect success.

## Challenges and Solutions
- **Duplicate Prevention**: Added a check to avoid duplicate `userId`s in `participants`.
- **UI Sync**: Used state to ensure immediate feedback after joining.

## Future Improvements
- Add PATCH /challenges/:challengeId to update reduction values.
- Implement a progress tracker on the Challenges page.
- Create a leaderboard based on reductions.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Mongoose for MongoDB integration.

## Commit Message
"Enable challenge joining with backend and frontend updates on Day 30"