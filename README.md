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

## License
MIT (add your preferred license)
