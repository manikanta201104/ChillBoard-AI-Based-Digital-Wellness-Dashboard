# ChillBoard - AI-Based Digital Wellness Dashboard - Day 53

## Overview
Welcome to Day 53 of the ChillBoard project! On July 24, 2025, we tested emotion detection accuracy with diverse faces under consistent lighting and validated the existing “Correct Mood” feature, ensuring inclusivity and user-driven reliability.

## Features Tested
- **Diverse Faces Test**: Verified emotion detection across 3–5 subjects with varied facial features.
- **Manual Correction Validation**: Confirmed the “Correct Mood” dropdown updates mood data in MongoDB.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- `.env` with `MONGO_URI`, `JWT_SECRET`, and CORS configured (from Day 24).
- Backend running (e.g., `http://localhost:5000`).
- Chrome browser with webcam access.

### Extension and App Setup
1. Navigate to `ChillBoard/extension/` and load in `chrome://extensions/` (Developer mode).
2. Start the frontend with `npm start` at `http://localhost:3000`.
3. Ensure TensorFlow.js and Face-API.js models are in `/models` (from Day 13).

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure `moodRouter.js` is configured for single-document updates (from Day 52).
3. Run `nodemon index.js` to start the server.

## Usage
1. **Test Setup**:
   - Log in at `http://localhost:3000/dashboard` with a test user.
   - Enable “Mood Detection” and allow webcam access with consistent lighting.
2. **Diverse Faces Test**:
   - Have 3–5 subjects display happy/stressed/tired for 1–2 minutes each.
   - Record detected moods and confidence scores.
3. **Manual Correction Test**:
   - Use the “Correct Mood” dropdown to adjust a misdetected mood.
   - Verify updates in MongoDB.
4. **Documentation**:
   - Record accuracy and capture screenshots.

## File Changes
### Frontend
- **`Dashboard.js`**: No changes; existing mood detection and correction logic validated.

## Testing
- **Diverse Faces Test**: Confirm >70% confidence across subjects; note facial feature impacts.
- **Correction Test**: Ensure manual updates overwrite the single Mood document.
- **Debug Test**: Check logs for Face-API errors if accuracy varies.

## Challenges and Fixes
- **Facial Variability**: May require model retraining if certain features (e.g., facial hair) lower confidence.
- **Correction Validation**: Confirmed dropdown overwrite works with existing backend.

## Future Improvements
- Add confirmation dialog for mood corrections.
- Test with dynamic lighting on diverse faces.
- Refine model for edge cases (e.g., glasses, beards).

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and TensorFlow.js/Face-API.js documentation.

## Commit Message
"Test emotion detection with diverse faces and validate manual correction on Day 53"