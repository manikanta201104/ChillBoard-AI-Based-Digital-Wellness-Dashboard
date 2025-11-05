# ChillBoard — Interview Deep Dive

Version: 1.0

---

# How to use this document

- Use these questions to prepare for system design, backend, frontend, extension, DevOps, and security interviews about ChillBoard.
- Includes suggested talking points and trade-offs; tailor details to actual code.

---

# 1. Product & Architecture

1) What problem does ChillBoard solve and for whom?
- Digital fatigue for students/professionals; provides analytics, mood-aware recommendations, community challenges.

2) High-level architecture in 60 seconds?
- Chrome MV3 Extension (tracking) + React SPA (dashboard) + Express/MongoDB backend + Spotify integration + multi-provider email over HTTPS (Brevo primary, optional Resend/SES) + CI/CD with Docker and GitHub Actions; frontend on Vercel, backend on Render.

3) Why a Chrome Extension vs. purely web?
- Only the extension can reliably track active tab, window focus, and idle state. Web alone can’t observe global browsing.

4) Why MongoDB?
- Flexible schemas for evolving analytics (screen time/mood/playlist/challenge), simple upserts, TTL for reset codes.

5) What are the primary data flows?
- Extension→Backend (screen time), Web→Backend (mood), Web→Backend (recommendations), Web→Spotify via Backend, Cron→Challenges.

6) Single-tenant vs multi-tenant concerns?
- Multi-tenant by userId isolation; CORS restricted; JWT identifies tenant.

---

# 2. Data Modeling & Persistence

7) How is daily screen time stored?
- One document per (userId, date), with totalTime and aggregated tabs[{url, timeSpent}]; index ensures uniqueness.

8) Why aggregate by hostname?
- Privacy and compression. Avoid storing full URLs; keeps payload small and anonymized.

9) How do you prevent double-counting on syncs?
- Extension posts absolute snapshot; backend upserts by (userId, date). Client pulls server state to align; lastSyncedTotalTime baseline prevents drift.

10) How are mood entries stored?
- Upsert last mood per user with timestamp and confidence; trends aggregate by week.

11) How are recommendations persisted?
- Store type, details, trigger, accepted; create TriggerLink for tracking source.

12) How are challenges modeled?
- Challenge document with participants array; cron updates reductions daily using baselines.

13) Password reset persistence?
- PasswordReset with codeHash, TTL, rate-limits per email; attempts tracked; auto-expire via TTL index.

---

# 3. Backend APIs & Security

14) What are key backend endpoints?
- Auth, Mood, ScreenTime, Recommendations, Spotify, Challenges, Reviews, Contact, Health.

15) How is authentication implemented?
- JWT access token; refresh token flow for extension/FE; middleware guards protected routes.

16) How are roles enforced (e.g., approvals)?
- Auth middleware checks claims; approval routes require specific permissions (implementation detail hidden from docs).

17) How is CORS handled?
- Whitelist specific domains (localhost, prod FE, backend). Reject all others.

18) Rate limiting strategy?
- Strict in reset flow; recommend express-rate-limit or a proxy for global API throttling.

19) Error handling/logging?
- Try/catch with clear status codes; Winston logs requests, errors, critical events (signup, reset, approvals).

20) Sensitive data handling?
- No full URLs, no images. Tokens stored server-side; secrets via env.

---

# 4. Chrome Extension (MV3)

21) Why MV3 service worker?
- Battery-efficient, event-driven, required by Chrome. Background replaced by service worker.

22) How does tracking work?
- Every second increments current hostname when window focused and not idle; paused via chrome.idle and focus events; media heuristic.

23) What’s the sync protocol?
- Dual 5-min alarms: push absolute daily snapshot (POST) and pull server (GET). Offline queues per-day snapshots and retries with backoff.

24) How do you avoid inconsistencies?
- Server is source of truth; pull overwrites local. lastSynced* fields keep baselines aligned.

25) JWT refresh in extension?
- On 401, call refresh endpoint; if fail, clear JWT, prompt re-login; tracking disabled when unauthenticated.

26) Privacy in extension?
- Hostnames only; no content or full URLs. User controls via web app.

27) Midnight rollover logic?
- Snapshot previous day, reset counters, queue unsent day, and trigger a sync.

---

# 5. Frontend (React) & UX

28) How does the dashboard verify the extension?
- Messaging ping; if missing, show install prompt with link to store or unpacked load instructions in dev.

29) How is mood detection done?
- face-api.js models loaded client-side; send only mood string + confidence; user can correct.

30) How are recommendations presented?
- Cards: break timer, message, music player linking to Spotify; accepted flag tracked.

31) How does Spotify playback work?
- OAuth via backend; FE uses access token with react-spotify-web-playback; premium required.

32) Accessibility considerations?
- ARIA roles, keyboard nav, contrasts; toasts and badge cues.

33) State management?
- Context for auth, hooks for polling and data fetching; component-level useState/useEffect.

---

# 6. Integrations

34) Spotify token lifecycle?
- Save tokens with obtainedAt/expiresIn; refresh on BE near expiry; FE retries on 401.

35) Email delivery (providers)?
- HTTPS only, no SMTP. Primary: Brevo (Sendinblue). Optional fallbacks: Resend and AWS SES (SESv2). Shared sender identity (SES_FROM) verified per provider. Templated subject/text/html with a modern OTP card.
  - Resend policy: fresh OTP on each request except within 60s (idempotent window); 3/hour cap; 5 verify attempts.

