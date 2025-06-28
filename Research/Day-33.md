# ChillBoard - AI-Based Digital Wellness Dashboard - Day 33

## Overview
Welcome to Day 33 of the ChillBoard project! On July 04, 2025, we integrated the leaderboard feature by displaying a full leaderboard on the Challenges page and a top-3 snippet on the Dashboard, enhancing gamification and user motivation.

## Features Added
- **Challenges Page Update**: Added a “Leaderboard” section below the challenge list, showing the top 10 users with ranks, usernames, and reductions (e.g., “#1 User1: 5 hours”) for the joined challenge.
- **Dashboard Snippet**: Added a “Top 3 Leaders” section above recommendations, displaying the top 3 users (e.g., “#1 User1: 5 hours”) for quick access.

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
1. **Insert Test Data**:
   - Add a `Challenge` with `challengeId: "test_leaderboard_1750904995295"`, `startDate: "2025-07-04"`, and `participants` with reductions (e.g., User1: 5h, User2: 3h, User3: 1h).
   - Add corresponding `User` documents with `userId` and `username` (e.g., "User1", "User2", "User3").
2. **Test Challenges Page**:
   - Join the challenge via the “Join” button.
   - Verify the “Leaderboard” section shows the top 10 users (e.g., “#1 User1: 5 hours”).
3. **Test Dashboard Snippet**:
   - After joining, check the “Top 3 Leaders” section; expect top 3 (e.g., “#1 User1: 5 hours”).
4. **Check Responsiveness**:
   - Resize the browser; ensure layouts adapt.

## File Changes
### Frontend
- **`src/utils/api.js`**:
  - Added `getLeaderboard` to fetch leaderboard data with `challengeId`.
- **`src/pages/Challenge.js`**:
  - Added a “Leaderboard” section with top 10 users, fetched via `getLeaderboard`.
- **`src/pages/Dashboard.js`**:
  - Added a “Top 3 Leaders” snippet with top 3 users, fetched via `getLeaderboard`.

## Testing
- **Challenges Page Tests**:
  - **Join Test**: Join a challenge; expect leaderboard with top 10 (e.g., “#1 User1: 5 hours”).
  - **No Join Test**: Without joining, expect “No leaderboard data available”.
  - **Data Test**: Use test data (5h, 3h, 1h); confirm correct order.
  - **Error Test**: Use invalid `challengeId`; expect “Failed to fetch leaderboard”.
  - **Loading Test**: Verify “Loading...” during fetches.
- **Dashboard Snippet Tests**:
  - **Snippet Test**: After joining, expect “Top 3 Leaders” with top 3.
  - **Limit Test**: With 10 users, expect only top 3.
  - **No Join Test**: Without joining, expect no snippet.
  - **Error Test**: Simulate API failure; expect “Failed to fetch leaderboard”.
- **Responsive Test**: Resize window; ensure UI adapts (e.g., grid on Challenges).
- **Performance Test**: Load with 20 participants; verify no lag.

## Challenges and Solutions
- **Loading States**: Added `loading` state to prevent UI glitches during fetches.
- **User ID Matching**: Assumed `localStorage.getItem('userId')` matches backend `userId`; adjust if using `_id`.
- **Data Consistency**: Ensured `reduction` is converted from seconds to hours consistently.

## Future Improvements
- Add real-time leaderboard updates with WebSocket.
- Implement pagination for the Challenges page leaderboard if participant count grows.
- Add styling customization (e.g., badges for top ranks).

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and React for frontend framework.

## Commit Message
"Add leaderboard display on Challenges page and snippet on Dashboard on Day 33"