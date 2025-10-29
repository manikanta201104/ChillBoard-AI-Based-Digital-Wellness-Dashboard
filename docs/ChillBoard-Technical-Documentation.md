# ChillBoard: AI-Based Digital Wellness Dashboard — Technical Documentation

Version: 1.0
Maintainers: ChillBoard Team

---

# Table of Contents

- 1. Introduction
  - 1.1 Project Overview
  - 1.2 Objectives
  - 1.3 Key Features
  - 1.4 Target Audience
  - 1.5 Technologies Used
- 2. System Architecture
  - 2.1 High-Level Architecture
  - 2.2 Component Diagram (ASCII)
  - 2.3 Data Flow Diagram (Screen Time, Mood, Spotify, Challenges)
  - 2.4 Database Schema Details
- 3. Detailed System Flow
  - 3.1 User Onboarding and Authentication
  - 3.2 Chrome Extension Workflow (Screen Time Tracking)
  - 3.3 Dashboard Workflow
  - 3.4 Mood Detection Module (Local)
  - 3.5 Recommendation Engine
  - 3.6 Spotify Integration and Music Playback
  - 3.7 Challenges and Leaderboard System
  - 3.8 Profile Management
  - 3.9 Settings Configuration
  - 3.10 About and Contact Functionality
- 4. Backend Processes
  - 4.1 API Endpoints Overview
  - 4.2 Database Operations
  - 4.3 Cron Jobs and Scheduled Tasks
  - 4.4 Authentication and Security
  - 4.5 Error Handling, Logging, and Rate Limiting
  - 4.6 Email Delivery (AWS SES/Resend)
- 5. Frontend Components
  - 5.1 Page Structure and Navigation
  - 5.2 Key React Components
  - 5.3 State Management and Hooks
  - 5.4 Third-Party Integrations
  - 5.5 UI/UX Design Considerations
- 6. Deployment and Scalability
  - 6.1 Frontend Deployment (Vercel)
  - 6.2 Backend Deployment (Render, Docker, GHCR, GitHub Actions)
  - 6.3 Chrome Extension Deployment (Web Store)
  - 6.4 Environment Variables and Configuration
  - 6.5 Scalability Considerations
- 7. Privacy and Security Considerations
  - 7.1 Data Handling and Storage
  - 7.2 Local Processing (Mood Detection)
  - 7.3 User Consent and Controls
  - 7.4 Security Measures
- 8. Testing and Quality Assurance
  - 8.1 Unit Tests
  - 8.2 Integration Tests
  - 8.3 Edge Cases and Error Scenarios
  - 8.4 Manual Testing
- 9. Setup & Development
  - 9.1 Repository Structure
  - 9.2 Local Development (Backend, Frontend, Extension)
  - 9.3 Environment Setup
  - 9.4 Running in Docker (Backend)
- 10. Troubleshooting & FAQ
- 11. Best Practices
- 12. Future Enhancements
- 13. Conclusion

---

# 1. Introduction

## 1.1 Project Overview

ChillBoard is a full-stack digital wellness platform that helps users manage screen time, monitor emotional well-being, and receive personalized recommendations. It comprises:

- A Chrome Extension to track active tab usage and sync data.
- A React web app for dashboards, analytics, and Spotify playback.
- A Node.js/Express backend with MongoDB for storage, processing, and scheduled tasks.
- Local AI-powered mood detection using face-api.js/TensorFlow.js for privacy.

Live: https://www.chillboard.in/
Frontend Repo: https://github.com/manikanta201104/ChillBoard-Frontend
Backend Repo: https://github.com/manikanta201104/ChillBoard-AI-Based-Digital-Wellness-Dashboard/tree/main/Backend

## 1.2 Objectives

- Track screen time and tab usage with a Chrome extension.
- Detect mood locally to protect privacy.
- Provide personalized recommendations (breaks, messages, music via Spotify).
- Encourage healthy habits via challenges and leaderboards.
- Offer clear analytics and user controls.

## 1.3 Key Features

- Screen-time tracking and analytics.
- Local mood detection and correction.
- Recommendations engine (rules + Spotify playlists).
- Challenges and leaderboard rankings.
- Reviews with submission and approval workflow.
- Secure auth (JWT), robust logging, and email-based password reset.

