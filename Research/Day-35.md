# ChillBoard - AI-Based Digital Wellness Dashboard - Day 35

## Overview
Welcome to Day 35 of the ChillBoard project! On July 06, 2025, we created the Profile page to display user details and historical trend placeholders, enhancing personalization for the app.

## Features Added
- **Profile Page**: Added a `/profile` route with a layout for user details (e.g., username, email) and trend placeholders (e.g., screen time, mood trends).
- **User Details**: Displayed static data initially, with a placeholder for fetching from a future `/user` endpoint.
- **Trends Section**: Included placeholders for weekly screen time averages and mood frequency, using Chart.js for future visualizations.
- **Styling**: Applied Tailwind CSS with soft blues for a calming design.

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
1. **Navigate to Profile**:
   - Login with a test user (e.g., `userId: "user1_id"`, `username: "User123"`).
   - Go to `http://localhost:3000/profile`.
   - Verify “Your Profile” heading, “Username: User123”, and “Email: user@example.com” display.
2. **Check Trends**:
   - Confirm “Screen Time Trends” and “Mood Trends” placeholders with Chart.js bars.
3. **Test Styling**:
   - Ensure a blue background and readable text.

## File Changes
### Frontend
- **`src/App.js`**:
  - Updated routing to include `/profile` route.
- **`src/pages/Profile.js`**:
  - Created with user details section and trend placeholders, styled with Tailwind CSS.

## Testing
- **Navigation Test**: Access `/profile` after login; expect page load without errors.
- **Details Test**: Verify static data (e.g., “Username: User123”) displays.
- **Trends Test**: Check placeholders and Chart.js load (no data errors).
- **Styling Test**: Confirm blue theme and responsiveness.
- **Auth Test**: Log out; expect redirect or access denial (if protected).

## Challenges and Solutions
- **Placeholder Data**: Used static trends for now; will integrate with `/screen-time` and `/mood` endpoints later.
- **Routing**: Ensured `/profile` fits existing navigation; no conflicts found.

## Future Improvements
- Implement GET `/user` endpoint to fetch dynamic user data.
- Integrate `ScreenTime` and `Mood` collections for real trend data.
- Add interactive chart features (e.g., date range selection).

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Chart.js for visualization.

## Commit Message
"Add Profile page with user details and trend placeholders on Day 35"