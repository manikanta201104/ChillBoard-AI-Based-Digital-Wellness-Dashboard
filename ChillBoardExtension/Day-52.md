# ChillBoard - AI-Based Digital Wellness Dashboard - Day 52

## Overview
Welcome to Day 52 of the ChillBoard project! On July 23, 2025, we tested the emotion detection feature’s accuracy under diverse lighting conditions (bright, dim, mixed) with a single face, ensuring reliable mood-based recommendations. The backend was updated to store a single mood document per user, overwriting previous moods.

## Features Tested
- **Lighting Conditions Test**: Verified emotion detection across bright, dim, and mixed lighting.
- **Sync Test**: Confirmed mood data is saved in the MongoDB Mood collection as a single document per user.

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
2. Update `moodSchema.js` and `moodRouter.js` with the single-document logic.
3. Run `nodemon index.js` to start the server.

## Usage
1. **Test Setup**:
   - Log in at `http://localhost:3000/dashboard` with a test user.
   - Enable “Mood Detection” and allow webcam access.
2. **Lighting Tests**:
   - Bright: Near a window, display happy/stressed/tired for 1–2 minutes.
   - Dim: With curtains closed, repeat emotions.
   - Mixed: With uneven light, repeat emotions.
3. **Sync Check**:
   - Verify a single Mood document per user in MongoDB.
4. **Documentation**:
   - Record accuracy and capture screenshots.

## File Changes
### Backend
- **`moodSchema.js`**: Removed `moodId`, made `userId` unique for single document.
- **`moodRouter.js`**: Updated `POST /mood` to use `findOneAndUpdate` for overwriting.

## Testing
- **Lighting Test**: Confirm >80% confidence in bright light; note discrepancies in dim/mixed.
- **Sync Test**: Ensure MongoDB updates a single document per user.
- **Debug Test**: Check logs for Face-API errors if accuracy drops.

## Challenges and Fixes
- **Lighting Issues**: May require model retraining if dim light fails.
- **Sync Delays**: Verify network and endpoint if data lags.
- **Single Document**: Ensured overwrite logic with `findOneAndUpdate`.

## Future Improvements
- Add manual mood correction UI refinement.
- Test with multiple faces.
- Optimize model for low light.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and TensorFlow.js/Face-API.js documentation.

## Commit Message
"Test emotion detection under diverse lighting conditions and update mood storage to single document per user on Day 52"