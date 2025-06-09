# Day 11: Dashboard Page with Screen Time and Tab Usage Charts for ChillBoard

**Date**: June 09, 2025 (Completed early for June 12, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Build the Dashboard Page to display screen time and tab usage as charts.

## Task Overview
On Day 11, I updated the backend with a `GET /screen-time` endpoint to fetch screen time data and built the Dashboard Page in the frontend to display this data as charts. I also added a reminder for users to install the Chrome extension if not detected.

## What Was Done
1. **Updated Backend**:
   - Added `GET /screen-time` in `routes/screenTime.js` to fetch `ScreenTime` documents for the authenticated user.

2. **Updated Frontend**:
   - Installed `chart.js` and `react-chartjs-2` for charts.
   - Updated `api.js` with `getScreenTime` to fetch data.
   - Updated `Dashboard.js` with bar chart (daily screen time) and pie chart (tab usage).
   - Added extension detection with a reminder button.

3. **Tested the Dashboard**:
   - Logged in, navigated to `/dashboard`.
   - Verified screen time and tab usage charts displayed.
   - Tested extension reminder (if not installed).

## Key Components
- **Backend Files**:
  - `routes/screenTime.js`: Added `GET /screen-time`.
- **Frontend Files**:
  - `pages/Dashboard.js`: Dashboard with charts.
  - `utils/api.js`: Added `getScreenTime`.
- **Dependencies**:
  - `chart.js`, `react-chartjs-2`.
- **Features**:
  - Bar chart for daily screen time.
  - Pie chart for tab usage.
  - Extension detection and reminder.

## Outcomes
- Dashboard displays screen time and tab usage as charts.
- Extension reminder works if the extension isn’t installed.
- End-to-end flow (extension-backend-frontend) validated.

## Notes
- **Success**: Charts displayed, data fetched.
- **Issues**: None (or note any, e.g., “Chart styling issue”).
- **Next Steps**: Add challenges page (Day 12).
- **Resources**:
  - Chart.js: `chartjs.org`
  - React Chart.js: `react-chartjs-2.js.org`
  - YouTube: “React Charts Tutorial” by ChartJS (searched: “ChartJS React tutorial”)

## Next Steps
- **Day 12**: Add challenges page.
- Commit files to GitHub.
- Update Notion/Trello board.