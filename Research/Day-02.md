# Day 2 Summary: Research and Project Planning for ChillBoard

**Date**: June 03, 2025  
**Objective**: Research Chrome Extension APIs, TensorFlow.js/face-api.js, and Spotify Web API to prepare for ChillBoard development, and create a project plan to track tasks.

## 1. Chrome Extension Research
- **Task**: Studied Chrome Extensions documentation, focusing on `chrome.windows` and `chrome.tabs` APIs for tracking screen time and tab usage.
- **Key Findings**:
  - **APIs**:
    - `chrome.windows.getAll()`: Retrieves all open Chrome windows, with details like `focused` (true if active) and `tabs` (list of tabs). Used to check if Chrome is active for screen time tracking.
    - `chrome.windows.onFocusChanged`: Listens for focus changes, returning the window ID or `WINDOW_ID_NONE` (-1) if no Chrome window is focused. Used to start/pause screen time timer.
    - `chrome.tabs.query`: Gets open tabs and URLs (e.g., `youtube.com`). Used to track tab usage.
    - `chrome.tabs.onActivated`: Detects when a new tab becomes active.
  - **Permissions**: Requires `"windows"`, `"tabs"`, and `"storage"` in `manifest.json`.
  - **Limitations**: Incognito mode restricts URL access unless enabled; Linux may send extra `WINDOW_ID_NONE` events.
- **Notes**:
  - APIs support Manifest V3, suitable for ChillBoard’s Chrome extension (Day 3).
  - Example: `chrome.windows.getAll({ windowTypes: ['normal'] })` checks active windows; `chrome.tabs.query({ active: true })` gets current tab URL.
  - Resource: `developer.chrome.com/docs/extensions/mv3`.
- **Action**: Use `getAll` and `onFocusChanged` for screen time (Day 3); `query` for tab tracking (Day 4).

## 2. TensorFlow.js/face-api.js Research
- **Task**: Explored TensorFlow.js and face-api.js for emotion detection via webcam, focusing on Face-API.js’s expression recognition.
- **Key Findings**:
  - **TensorFlow.js**:
    - JavaScript library for browser-based ML, powers face-api.js.
    - Installation: `npm install @tensorflow/tfjs`.
    - Privacy: Runs locally, aligning with ChillBoard’s privacy focus.
  - **face-api.js**:
    - Models: `ssdMobilenetv1` (5.4 MB, face detection), `faceLandmark68Net` (350 KB, face alignment), `faceExpressionNet` (310 KB, emotions).
    - API: `detectAllFaces(video).withFaceLandmarks().withFaceExpressions()` outputs emotions (e.g., `{ happy: 0.8, sad: 0.1 }`).
    - Display: `drawFaceExpressions(canvas, results, 0.05)` shows emotions on a canvas.
    - Setup: Install via `npm i face-api.js`; host models in `public/models`.
    - Limitations: Less accurate with glasses or poor lighting.
  - **Browser Compatibility**: Works in Chrome, ideal for ChillBoard’s React frontend.
  - **Privacy**: Local processing ensures no webcam data leaves the device.
- **Notes**:
  - Use `ssdMobilenetv1` with `minConfidence: 0.8` for reliable face detection.
  - Tested Live Demos (`https://justadudewhohacks.github.io/face-api.js/`); webcam emotion detection is smooth.
  - Resource: `github.com/justadudewhohacks/face-api.js`, `www.tensorflow.org/js`.
- **Action**: Implement emotion detection in React (Day 13); display on Dashboard (Day 14).

## 3. Spotify Web API Research
- **Task**: Reviewed Spotify Web API docs for OAuth authentication and playlist retrieval; created a Spotify Developer app.
- **Key Findings**:
  - **API**:
    - Endpoints: `/v1/me/playlists` (user playlists), `/v1/recommendations` (music suggestions).
    - Scopes: `playlist-read-private`, `user-read-private`.
    - OAuth: Authorization Code Flow redirects to `http://localhost:3000/callback` with access token.
  - **Rate Limits**: Limited requests per minute; plan to cache responses.
  - **Developer App**:
    - Created app named “ChillBoard” in Spotify Developer Dashboard.
    - Client ID and Client Secret obtained and stored securely (not shared publicly).
    - Redirect URI: `http://localhost:3000/callback` (allowed for development, despite “insecure” warning).
    - Description: “ChillBoard tracks screen time, detects mood via webcam, and suggests Spotify playlists to boost well-being based on emotions (e.g., calm for stress).” (149 characters).
  - **Limitations**: Access token expires in 1 hour; requires refresh token logic.
- **Notes**:
  - Use Client ID/Secret in `.env` file (Day 6, backend setup).
  - Resource: `developer.spotify.com/documentation/web-api`.
- **Action**: Set up OAuth redirect route in React (Day 10); integrate playlist retrieval (Days 21–27).

## 4. Project Plan Creation
- **Task**: Created a Notion board to track tasks, breaking them into steps with dependencies and deadlines over 90 days (June 02–August 31, 2025).
- **Key Findings**:
  - **Tool**: Notion table with columns: `Task`, `Day`, `Status` (Not Started/In Progress/Done), `Dependencies`, `Notes`.
  - **Tasks Added** (examples):
    - Day 3: “Build Chrome extension for screen time” (depends on Day 2 research).
    - Day 13: “Implement webcam emotion detection” (depends on face-api.js setup).
    - Day 21–27: “Integrate Spotify API for playlists” (depends on OAuth setup).
  - **Dependencies**:
    - Backend setup (Day 6) before data sync (Day 9).
    - Extension data collection (Day 3–4) before Dashboard display (Day 11).
  - **Deadlines**: Aligned with 90-day plan (e.g., project report due August 16–20).
- **Notes**:
  - Board tracks all tasks from Days 1–90, ensuring organization.
  - Resource: Notion page URL saved for access.
- **Action**: Update board daily (e.g., mark Day 2 as Done); review dependencies before starting tasks.

## Summary
- **Completed**: Researched Chrome APIs (`windows`, `tabs`), TensorFlow.js/face-api.js (emotion detection), Spotify Web API (OAuth, playlists), and created a Notion project plan.
- **Outcomes**:
  - Chrome: Prepared to build extension with `getAll`, `onFocusChanged`, `query` (Day 3).
  - face-api.js: Confirmed `ssdMobilenetv1`, `faceExpressionNet` for emotion detection (Day 13).
  - Spotify: Obtained Client ID/Secret; ready for OAuth setup (Day 10).
  - Plan: Organized tasks with dependencies in Notion.
- **Next Steps**:
  - Day 3: Start building Chrome extension using `background.js`.
  - Continue updating Notion board and refining notes for implementation.

**Resources**:
- Chrome: `developer.chrome.com/docs/extensions/mv3`
- TensorFlow.js: `www.tensorflow.org/js`
- face-api.js: `github.com/justadudewhohacks/face-api.js`
- Spotify: `developer.spotify.com/documentation/web-api`