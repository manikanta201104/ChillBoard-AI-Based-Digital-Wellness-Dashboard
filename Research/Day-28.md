# ChillBoard - AI-Based Digital Wellness Dashboard - Day 28

## Overview
Welcome to Day 28 of the ChillBoard project! On June 29, 2025, we created the Challenges page, introducing a gamification feature with a static list of sample challenges (e.g., “7-Day Digital Detox”). This page enhances user engagement and prepares the UI for future backend integration.

## Features Added
- **Challenges Page**: Added a new `/challenges` route with a heading and challenge list.
- **Challenge List**: Hardcoded two sample challenges with titles, descriptions, and “Join” buttons.
- **Styling**: Applied Tailwind CSS for a clean, motivating design with green accents.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed (though not used for challenges yet).
- Tailwind CSS configured in the frontend (from previous days).

### Frontend Setup
1. Navigate to `ChillBoard/frontend/` and run `npm install`.
2. Run `npm start` to launch the app at `http://localhost:3000`.

## Usage
1. **Navigate to Challenges**:
   - Open `http://localhost:3000/challenges` in the browser.
2. **View Challenges**:
   - Verify the “Digital Detox Challenges” heading and two challenge cards (“7-Day Digital Detox” and “3-Day Screen Break”) are displayed.
3. **Interact**:
   - Hover over “Join” buttons to check the green hover effect (no action expected).

## File Changes
### Frontend
- **`src/App.js`**:
  - Added a `/challenges` route mapping to the new `Challenges` component.
- **`src/pages/Challenges.js`**:
  - Created with a hardcoded challenge list and Tailwind styling.

## Testing
- **Navigation Test**: Load `http://localhost:3000/challenges` and confirm the page renders without errors. Check that `/dashboard` still works.
- **Render Test**: Verify the heading and both challenge cards display correctly, with titles and descriptions matching the hardcoded data.
- **Empty State Test**: Set `challenges = []` in `Challenges.js`, reload, and ensure “No challenges available” appears.
- **Visual Test**: Confirm the heading is green and bold, cards have shadows and margins, and “Join” buttons show the hover effect.
- **Responsive Test**: Resize to 320px (mobile) and 768px (tablet) widths. Ensure cards stack vertically and text remains legible.
- **Browser Test**: Test in Chrome, Firefox, and Safari; verify consistent layout and styling.
- **Performance Test**: Use dev tools’ Performance tab to confirm load time is under 2 seconds.
- **Accessibility Test**: Use a contrast checker to ensure text readability (e.g., green on white).

## Challenges and Solutions
- **Responsive Design**: Adjusted Tailwind classes (e.g., `md:grid-cols-2`) to handle different screen sizes.
- **Initial Render**: Added an empty state check to avoid UI breaks.

## Future Improvements
- Add backend integration to fetch dynamic challenges.
- Make “Join” buttons functional to start challenges.
- Add progress tracking for completed challenges.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and the Tailwind CSS team for the framework.