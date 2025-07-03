# ChillBoard - AI-Based Digital Wellness Dashboard - Day 54

## Overview
Welcome to Day 54 of the ChillBoard project! On July 25, 2025, we finalized emotion detection testing by combining diverse lighting and faces, debugged issues, and documented results, ensuring a robust AI feature.

## Features Tested
- **Combined Testing**: Verified emotion detection with 2–3 subjects under bright, dim, and mixed lighting.
- **Manual Correction**: Confirmed “Correct Mood” updates on Dashboard and MongoDB.
- **Debugging**: Addressed low accuracy and performance lags.

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
1. **Combined Testing**:
   - Test Subject 1 in bright light, Subject 2 in dim light, Subject 3 in mixed light.
   - Display happy/stressed/tired for 1–2 minutes each; record moods and confidence.
   - Use “Correct Mood” to fix misdetections.
2. **Debugging**:
   - Adjust `scoreThreshold` or lighting if confidence <60%.
   - Check logs for correction or performance issues.
3. **Documentation**:
   - Record accuracy and fixes in a report.
   - Capture screenshots/videos of test sessions.

## File Changes
### Frontend
- **`Dashboard.js`**: Increased `scoreThreshold` to 0.7, `detectionInterval` to 1000ms, and reduced video resolution to 320x240 for performance.

## Testing
- **Combined Test**: Confirm >70% confidence across lighting and faces.
- **Correction Test**: Verify manual updates in real-time.
- **Debug Test**: Re-test with adjusted settings to ensure fixes.

## Challenges and Fixes
- **Low Accuracy**: Increased `scoreThreshold` to 0.7 and improved lighting.
- **Performance Lags**: Optimized interval to 1000ms and resolution to 320x240.
- **Correction Issues**: Verified overwrite logic; no endpoint changes needed.

## Future Improvements
- Add real-time performance metrics.
- Test with mobile devices.
- Enhance model with more diverse training data.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and TensorFlow.js/Face-API.js documentation.

## Commit Message
"Finalize emotion detection testing with diverse lighting and faces, debug issues, and document results on Day 54"