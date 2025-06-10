# Day 13: Emotion Detection with TensorFlow.js for ChillBoard

### Tough Day for me

**Date**: June 10, 2025 (Completed early for June 14, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Implement webcam-based emotion detection on the Dashboard Page using TensorFlow.js and Face-API.js.

## Task Overview
On Day 13, I added emotion detection to the Dashboard Page in the React frontend. I used `face-api.js` to process webcam video, detect facial expressions, and display the dominant emotion in real-time. This builds on Day 11 (Dashboard with screen time charts) and Day 12 (backend `Mood` model).

## What Was Done
1. **Set Up Emotion Detection**:
   - Installed `face-api.js` and `@tensorflow/tfjs`.
   - Placed Face-API.js models in `frontend/public/models/`.
   - Added a webcam toggle button ("Enable Mood Detection") on the Dashboard.

2. **Processed Webcam Feed**:
   - Used Face-API.js to detect faces and expressions (e.g., happy, sad, stressed).
   - Displayed the dominant emotion with confidence score (e.g., "You seem happy (Confidence: 90.00%)").
   - Mapped emotions to backend schema (e.g., `fearful` to `stressed`).

3. **Fixed Errors**:
   - Resolved "Cannot detect emotions: videoRef or webcamEnabled is false" by synchronizing `webcamEnabled` state and using `setInterval` for detection.

4. **Tested the Feature**:
   - Logged in, enabled the webcam, and tested emotion detection.
   - Verified emotions displayed correctly and logged to backend.

## Key Components
- **Files**:
  - `frontend/src/pages/Dashboard.js`: Updated with webcam toggle and emotion detection.
  - `frontend/src/utils/api.js`: Added `sendMood` for backend integration.
  - `frontend/public/models/`: Contains Face-API.js model files.
- **Dependencies**:
  - `face-api.js`, `@tensorflow/tfjs`, `axios`, `chart.js`, `react-chartjs-2`.
- **Features**:
  - Webcam toggle for enabling/disabling mood detection.
  - Real-time emotion detection with confidence scores.
  - Backend integration via `/test-mood` endpoint.

## Outcomes
- Dashboard now includes webcam-based emotion detection.
- Emotions are detected and displayed in real-time (e.g., "You seem happy").
- Webcam data stays local, aligning with privacy note.
- Moods are sent to backend for future analysis (Day 14).

## Notes
- **Success**: Emotion detection worked, moods displayed and logged.
- **Issues**: Fixed race condition in `webcamEnabled` state.
- **Next Steps**: Save detected moods to backend and analyze trends (Day 14).
- **Resources**:
  - Face-API.js: `github.com/justadudewhohacks/face-api.js`
  - TensorFlow.js: `www.tensorflow.org/js`
  - YouTube: “TensorFlow.js Tutorial” by Fireship

## Next Steps
- **Day 14**: Enhance backend to save and analyze detected moods.
- Commit files to GitHub.
- Update Notion/Trello board.