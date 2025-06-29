# ChillBoard - AI-Based Digital Wellness Dashboard - Day 46

## Overview
Welcome to Day 46 of the ChillBoard project! On July 17, 2025, we began making the app responsive by adjusting the Landing Page and Dashboard Page for mobile-friendly layouts using Tailwind CSS responsive utilities.

## Features Added
- **Responsive Setup**: Utilized Tailwind’s `sm:`, `md:`, `lg:` prefixes to adjust layouts based on screen size.
- **Landing Page Adjustments**:
  - Stacked signup/login buttons vertically on small screens (`sm:flex-col`).
  - Reduced padding on mobile (`sm:p-2`) and scaled text down (`sm:text-sm`).
- **Dashboard Page Adjustments**:
  - Converted chart sections to a single-column layout on mobile (`sm:flex-col`).
  - Reduced recommendation card size and stacked vertically (`sm:w-full`).
  - Adjusted Spotify player to full width with smaller height (`sm:w-full`, `sm:h-32`).

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- `.env` with `MONGO_URI`, `JWT_SECRET`, and other credentials (from Day 24).
- Frontend and backend running (see Day 24 README).
- Tailwind CSS set up with mobile breakpoints (e.g., `sm: 640px`, `md: 768px` in `tailwind.config.js`).

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure `type: module` is set in `package.json`.
3. Run `nodemon index.js` to start the server.

### Frontend Setup
1. Navigate to `ChillBoard/frontend/` and run `npm install`.
2. Verify `tailwind.config.js` includes:
   ```javascript
   module.exports = {
     theme: {
       extend: {},
       screens: {
         sm: '640px',
         md: '768px',
         lg: '1024px',
       },
     },
   };
   ```
3. Run `npm start` to launch the app at `http://localhost:3000`.

## Usage
1. **Start the App**: Run `npm start` and open `http://localhost:3000`.
2. **Test Landing Page**:
   - Use browser dev tools (e.g., iPhone 375x667px) to verify buttons stack and text scales.
3. **Test Dashboard Page**:
   - Log in and navigate to `http://localhost:3000/dashboard`.
   - Check charts, recommendation cards, and Spotify player adjust on mobile views.

## File Changes
### Frontend
- **`src/pages/Landing.js`**: Adjusted for mobile with stacked buttons and scaled text.
- **`src/pages/Dashboard.js`**: Updated for mobile with single-column charts and resized elements.

## Testing
- **Responsive Test**: Simulate mobile views (e.g., 375x667px) in dev tools.
- **Layout Test**: Verify button stacking, text scaling, chart alignment, and player size.
- **Functionality Test**: Ensure all interactive elements (e.g., buttons, forms) remain functional.

## Challenges and Fixes
- **Chart Responsiveness**: Ensured Chart.js adapts with `responsive: true` in options.
- **Spotify Player**: Adjusted height (`sm:h-32`) to prevent overflow on mobile.

## Future Improvements
- Fine-tune other pages (Challenges, Profile, Settings, About) for responsiveness.
- Add media queries for specific mobile quirks (e.g., iPhone notch).
- Test on physical mobile devices.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Tailwind CSS for responsive utilities.

## Commit Message
"Make Landing and Dashboard Pages responsive for mobile layouts on Day 46"