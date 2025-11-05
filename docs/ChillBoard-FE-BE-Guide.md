# ChillBoard Frontend + Backend — Technical Guide

Version: 1.0

---

# Table of Contents

- 1. Scope and Overview
- 2. System Architecture (FE + BE)
- 3. Backend
  - 3.1 Tech Stack and Structure
  - 3.2 Models and Database
  - 3.3 API Endpoints Summary
  - 3.4 Authentication and Authorization
  - 3.5 Email and Password Reset (Brevo primary; HTTPS providers)
  - 3.6 Logging, Error Handling, and Limits
  - 3.7 Cron/Scheduling
- 4. Frontend (React)
  - 4.1 Pages and Navigation
  - 4.2 Key Components
  - 4.3 State Management and Hooks
  - 4.4 Integrations (Spotify, Charts, face-api.js)
  - 4.5 UX Considerations
- 5. Data Flows (FE⇄BE)
- 6. Deployment & CI/CD
- 7. Configuration (Environment Variables — names only)
- 8. Setup (Local Dev)
- 9. Troubleshooting & Diagnostics
- 10. Future Improvements

---

# 1. Scope and Overview

This guide documents the web app (Frontend React) and server (Backend Express + MongoDB). The Chrome Extension is documented separately.

Goals:
- Provide a clear mental model of how FE and BE interact.
- Detail APIs, models, auth, and integrations relevant to the web app.
- Document deployment and operations (Docker/GitHub Actions/Render/Vercel).

---

# 2. System Architecture (FE + BE)

- React SPA (frontend) communicates with Express REST APIs (backend).
- MongoDB Atlas stores persistent data (users, screen time, moods, playlists, recommendations, challenges, trigger links, reviews, contacts).
- Spotify OAuth and AWS SES are integrated via the backend.

ASCII component view:
```
React App (Vercel)  <——HTTPS——>  Express API (Render/Docker)  <——>  MongoDB Atlas
         |                                        |
         |                                        +——> Spotify Web API (OAuth)
         |                                        +——> AWS SES (email)
```

---

# 3. Backend

## 3.1 Tech Stack and Structure

- Node.js, Express, Mongoose (MongoDB), JWT, Winston, node-cron
- Notable paths:
  - routes/: `auth.js`, `mood.js`, `screenTime.js`, `recommendations.js`, `spotify.js`, `challenges.js`, `contact.js`, `reviews.js` (+ health/test)
  - models/: `user.js`, `mood.js`, `screenTime.js`, `playlist.js`, `recommendation.js`, `challenge.js`, `triggerLink.js`, `review.js`, `contactmessage.js`, `passwordReset.js`
  - utils/: `sesMailer.js`
  - config/: `env.js` (env validation)

## 3.2 Models and Database

- User: username, email, password (bcrypt), spotifyToken { accessToken, refreshToken, expiresIn, obtainedAt }, preferences, timestamps
- ScreenTime: userId, date (unique with userId), totalTime, tabs[{ url(hostname), timeSpent }]
- Mood: userId (unique), mood, confidence, timestamp
- Recommendation: userId, type (break/message/music), details, trigger, accepted, timestamp
- Playlist: userId, spotifyPlaylistId, name, mood, saved, timestamp
- Challenge: title, description, duration, goal, startDate, participants[{ userId, reduction, lastUpdate }]
- TriggerLink: fromSource (mood/screenTime/default), recommendationId, timestamp, note
- Review: name, rating, text, status (pending/approved/rejected), timestamps
- ContactMessage: name, email, message, timestamps
- PasswordReset: email, codeHash, expiresAt, attempts, lastSentAt, requestCount (TTL index)

Indexes: Uniques on critical fields (e.g., userId+date for ScreenTime, userId for Mood) to support upserts and fast queries.

## 3.3 API Endpoints Summary

- Auth: `/auth/signup`, `/auth/login`, `/auth/profile`, `/auth/playlists`, `/settings`
- Mood: `POST /mood`, `GET /mood/latest`, `GET /mood/trends`
- Screen Time: `POST /screen-time`, `GET /screen-time`, `GET /screen-time/trends`
- Recommendations: `POST /recommendations`, `GET /recommendations`, `PATCH /recommendations/:id`
- Spotify: `/spotify/login`, `/spotify/callback`, `/spotify/playlist`, `/spotify/play`, `/spotify/playlist/:id`, `/spotify/unlink`
- Challenges: `POST /challenges`, `GET /challenges`, `POST /challenges/join`, `POST /challenges/progress`, `GET /challenges/leaderboard`
- Reviews: `POST /reviews`, `GET /reviews` (approved), `PATCH /reviews/:id` (authorized approval/reject)
- Contact: `POST /contact`
- Health: `/health`

Notes:
- All protected routes expect `Authorization: Bearer <JWT>`.
- Review approval requires authorization; details enforced in middleware/role checks.

