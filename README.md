# ChillBoard – AI-Based Digital Wellness Dashboard

ChillBoard is a full‑stack project with a Chrome Extension for screen‑time tracking, a React web app for AI‑assisted wellness, and a Node.js/Express backend with MongoDB.

## Tech Stack
- Frontend: React, TailwindCSS, axios
- Backend: Node.js, Express, MongoDB (Mongoose), JWT
- Extension: Chrome MV3 service worker

## Monorepo Structure
```
Backend/
ChillBoardExtension/
frontend/
docs/
```

## Quick Start

### Backend
```
cd Backend
npm install
cp .env.example .env   # set MONGO_URI and JWT secret; optionally ADMIN_PASSWORD_HASH
npm run dev            # or npm start
```
Server runs on http://localhost:5000 (adjust in frontend if needed).

### Frontend
```
cd frontend
npm install
npm start              # or npm run dev
```
App runs on http://localhost:3000 (or your configured dev port).

### Chrome Extension
1) Open chrome://extensions → enable Developer mode
2) Load unpacked → select `ChillBoardExtension/`
3) Log in via web app to obtain JWT; the extension syncs automatically

## Key Features
- Screen‑time tracking with server‑side merge (DB is source of truth)
- AI wellness features and recommendations
- Reviews with admin moderation flow
- Admin panel: users, reviews, challenges, contacts

## Documentation
- docs/Frontend-Backend.md
- docs/Extension.md
- docs/Interview-Prep.md

## Security
- Role‑based JWT with admin enforcement on `/admin/*`
- Admin login restricted to predefined account (see auth docs and environment)

## Forgot Password Flow (Backend)

- Endpoints (under `/auth`):
  - `POST /auth/forgot-password/request` → body: `{ email }`
  - `POST /auth/forgot-password/verify` → body: `{ email, code }`
  - `POST /auth/forgot-password/reset` → body: `{ email, code, newPassword }`

- Storage:
  - Mongoose model `models/passwordReset.js` stores `email`, `codeHash`, `expiresAt`, `attempts`, `lastSentAt`, `requestCount`.
  - TTL index auto‑removes expired entries.

- Rules & Limits:
  - 6‑digit code, valid for 10 minutes.
  - Rate‑limit: min 60s between sends, max 3 requests/hour per email.
  - Max 5 verification attempts per code.

- SMTP Configuration (Backend/.env):
  ```env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=your_smtp_username
  SMTP_PASS=your_smtp_password
  SMTP_FROM="ChillBoard <no-reply@yourdomain.com>"
  ```

- Testing with curl:
  ```bash
  # 1) Request code
  curl -X POST http://localhost:5000/auth/forgot-password/request \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com"}'

  # 2) Verify code (replace 123456 with the actual code from email)
  curl -X POST http://localhost:5000/auth/forgot-password/verify \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","code":"123456"}'

  # 3) Reset password
  curl -X POST http://localhost:5000/auth/forgot-password/reset \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","code":"123456","newPassword":"Newpass123"}'
  ```

- Simple HTML helper (dev only): `Backend/templates/forgot_password.html` sends the request from the browser for local testing.

## License
MIT (add your preferred license)
