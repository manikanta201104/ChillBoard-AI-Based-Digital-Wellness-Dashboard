# ChillBoard - AI-Based Digital Wellness Dashboard - Day 44

## Overview
Welcome to Day 44 of the ChillBoard project! On July 15, 2025, we styled the Challenges, Profile, and Settings Pages with a calming design theme to ensure a cohesive and user-friendly experience.

## Features Added
- **Challenges Page**: Soft blue background (`bg-blue-100`), green accents (`text-green-600`) for titles and “Join” button, blue borders (`border-blue-200`) and green highlights (`bg-green-50`) for leaderboard.
- **Profile Page**: Light green background (`bg-green-50`) for trends, soft blue (`bg-blue-100`) for user details, blue borders (`border-blue-200`) and green hover (`hover:bg-green-100`) for playlists, green button (`bg-green-500`) for Spotify actions.
- **Settings Page**: Soft blue background (`bg-blue-100`), green toggles (`bg-green-500` when active), blue text (`text-blue-600`) for labels, and spacing (`space-y-4`).
- **Responsive Design**: Adjusted layouts with Tailwind utilities (e.g., `md:p-6`, `sm:text-sm`) for mobile and tablet views.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- `.env` with `MONGO_URI`, `JWT_SECRET`, and other credentials (from Day 24).
- Frontend and backend running (see Day 24 README).
- Tailwind CSS set up (from Day 42).

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure `type: module` is set in `package.json`.
3. Run `nodemon index.js` to start the server.

### Frontend Setup
1. Navigate to `ChillBoard/frontend/` and run `npm install`.
2. Ensure Tailwind CSS is configured (see Day 42 README).
3. Run `npm start` to launch the app at `http://localhost:3000`.

## Usage
1. **Navigate to Pages**:
   - Challenges: `http://localhost:3000/challenges`
   - Profile: `http://localhost:3000/profile`
   - Settings: `http://localhost:3000/settings`
2. **Verify Styling**:
   - Check backgrounds, borders, and button styles match the calming theme.
   - Ensure text and spacing are clear and consistent.
3. **Test Responsiveness**:
   - Resize browser or use mobile view to confirm layouts adapt (e.g., stacked elements).

## File Changes
### Frontend
- **`src/pages/Challenges.js`**: Styled with soft blue/green theme and responsive layout.
- **`src/pages/Profile.js`**: Applied calming design with responsive adjustments.
- **`src/pages/Settings.js`**: Updated with soft blue/green theme and spacing.

## Testing
- **Styling Test**: Verify backgrounds, borders, accents, and buttons on all pages.
- **Responsive Test**: Check layout adjustments on different screen sizes.
- **Functionality Test**: Ensure page features (e.g., joining challenges, saving settings) work as expected.

## Challenges and Fixes
- **Color Consistency**: Ensured green accents align across pages.
- **Responsive Layout**: Adjusted grid and text sizes for mobile compatibility.

## Future Improvements
- Add animations to page transitions.
- Include tooltips for settings options.
- Enhance challenge card interactivity.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Tailwind CSS for styling.

## Commit Message
"Style Challenges, Profile, and Settings Pages with calming theme on Day 44"