## 1.4 Target Audience

- Students, professionals, wellness enthusiasts, and Spotify Premium users.

## 1.5 Technologies Used

- Frontend: React, Tailwind CSS, Axios, Chart.js, react-spotify-web-playback, face-api.js/TensorFlow.js, react-toastify.
- Backend: Node.js, Express, MongoDB (Mongoose), JWT, node-cron, Winston, AWS SDK (SES), Resend API, Nodemailer (SMTP as fallback/test), bcrypt.
- Extension: Chrome Manifest V3, Chrome APIs (tabs, storage, alarms, idle, runtime, webNavigation).
- DevOps/Infra: Docker, GitHub Actions (build/publish backend image), GHCR, Vercel (frontend), Render (backend), MongoDB Atlas.

---

# 2. System Architecture

## 2.1 High-Level Architecture

- Chrome Extension tracks time and syncs with backend.
- React Web App shows analytics, recommendations, and Spotify player.
- Backend exposes REST APIs, processes data, sends emails, and runs cron tasks.
- MongoDB Atlas stores users, screen time, moods, recommendations, playlists, challenges, trigger links, contact messages, and reviews.

## 2.2 Component Diagram (ASCII)

```
+------------------+      HTTPS       +----------------------+      MongoDB Atlas
|  Chrome          |  <------------>  |  Backend (Express)   |  <---------------->
|  Extension (MV3) |                  |  Routes/Controllers  |      Data Store
+------------------+                  +----------+-----------+
                                              ^
                                              |
                                 +------------+-----------+
                                 |    React Web App       |
                                 | (Dashboard, Settings,  |
                                 |  Spotify Player, etc.) |
                                 +------------------------+
```

## 2.3 Data Flow Diagram

- Screen Time (Extension → Backend)

```
Extension tracks active tab/time -> every 5 min creates snapshot (absolute totals)
 -> POST /screen-time with { userId, date, totalTime, tabs[] }
 -> Backend upserts ScreenTime by (userId, date)
 -> Extension periodically pulls GET /screen-time to keep local in sync
```

- Mood (Web App → Backend)

```
Webcam (face-api.js) -> local emotion detection -> POST /mood { mood, confidence }
 -> Backend stores per-user latest mood
```

- Recommendations (Web App → Backend)

```
POST /recommendations triggers rules engine using latest ScreenTime + Mood
 -> returns recommendation (break/message/music)
 -> if music: queries /spotify/playlist
 -> stores Recommendation + TriggerLink
```

- Spotify

```
GET /spotify/login -> OAuth URL
GET /spotify/callback -> saves tokens to User.spotifyToken
GET /spotify/playlist?mood=... -> returns playlist
POST /spotify/play -> start playback on device
```

- Challenges

```
GET /challenges -> list
POST /challenges/join -> add participant
Cron daily -> update reduction; GET /challenges/leaderboard -> rank
```

## 2.4 Database Schema Details

- User: userId, username, email, password (hashed), spotifyToken, preferences, timestamps
- Mood: userId (unique), mood, confidence, timestamp
- Recommendation: recommendationId, userId, timestamp, type, details, trigger, accepted
- Playlist: userId, spotifyPlaylistId, name, mood, timestamp, saved
- ScreenTime: screenTimeId, userId, date, totalTime, tabs[{ url, timeSpent }]; index (userId+date)
- Challenge: challengeId, title, description, duration, goal, startDate, participants[{ userId, reduction, lastUpdate }]
- TriggerLink: triggerLinkId, fromSource, recommendationId, timestamp, note
- Review: name, rating, text, status (pending/approved), timestamps
- ContactMessage: name, email, message, timestamps

---

# 3. Detailed System Flow

## 3.1 User Onboarding and Authentication

- Signup: POST /auth/signup with username, email, password
- Login: POST /auth/login, returns access JWT + refresh token
- Auth middleware validates JWT for protected routes; refresh flow endpoint available to the extension
- Logout clears tokens (frontend) and pauses extension tracking

## 3.2 Chrome Extension Workflow (Screen Time Tracking)

