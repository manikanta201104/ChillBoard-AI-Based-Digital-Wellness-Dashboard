# ChillBoard - AI-Based Digital Wellness Dashboard - Day 39

## Overview
Welcome to Day 39 of the ChillBoard project! On July 10, 2025, we created the About/Help page with a mission statement, guides, and privacy policy, enhancing transparency and support.

## Features Added
- **About/Help Page**: Added a `/about` route with sections for mission statement, usage guides, and privacy policy.
- **Content**: Included a mission paragraph, a step-by-step guide, and key privacy points.
- **Styling**: Applied Tailwind CSS with a white background and blue headings for a professional design.

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
1. **Navigate to About/Help**:
   - Login or stay as guest (no auth required).
   - Go to `http://localhost:3000/about`.
   - Verify “About ChillBoard & Help” heading and all sections (mission, guides, privacy) display.
2. **Check Content**:
   - Confirm mission statement paragraph is readable.
   - Ensure guide steps are numbered and clear.
   - Check privacy points are listed and concise.
3. **Test Styling**:
   - Verify white background and blue headings.

## File Changes
### Frontend
- **`src/App.js`**: Updated routing to include `/about` route.
- **`src/pages/About.js`**: Created with mission, guides, and privacy content, styled with Tailwind CSS.

## Testing
- **Navigation Test**: Access `/about`; expect page load without errors.
- **Content Test**: Verify all sections display with correct formatting.
- **Styling Test**: Confirm white background, blue headings, and responsiveness.
- **Accessibility Test**: Check text readability (e.g., contrast).

## Challenges and Solutions
- **Content Length**: Kept sections concise to avoid overwhelming users.
- **Styling Consistency**: Aligned with existing pages using Tailwind defaults.

## Future Improvements
- Add a FAQ section to the About/Help page.
- Include contact support links or a feedback form.
- Translate content for multilingual support.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Tailwind CSS for styling.

## Commit Message
"Add About/Help page with mission, guides, and privacy policy on Day 39"