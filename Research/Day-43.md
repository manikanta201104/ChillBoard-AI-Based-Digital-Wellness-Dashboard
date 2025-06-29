# ChillBoard - AI-Based Digital Wellness Dashboard - Day 43

## Overview
Welcome to Day 43 of the ChillBoard project! On July 14, 2025, we styled the Dashboard Page with a calming design, focusing on charts and recommendations to enhance user engagement.

## Features Added
- **Styling**: Applied a light green background (`bg-green-50`), soft blue borders (`border-blue-200`) around charts and recommendation cards, calming chart colors (`fill-green-300`, `stroke-blue-400`), and green buttons (`bg-green-500`).
- **Responsive Design**: Used Tailwind utilities (e.g., `md:p-6`, `sm:text-sm`) for mobile and tablet views.
- **Legibility**: Ensured text is readable with `text-gray-700` and added padding (`p-4`) for a spacious feel.

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
1. **Navigate to Dashboard**:
   - Login and go to `http://localhost:3000/dashboard`.
2. **Verify Styling**:
   - Check for light green background (`bg-green-50`).
   - Confirm blue-bordered charts and recommendation cards (`border-blue-200`).
   - Ensure green buttons (`bg-green-500`) and legible text (`text-gray-700`).
3. **Test Responsiveness**:
   - Resize browser or use mobile view to verify layout adjusts (e.g., `md:p-6`, `sm:text-sm`).

## File Changes
### Frontend
- **`src/pages/Dashboard.js`**: Updated with calming design and responsive styling.

## Testing
- **Styling Test**: Verify background, borders, chart colors, and buttons.
- **Responsive Test**: Check layout on different screen sizes (e.g., mobile, tablet).
- **Functionality Test**: Ensure charts and recommendations remain functional.

## Challenges and Fixes
- **Chart Color Customization**: Adjusted Chart.js colors to match Tailwind’s calming palette.
- **Responsive Issues**: Resolved overlap by using `md:grid-cols-2` and `gap-8`.

## Future Improvements
- Add animations to chart transitions.
- Include tooltips for chart data points.
- Enhance recommendation card interactivity.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Tailwind CSS for styling.

## Commit Message
"Style Dashboard Page with calming design and responsive layout on Day 43"