- Permissions: storage, tabs, windows, alarms, idle, webNavigation
- Core loop:
  - Track active tab hostname; ignore chrome:// URLs
  - Every second, increment time for active tab while focused and not idle
  - Two alarms every 5 minutes:
    - syncData: POST absolute daily snapshot to backend
    - pullServerData: GET /screen-time and reconcile; DB is source of truth
  - Offline/Idle: queue snapshots locally; send later
  - JWT refresh: automatic retry on 401 via refresh endpoint
  - Badge indicates status (tracking/paused/sync/etc.)

## 3.3 Dashboard Workflow

- Detects extension presence (messaging)
- Loads /auth/profile, /mood/latest, /recommendations, /screen-time
- Components: MoodDetection, Recommendations, Analytics (charts), Leaderboard, Spotify connect
- Polls data every 5 minutes

## 3.4 Mood Detection Module (Local)

- face-api.js models loaded in-browser
- Confidence threshold and significant change heuristics
- No images stored or sent; only mood + confidence posted to backend
- User can correct mood

## 3.5 Recommendation Engine

- Rule examples:
  - > 5h and mood=stressed → calm playlist
  - > 3h and mood=tired → relax playlist
  - mood=happy → motivational message
  - default → neutral message
- Saves Recommendation + TriggerLink, returns actionable item to UI

## 3.6 Spotify Integration and Music Playback

- OAuth via /spotify/login and /spotify/callback
- Tokens stored in User.spotifyToken; refresh if near expiry
- GET /spotify/playlist returns mood-specific playlist, caches results
- POST /spotify/play attempts playback on active device (premium required)

## 3.7 Challenges and Leaderboard System

- Create/list/join challenges
- Daily reduction calculation via cron
- Leaderboard aggregates top performers; respects privacy settings (anonymous display)

## 3.8 Profile Management

- GET /auth/profile returns username, email, spotifyToken presence, preferences
- Saved playlists listing and trends endpoints available

## 3.9 Settings Configuration

- POST /settings updates preferences { webcamEnabled, notifyEvery, showOnLeaderboard }
- Notification cadence based on notifyEvery (off/2h/4h)

## 3.10 About and Contact Functionality

## 3.11 Review Submission and Approval Flow

- Submit Review (User):

  - Endpoint: `POST /reviews`
  - Body: `{ name, rating, text }`
  - Validation: rating bounds (e.g., 1–5), text length, profanity filter (optional).

- Pending State:

  - New reviews are stored with status `pending`.
  - Not visible on public pages until approved.

- Review Approval:

  - Endpoint: `PATCH /reviews/:id`
  - Action: Set `status` to `approved` or `rejected`.
  - Only authorized users can approve. Details of authorization are enforced via role/permissions in auth middleware (implementation dependent) without exposing environment secrets.

- Display on Landing Page:

  - Endpoint: `GET /reviews?status=approved&limit=...`
  - Frontend lists approved reviews (e.g., carousel/section on Landing page).

- Auditing:
  - All status changes are logged via the backend logger.
  - Optional timestamps allow tracking of when a review was approved.
- Static About page with features and privacy policy
- Contact form posts to /contact and persists messages

---

# 4. Backend Processes

## 4.1 API Endpoints Overview

- Auth: `/auth/signup`, `/auth/login`, `/auth/profile`, `/auth/playlists`, `/settings`
- Mood: `POST /mood`, `GET /mood/latest`, `GET /mood/trends`
- Recommendations: `POST /recommendations`, `GET /recommendations`, `PATCH /recommendations/:id`
- Spotify: `/spotify/login`, `/spotify/callback`, `/spotify/playlist`, `/spotify/play`, `/spotify/playlist/:id`, `/spotify/unlink`
- Challenges: `POST /challenges`, `GET /challenges`, `POST /challenges/join`, `POST /challenges/progress`, `GET /challenges/leaderboard`
- Screen Time: `POST /screen-time`, `GET /screen-time`, `GET /screen-time/trends`
- Contact: `POST /contact`
- Reviews: `POST /reviews` (submit), `GET /reviews` (list approved), `PATCH /reviews/:id` (approve/reject by authorized users)

## 4.2 Database Operations

- Upserts: ScreenTime (unique per user+date), Mood (unique per user)
- Inserts: User, Recommendation, Playlist, Challenge, TriggerLink, ContactMessage, Review
- Updates: User (tokens, preferences), Recommendation (accepted), Playlist (saved), Challenge (participants), Review (approval)
- Aggregations for trends and leaderboard joins

