# ChillBoard - AI-Based Digital Wellness Dashboard - Day 34

## Overview
Welcome to Day 34 of the ChillBoard project! On July 05, 2025, we conducted end-to-end testing of the challenge system, including joining challenges, tracking screen time reduction, and verifying leaderboard updates.

## Features Tested
- **End-to-End Test**: Logged in, joined a challenge (e.g., “7-Day Digital Detox”), reduced screen time via the Chrome extension, updated progress via `/challenges/progress`, and verified leaderboard updates.
- **Multiple Users**: Simulated multiple test accounts with varying reductions to ensure correct ranking.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- `.env` with `MONGO_URI`, `JWT_SECRET`, and other credentials (from Day 24).
- Chrome extension installed and configured.
- Frontend and backend running (see Day 24 README).

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure `type: module` is set in `package.json`.
3. Run `nodemon index.js` to start the server.

### Frontend Setup
1. Navigate to `ChillBoard/frontend/` and run `npm install`.
2. Run `npm start` to launch the app at `http://localhost:3000`.

## Usage
1. **Insert Test Data**:
   - Add a `Challenge` with `challengeId: "7-day-detox-1750904995296"`, `startDate: "2025-07-05"`, and initial `participants` (e.g., User1 with no reduction).
   - Add `User` documents (e.g., User1, User2, User3).
2. **End-to-End Test**:
   - Login as User1, join the challenge.
   - Set initial `totalTime: 21600` (6h) via extension, then `18000` (5h) after a day.
   - Call `/challenges/progress` with `{ challengeId, userId, totalTime: 18000 }`.
   - Verify leaderboard shows “#1 User1: 1.0 hours”.
3. **Multiple Users Test**:
   - Login as User2 and User3, join the challenge.
   - Set User2’s reduction to 2h, User3’s to 0.5h via `/challenges/progress`.
   - Check leaderboard: #1 User2: 2.0 hours, #2 User1: 1.0 hours, #3 User3: 0.5 hours.

## File Changes
### Backend
- **`routes/challenges.js`** (if not existing):
  - Added `updateProgress` to update participant reduction based on `totalTime`.

## Testing
- **End-to-End Tests**:
  - **Login Test**: Expect `200` with JWT.
  - **Join Test**: Verify “Joined” and initial leaderboard load.
  - **Screen Time Test**: Confirm extension updates `screenTime` collection.
  - **Progress Test**: Call `/challenges/progress`; expect `200` and 1h reduction.
  - **Leaderboard Test**: Verify User1 at #1 with 1h.
  - **Error Test**: Omit `totalTime`; expect `400`.
- **Multiple Users Tests**:
  - **Multi-User Test**: Expect all three users ranked correctly.
  - **Tie Test**: Set User1 and User2 to 1h; expect alphabetical order.
  - **Limit Test**: Add 15 users; expect top 10/3 on respective pages.
- **Debug Tests**:
  - **Reduction Fix**: If incorrect, adjust baseline in `/challenges/progress`.
  - **Update Fix**: If leaderboard stalls, clear cache or sync MongoDB.

## Challenges and Solutions
- **Baseline Calculation**: Initial `totalTime` wasn’t set; fixed by storing `initialScreenTime` on first update.
- **Leaderboard Sync**: Delayed updates due to cache; resolved by ensuring real-time MongoDB writes.
- **UI Lag**: Observed with 20 users; optimized `useEffect` with debouncing.

## Future Improvements
- Automate `/challenges/progress` with a scheduled task.
- Add real-time leaderboard updates with WebSocket.
- Enhance extension to auto-submit progress.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Chrome for extension integration.

## Commit Message
"Test challenge system with end-to-end flow and multiple users on Day 34"