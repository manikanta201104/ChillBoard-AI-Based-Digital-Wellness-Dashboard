# ChillBoard Interview Prep

## Architecture Highlights
- Full-stack app: React frontend, Node/Express backend, MongoDB, and a MV3 Chrome extension.
- JWT-based auth; role-based access control for admin.
- Screen-time tracking with server as source of truth (merge strategy).
- Reviews system with moderation workflow.

## Key Challenges & Solutions
- Consistency between extension and DB
  - Problem: totals resetting/stale due to service worker lifecycle and overwrites.
  - Solution: server-side merge (max totals), client periodic pull from server, offline queue per day.
- Admin-only access
  - Problem: secure admin endpoints and UI.
  - Solution: role claim in JWT; verifyAdmin middleware; admin route guard in frontend.
- Real-time-ish updates without sockets
  - Problem: reflecting manual DB changes.
  - Solution: alarms + polling fetchServerData; optional websockets for future.
- Privacy and webcam permissions
  - Problem: request camera access only when needed.
  - Solution: explicit permission requests and settings persistence in UI.

## Sample Technical Q&A
- Chrome extension development
  - Q: How do you persist state across MV3 service worker restarts?
  - A: Use chrome.storage.local; snapshot frequently; rehydrate on startup/installed events.
- WebRTC and webcam handling
  - Q: How do you request and manage webcam permissions in a web app?
  - A: Use getUserMedia with constraints; handle permission states; store toggles in settings.
- Backend API security (JWT)
  - Q: How do you secure admin endpoints?
  - A: Include role claim in JWT; middleware verifies signature and role; fallback DB check.
- Real-time data syncing
  - Q: Without websockets, how do you keep clients updated?
  - A: Polling/alarms; ETag/If-None-Match; exponential backoff; push when needed.
- AI models for mood detection
  - Q: How do you run face-api.js in browser?
  - A: Load models, get video stream, run detection on requestAnimationFrame; throttle and manage CPU.

## Best Practices
- Defensive coding: validate inputs, handle timezones, network errors, retries.
- Principle of least privilege for routes and tokens.
- Observability: logs, badges, and user feedback.
- Separation of concerns: extension tracking vs web app UI.

## Soft Skills & Teamwork
- Collaborated on secure admin workflows and UX guardrails.
- Proactive debugging with logs, minimal repros, and incremental patches.
- Documentation-first approach to onboard teammates quickly.