## 4.3 Cron Jobs and Scheduled Tasks

- node-cron task daily at 00:00 IST updates challenges progress and reductions
- Token refresh handled on-demand by Spotify routes

## 4.4 Authentication and Security

- JWT access token for protected routes; refresh token for renewal
- Bcrypt password hashing
- CORS restricted to frontend domain(s)
- Role-based checks for admin endpoints

## 4.5 Error Handling, Logging, and Rate Limiting

- Centralized try/catch in routes with HTTP status mapping
- Winston logger for requests and errors; important actions logged
- Password reset flow enforces rate limits (min 60s between sends, 3 requests/hour/email; max 5 verification attempts)
- Consider adding general API rate limiting (e.g., express-rate-limit) in production

## 4.6 Email Delivery (AWS SES/Resend)

- SES via HTTPS API (Backend/utils/sesMailer.js):
  - Uses @aws-sdk/client-sesv2 with AWS credentials + region
  - `sendPasswordResetCodeSES(to, code)` sends templated HTML + text
- Resend as alternative HTTP provider: `sendPasswordResetCodeResend(to, code)`
- SMTP/Nodemailer (legacy/testing): optional fallback; production prefers SES. No secrets are documented in this file.

---

# 5. Frontend Components

## 5.1 Page Structure and Navigation

- App.js uses React Router with protected routes
- Navbar for authenticated flows: Dashboard, Challenges, Profile, Settings, About, Logout
- Pages in src/pages: Landing, Dashboard, Challenges, Profile, Settings, About, Privacy, ForgotPassword

## 5.2 Key React Components

- AuthForm: signup/login, validation, toasts
- MoodDetection: webcam, local inference, correction
- SpotifyPlayerComponent: playback controls with token management
- Chart components: bar/pie for analytics; mood frequency
- Leaderboard: top performers with ranks

## 5.3 State Management and Hooks

- useState/useEffect for mood, recommendations, user data
- Context for auth state (token, userId)
- Custom hooks: useAuth, usePolling (5-minute refresh)

## 5.4 Third-Party Integrations

- Chart.js for analytics
- react-toastify for notifications
- face-api.js for expressions
- react-spotify-web-playback for premium playback

## 5.5 UI/UX Design Considerations

- Tailwind responsiveness
- Accessibility: ARIA labels, keyboard navigation
- Clear feedback via toasts and badges

---

# 6. Deployment and Scalability

## 6.1 Frontend Deployment (Vercel)

- Production domain: https://www.chillboard.in/
- Set environment variables for backend URL

## 6.2 Backend Deployment (Render, Docker, GHCR, GitHub Actions)

- Dockerfile (Backend/Dockerfile): Node 20 Alpine, prod install, expose 5000
- GitHub Actions workflow (.github/workflows/docker-publish.yml):
  - On push to main and tags, builds Backend image and publishes to GHCR
  - Cosign signs images
  - Buildx cache enabled
- Render runs Node.js service with environment variables pointing to MongoDB Atlas and third-party credentials

## 6.3 Chrome Extension Deployment

- Manifest V3; prepare submission to Chrome Web Store with proper description, icons, and privacy policy (Privacy_Policy.pdf included)

-## 6.4 Environment Variables and Configuration