## 3.4 Authentication and Authorization

- JWT access token issued at signup/login; refresh token used by the extension and FE as needed.
- `authMiddleware` validates tokens for protected routes.
- Password hashing via bcrypt.

## 3.5 Email and Password Reset (Brevo primary; HTTPS providers)

- Password Reset flow:
  - Request: store codeHash with TTL, apply rate limits (min 60s, 3/hour/email). Fresh code is sent on each request, except if last send < 60s (idempotent success window).
  - Verify: compare code (bcrypt) and attempts (max 5).
  - Reset: update hashed password on success.
- Email delivery (HTTPS APIs only; no SMTP):
  - Primary: Brevo (Sendinblue) HTTP API.
  - Optional/Configurable fallbacks: Resend HTTP API, AWS SES (SESv2 client over HTTPS).
  - Unified sender configured via `SES_FROM` (e.g., `ChillBoard <no-reply@chillboard.in>`), must be verified with each enabled provider.

## 3.6 Logging, Error Handling, and Limits

- Winston logger with levels for info/warn/error.
- Consistent error handling and status codes.
- Specific limits in reset flow; consider global API rate limiting for production.

## 3.7 Cron/Scheduling

- node-cron daily at 00:00 IST updates challenge progress/reductions based on baselines.
- Spotify token refresh occurs on-demand per route.

---

# 4. Frontend (React)

## 4.1 Pages and Navigation

- Landing, Dashboard, Challenges, Profile, Settings, About, Privacy, ForgotPassword.
- Protected routes require a valid JWT from local storage/context.

## 4.2 Key Components

- Auth form (React Hook Form + validation + toasts)
- Mood detection (webcam + face-api.js + correction UI)
- Recommendations panel (message/break/music)
- Spotify player integration (react-spotify-web-playback)
- Charts (Chart.js) for time and mood analytics
- Leaderboard (top participants)

## 4.3 State Management and Hooks

- React Context for auth state (token, userId).
- `useEffect` polling every 5 minutes for fresh data.
- Custom hooks such as `useAuth`, `usePolling`.

## 4.4 Integrations (Spotify, Charts, face-api.js)

- Spotify OAuth encoded via backend redirects; FE stores access token for player.
- face-api.js models loaded lazily; only mood and confidence sent to backend.
- Charts render daily and weekly trends.

## 4.5 UX Considerations

- Responsive UI (Tailwind CSS)
- Accessibility with ARIA and keyboard navigation
- Toast notifications for feedback

---

# 5. Data Flows (FE⇄BE)

- Profile: FE → GET `/auth/profile` → render user and preferences
- Mood: FE → POST `/mood` on significant change → BE upsert → FE fetch latest
- Screen Time: FE dashboard pulls `/screen-time` for analytics (extension is primary source)
- Recommendations: FE → POST `/recommendations` → BE rules → response + persistence
- Spotify: FE triggers `/spotify/login` → callback stores tokens on BE → FE retrieves playlist and handles playback
- Reviews: FE → POST `/reviews` → pending → visible after authorized approval via `PATCH /reviews/:id`

---

# 6. Deployment & CI/CD

- Frontend: Vercel; production domain `https://www.chillboard.in/`
- Backend: Render or containerized using Docker; GitHub Actions builds/pushes images to GHCR and signs with cosign.
- MongoDB Atlas: cloud-hosted database.

---

# 7. Configuration (Environment Variables — names only)

- Backend:
  - Core: `MONGO_URI`, `PORT`, `JWT_SECRET`
  - Spotify: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
  - Email (HTTPS providers):
    - Sender (shared): `SES_FROM`
    - Primary: `BREVO_API_KEY`
    - Optional fallbacks: `RESEND_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
  - CORS/URLs: `FRONTEND_URL`, `RENDER_URL`
- Frontend:
  - `REACT_APP_BACKEND_URL`

---

# 8. Setup (Local Dev)

- Backend
```bash
cd Backend
npm install
# Create .env with the required variables (names listed above)
npm run dev   # or npm start
```

- Frontend
```bash
cd frontend
npm install
# Create .env with REACT_APP_BACKEND_URL
npm start
```

---

# 9. Troubleshooting & Diagnostics

- 401/403 on protected APIs: check JWT presence/expiry and CORS.
- Spotify playback fails: ensure premium account and valid token; re-auth if needed.
- Email not delivered: verify sender/domain with provider (Brevo/Resend/SES), check credentials, and logs; enable alternate provider if primary is unavailable.
- Charts empty: check data availability, extension sync timing, and correct user.
- CORS issues: ensure backend allows FE origin (e.g., https://www.chillboard.in).

---

# 10. Future Improvements

- Introduce global API rate limiting and request ID correlation logging.
- Caching (Redis) for playlists and recent recommendations.
- Background workers/queues for heavy tasks (email bursts, analytics).
- Feature flags and A/B testing for recommendation rules.
