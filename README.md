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
- Robust Forgot Password with OTP and multi‑provider email delivery (HTTPS APIs)

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
  - Resend policy: a fresh code is sent on each request except when the last send was < 60 seconds ago (idempotent success within 60s).
  - Rate‑limit: max 3 requests/hour per email.
  - Max 5 verification attempts per code.

- Email Delivery (HTTPS APIs, no SMTP):
  - Providers: Brevo (primary), optional Resend and AWS SES as fallbacks.
  - Required env (Backend/.env or Render):
    ```env
    # Sender identity used across providers
    SES_FROM="ChillBoard <no-reply@yourdomain.com>"
    
    # Primary provider
    BREVO_API_KEY=...        # Brevo/Sendinblue API key (v3)

    # Optional fallbacks
    RESEND_API_KEY=...       # Resend HTTP API key
    AWS_ACCESS_KEY_ID=...    # If enabling SES
    AWS_SECRET_ACCESS_KEY=...
    AWS_REGION=ap-south-1
    ```
  - Make sure your From domain/email is verified with each provider you enable. For SES Sandbox, verify recipients or request production.

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

- Email template: modern, accessible dark card with large OTP and brief copy (see `Backend/utils/sesMailer.js`).

- Simple HTML helper (dev only): `Backend/templates/forgot_password.html` sends the request from the browser for local testing.

## Policies
- Email Policy: available at `/email-policy` in the web app UI.
- Privacy Policy: available at `/privacy`.

## License
MIT (add your preferred license)