36) Docker & GitHub Actions?
- Backend Dockerfile (prod install, node:20-alpine); GitHub Actions builds/pushes image to GHCR and signs with cosign.

37) Hosting?
- Vercel for FE; Render (or container) for BE; MongoDB Atlas for DB.

---

# 7. Reliability, Scale & Cost

38) What breaks first at scale?
- Hot aggregates (leaderboard, trends) → add caching (Redis), pre-compute with cron or background jobs.

39) DB scaling plan?
- Mongo sharding; proper compound indexes; projections and pagination.

40) API scaling?
- Horizontal BE behind LB; stateless services; CDN for assets.

41) Extension scale risks?
- Sync storms at 5-min cadence → jitter per client; exponential backoff; server-side rate limiting.

42) Cost controls?
- Use HTTP email APIs with free/low tiers (Brevo primary). Avoid SMTP egress issues. Compress responses; cache playlists; limit noisy logs.

---

# 8. Security & Privacy

43) Threat model basics?
- JWT theft/CSRF/CORS bypass; token misuse; PII exposure. Mitigations: HTTPS only, strict CORS, short-lived tokens, refresh rotation.

44) Why only hostnames?
- Reduce sensitivity and storage footprint; strong privacy posture.

45) Secret management?
- Environment variables; never commit keys; use managed secrets in hosting provider.

46) Password policy?
- Bcrypt hashing, strength validation on client/server, reset rate-limits and TTL.

47) Abuse prevention?
- Future global rate-limits and captcha on sensitive endpoints.

---

# 9. Testing & Observability

48) Unit testing focus areas?
- Auth, recommendations rule engine, password reset limits, SES mailer wrapper.

49) Integration/E2E?
- Cypress: login → dashboard → mood → recommendation → playback; Postman suite for APIs.

50) Observability?
- Structured logs (Winston), request IDs, log aggregation; plan metrics (p95 sync time, error rates).

---

# 10. Debugging Scenarios (with approaches)

51) Extension shows tracking but dashboard empty
- Check host_permissions and CORS; verify JWT valid; force manual sync; inspect server logs for upsert errors.

52) Sync timeouts on mobile hotspots
- Increase server timeouts modestly; client backoff; confirm Render instance responsiveness.

53) Spotify 401 during playback
- Refresh token on BE; surface re-auth CTA; handle non-premium gracefully.

54) SES bounces or sandbox blocks
- Verify identities, move out of sandbox, region match; graceful fallback to Resend.

55) Leaderboard wrong after time zone shift
- Normalize dates to UTC for storage; render in user locale; cron aligned to target timezone.

56) Reset code always invalid
- Check hashing mismatch, TTL expiry, or exceeded attempts; add more granular logs.

57) Excess CPU from extension
- Confirm 1s interval and early exits when idle/unfocused; avoid costly parsing; batch writes to storage.

---

# 11. Design Trade-offs

58) Absolute vs incremental sync snapshots
- Absolute is idempotent and simpler server-side; incremental smaller but requires conflict resolution; we chose absolute.

59) Local mood detection vs server
- Local preserves privacy and reduces bandwidth; server would centralize compute but risks privacy and cost.

60) MongoDB vs relational DB
- Flexible for evolving shapes; trade-off: fewer rigid constraints; mitigated with indexes and validation in Mongoose.

61) SES vs SMTP Gmail
- SES is scalable and API-driven; Gmail SMTP rate-limited and fragile; SES chosen for production.

---

# 12. System Design Extensions (What-ifs)

62) How to add Android/iOS?
- Shared API; React Native app; push notifications for reminders; background job constraints vary by OS.

63) How to support Firefox/Edge extensions?
- WebExtensions API compatibility; adjust manifest; handle service worker differences and store listings.

64) How to do team/enterprise accounts?
- Org model with members/roles; aggregated dashboards; per-tenant domains; SSO (OIDC/SAML).

65) How to add real-time notifications?
- WebSockets or Web Push; server events for new recommendations; notification preferences persist in user profile.

---

# 13. Behavioral & Delivery

66) Biggest challenge you solved?
- Making extension sync robust (offline, timeouts, JWT refresh) and consistent with DB as source of truth.

67) How did you ensure privacy?
- Hostname-only tracking, local mood detection, clear settings, and privacy policy document.

68) How did you validate the UX?
- Iterative feedback, telemetry (planned), and goals around clarity (badges, toasts, install prompts).

69) What would you refactor first?
- Extract recommendation rules into a dedicated module with versioned strategies and tests.

70) What would you add for production-readiness?
- Global rate-limits, request correlation IDs, SLOs, error budgets, runbooks.

---

# 14. Glossary (quick terms)

- Absolute snapshot: full day totals synced each time
- Baseline: last server-acknowledged totals
- TTL index: auto-expire reset codes
- MV3: Manifest Version 3, service-worker-based extensions

---

# 15. Appendix: Rapid Recall

- Dual-alarm sync every 5 minutes (push + pull)
- Server is source of truth
- Mood local; hostnames only
- CI: Docker + GH Actions + GHCR + cosign
- Deploy: Vercel (FE), Render (BE), Atlas (DB)
