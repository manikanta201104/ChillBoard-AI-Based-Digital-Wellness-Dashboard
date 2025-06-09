# Day 10: React Frontend Setup with Landing Page for ChillBoard

**Date**: June 08, 2025 (Completed early for June 11, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Set up the React frontend with routing and build a Landing Page for signup/login.

## Task Overview
On Day 10, I set up a React app in `frontend/` with routing for multiple pages, installed necessary dependencies, and built a Landing Page with signup/login forms that integrate with the backend.

## What Was Done
1. **Set Up React Frontend**:
   - Created a React app with `create-react-app`.
   - Installed `react-router-dom`, `axios`, and `tailwindcss`.
   - Set up routes for `/`, `/dashboard`, `/challenges`, `/profile`, `/settings`, and `/about`.

2. **Built the Landing Page**:
   - Created `Landing.js` with a tagline, description, privacy note, and extension link.
   - Added `AuthForm.js` for signup/login forms.
   - Used `axios` to call `/auth/signup` and `/auth/login`, storing JWT in `localStorage`.

3. **Tested the App**:
   - Started the app with `npm start` (`http://localhost:3000`).
   - Signed up with `email: "newuser@example.com"`, `password: "newpass123"`.
   - Logged in with the same credentials.
   - Verified JWT in `localStorage` and backend logs.

## Key Components
- **Files**:
  - `App.js`: Routing setup.
  - `pages/Landing.js`: Landing Page UI.
  - `components/AuthForm.js`: Signup/login form.
  - `utils/api.js`: API helper for backend requests.
- **Dependencies**:
  - `react-router-dom`, `axios`, `tailwindcss`.
- **Features**:
  - Routing for multiple pages.
  - Tailwind CSS for styling.
  - Authentication with JWT storage.

## Outcomes
- React app running with routing.
- Landing Page allows signup/login, storing JWT in `localStorage`.
- Ready to display user data on the Dashboard (Day 11).

## Notes
- **Success**: Signup/login worked, token stored.
- **Issues**: None (or note any, e.g., “CORS issue”).
- **Next Steps**: Display screen time data on Dashboard (Day 11).
- **Resources**:
  - React: `react.dev`
  - React Router: `reactrouter.com`
  - Tailwind CSS: `tailwindcss.com`
  - YouTube: “React Tutorial” by Net Ninja (searched: “Net Ninja React tutorial”)

## Next Steps
- **Day 11**: Fetch and display screen time data on the Dashboard.
- Commit files to GitHub.
- Update Notion/Trello board.