- Backend (Backend/.env) — define variable names only (no secrets or sample values in docs):
  - Core: `MONGO_URI`, `PORT`, `JWT_SECRET`
  - Spotify: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
  - Email: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_FROM`
  - Optional: `RESEND_API_KEY`
  - Optional SMTP (testing): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - CORS/URLs: `FRONTEND_URL`, `RENDER_URL` (as applicable)
- Frontend (frontend/.env):
  - REACT_APP_BACKEND_URL, other public settings
- Extension (manifest.json/background.js): backend hosts in host_permissions; uses https://chillboard-6uoj.onrender.com and https://www.chillboard.in/

## 6.5 Scalability Considerations

- MongoDB sharding for scale
- Backend horizontal scaling behind load balancer
- Caching (e.g., Redis) for hot data like playlists
- Async jobs and queues for heavy tasks (future)

---

# 7. Privacy and Security Considerations

## 7.1 Data Handling and Storage

- Store anonymized hostnames (no full URLs) for screen-time
- Store only mood string and confidence (no images)
- Encrypt/securely store Spotify tokens in DB

## 7.2 Local Processing (Mood Detection)

- All webcam processing stays in-browser
- No images or raw frames leave the device

## 7.3 User Consent and Controls

- Settings: webcamEnabled, notifyEvery, showOnLeaderboard
- Privacy policy available in-app and repo

## 7.4 Security Measures

- HTTPS for all API calls
- JWT validation on every protected route
- Bcrypt for passwords
- CORS restricted to known domains
- Consider rate limiting and bot protection in production

---

# 8. Testing and Quality Assurance

## 8.1 Unit Tests

- Backend: Jest tests for /auth, /mood, /recommendations (recommended)
- Frontend: React Testing Library for AuthForm, MoodDetection (mock face-api.js)

## 8.2 Integration Tests

- Cypress E2E covering login → dashboard → mood detection → recommendation → playback
- Postman collections for all API endpoints

## 8.3 Edge Cases and Error Scenarios

- No extension installed → dashboard prompts install
- No webcam → mood defaults or skips
- Spotify non-premium → guardrails in player
- Offline extension → queued data, retry logic
- Invalid token → refresh or relogin

## 8.4 Manual Testing

- Extension tracking across sessions, offline/idle behavior, midnight reset
- Dashboard: mood correction, playlist save, charts
- Challenges: join/progress/leaderboard correctness

---

# 9. Setup & Development

## 9.1 Repository Structure

```
Backend/
ChillBoardExtension/
frontend/
docs/
```

## 9.2 Local Development

- Backend

```
cd Backend
npm install
# Create .env with MONGO_URI, JWT_SECRET, PORT, and optional providers (SES/Resend/Spotify)
npm run dev   # or npm start
```

- Frontend

```
cd frontend
npm install
# Create .env with REACT_APP_BACKEND_URL
npm start
```

- Chrome Extension

```
Chrome → chrome://extensions → Developer mode → Load unpacked → select ChillBoardExtension/
```

## 9.3 Environment Setup

- Backend required: MONGO_URI, PORT, JWT_SECRET
- Spotify (playback/recommendations): SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI
- Email (prod): AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SES_FROM
- Optional: RESEND_API_KEY
- Optional SMTP (dev/testing)

## 9.4 Running in Docker (Backend)

```
# Build image from Backend/Dockerfile
docker build -t chillboard-backend:latest ./Backend
# Run container (example)
docker run -p 5000:5000 --env-file Backend/.env chillboard-backend:latest
```

---

# 10. Troubleshooting & FAQ

- Screen-time not syncing
  - Check extension badge and console logs
  - Verify JWT validity; try re-login (refresh token flow handled in extension)
  - Backend URL must be present in host_permissions (manifest.json)
- SES email not sending
  - Verify AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SES_FROM
  - Check SES sandbox/production and verified identities
  - Fallback: use Resend (RESEND_API_KEY)
- Spotify playback fails
  - Requires Premium; ensure device active
  - Re-auth if token expired
- CORS errors
  - Ensure backend CORS allows Vercel domain and localhost dev
- Admin endpoints 401/403
  - Confirm role/permissions and admin auth logic
- Rate limits in password reset
  - Follow intervals (60s) and hourly limits; check logs for throttling

---

# 11. Best Practices

- Security-first: least privilege, secrets in env vars, never commit keys
- Privacy by design: minimize data, local processing for webcam
- Clear logging and observability (Winston)
- Coding standards: linting/formatting, small modules, clear names
- Operational hygiene: CI builds, signed container images (cosign), reproducible builds

---

# 12. Future Enhancements

- Mobile apps (React Native)
- Predictive ML recommendations
- Social sharing for challenges
- Calendar/Fitbit integrations
- Deeper analytics and accessibility enhancements
- Redis cache and async queues for scale

---

# 13. Conclusion

ChillBoard combines privacy-preserving mood detection, accurate screen-time tracking, and personalized wellness recommendations in a scalable, modern architecture. With clear separation of concerns (extension/web/backend), solid CI/CD, and cloud-native hosting, it’s ready for onboarding new engineers and future growth.
