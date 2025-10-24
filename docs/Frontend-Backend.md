# ChillBoard: Frontend + Backend Architecture

## Overview
- **Frontend**: React (Vite/CRA), TailwindCSS, axios.
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT auth.
- **Extension**: MV3 service worker integrates with backend for screen time (covered in separate doc).

---

## Frontend Architecture
- **Pages**
  - `Landing.js`: Marketing page, shows approved reviews and renders `ReviewForm` for logged-in users.
  - `Dashboard` (not listed here): Authenticated user dashboard with stats and charts.
  - `AdminDashboard.jsx`: Admin-only. Manage users, challenges, contacts, and approve reviews.
  - `Settings` (if present): Webcam/notification settings.
- **Components**
  - `AuthForm`: Handles signup/login; persists `jwt`, `refreshToken`, `userId`, and `role`.
  - `ReviewForm.jsx`: Standalone review submission (name, email, rating, text); POSTs to `/api/reviews`.
- **State Management**
  - Local component state via React hooks; tokens/role persisted in `localStorage`.
  - Admin route guard checks `role === 'admin'` (also enforced server-side).
- **Networking**
  - `src/utils/api.js`: Axios instance with baseURL and helpers for all API endpoints.

### Frontend Code Structure
```
frontend/
  src/
    components/
      AuthForm.js
      ReviewForm.jsx
    pages/
      Landing.js
      AdminDashboard.jsx
    utils/
      api.js
```

---

## Backend Architecture
- **Server**
  - `index.js`: Express setup, middleware, routers mounted, logger, DB connection.
- **Middleware**
  - `authMiddleware`: Verifies JWT, attaches `{ userId, role }` to `req.user`.
  - `verifyAdmin`: Requires `role === 'admin'` (trust JWT fast-path + DB fallback).
- **Models**
  - `user.js`: Users with `userId`, `email`, `role`, `active`, tokens.
  - `screenTime.js`: Per-user daily records.
  - `review.js`: User reviews with `status` pending/approved/rejected.
- **Routes**
  - `routes/auth.js`: Signup/login/profile/settings.
  - `routes/screenTime.js`: GET/POST daily screen time; safe merge semantics (never decrease totals).
  - `routes/reviews.js`: Public GET approved reviews; Auth POST submit (pending).
  - `routes/admin.js`: Admin-only: users, challenges, contacts, reviews moderation.

### Backend Code Structure
```
Backend/
  index.js
  middleware/
    auth.js
  models/
    review.js
    screenTime.js
    user.js
  routes/
    admin.js
    auth.js
    reviews.js
    screenTime.js
    ...
```

---

## API Endpoints Summary
- Auth
  - POST `/auth/signup` (blocks predefined admin email)
  - POST `/auth/login` (fixed admin account gets `role: 'admin'`)
  - GET `/auth/profile` (returns `role`, `active`)
  - GET/PATCH `/auth/user/settings`
- Screen Time
  - GET `/screen-time`
  - POST `/screen-time` (merges with existing; uses max for `totalTime` and per-URL time)
  - GET `/screen-time/trends`
- Reviews
  - GET `/reviews` (public, approved only)
  - POST `/reviews` or `/api/reviews` (auth required; creates pending)
- Admin (require admin JWT)
  - GET `/admin/users`, PATCH `/admin/users/:userId`, DELETE `/admin/users/:userId`
  - GET `/admin/reviews?status=pending|approved|rejected`
  - PATCH `/admin/reviews/:id/approve`
  - Challenges, Contacts management

---

## Review Submission and Approval Flow
1. User (authenticated) submits via `ReviewForm` → POST `/api/reviews`.
2. Backend creates review with `status: 'pending'`.
3. Admin views pending reviews at `/admin/reviews?status=pending`.
4. Admin approves → PATCH `/admin/reviews/:id/approve`.
5. Approved reviews appear on Landing via GET `/reviews`.

---

## JWT Authentication Implementation
- On login, server signs JWT `{ userId, role }`.
- Frontend stores `jwt` and `role` in `localStorage`.
- `authMiddleware` verifies token on protected endpoints; `verifyAdmin` enforces admin-only.
- Refresh logic for extension token exists on `/screen-time/refresh-token`.

---

## Running Locally
### Prerequisites
- Node.js LTS, npm/yarn
- MongoDB URI

### Backend
```
cd Backend
cp .env.example .env  # ensure MONGO_URI and JWT secret set; optionally ADMIN_PASSWORD_HASH
npm install
npm run dev   # or npm start
```
- Server: http://localhost:5000 (adjust baseURL in frontend if needed)

### Frontend
```
cd frontend
npm install
npm start   # or npm run dev
```
- App: http://localhost:3000 (or your dev port)

---

## Data Flow Diagrams
### Login + Role
```
[User] -> POST /auth/login -> [Express] -> [Mongo]
                     <- JWT {userId, role} -
Frontend stores jwt+role -> Guards routes
```

### Review Flow
```
[Landing: ReviewForm] --POST /api/reviews--> [Express] --insert--> [Mongo: reviews(pending)]
[AdminDashboard] --GET /admin/reviews?status=pending--> [Express] --query--> [Mongo]
[AdminDashboard] --PATCH /admin/reviews/:id/approve--> [Express] --update--> [Mongo]
[Landing] --GET /reviews--> [Express] --query--> [Mongo]
```

### Screen Time Sync
```
[Extension] --GET/POST /screen-time--> [Express] --merge&upsert--> [Mongo]
[Extension] <-periodic GET today- [Express]
DB is the source of truth (never decrease totals)
```
