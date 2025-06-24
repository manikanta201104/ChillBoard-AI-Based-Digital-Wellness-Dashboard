# ChillBoard - AI-Based Digital Wellness Dashboard - Day 29

## Overview
Welcome to Day 29 of the ChillBoard project! On June 30, 2025, we created a `/challenges` endpoint in the backend to manage challenge creation and retrieval, using ES6 modules and production-grade practices. This sets the data foundation for the Challenges page from Day 28.

## Features Added
- **POST /challenges**: Creates new challenges with title, description, duration, goal, and startDate, saving to the Challenge collection.
- **GET /challenges**: Fetches active challenges, excluding those past their end date.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- `.env` with `MONGO_URI`, `JWT_SECRET`, and other credentials (from Day 24).

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure `type: module` is set in `package.json`.
3. Run `nodemon index.js` to start the server.

### Frontend Setup
1. Navigate to `ChillBoard/frontend/` and run `npm install`.
2. Run `npm start` to launch the app (no changes needed yet).

## Usage
1. **Create a Challenge**:
   - Use Postman to send `POST http://localhost:5000/challenges` with `{ "title": "7-Day Digital Detox", "duration": 7, "goal": 60, "startDate": "2025-07-01" }` and a valid JWT.
2. **Fetch Challenges**:
   - Call `GET http://localhost:5000/challenges` with a JWT and verify the new challenge is returned.
3. **Check MongoDB**:
   - Use a MongoDB client to confirm the `Challenge` collection has the new entry.

## File Changes
### Backend
- **`models/Challenge.js`**:
  - Created with a schema for challenge data and validation.
- **`routes/challenges.js`**:
  - Added POST and GET endpoints with authentication and error handling.
- **`index.js`**:
  - Integrated the new `challenges` route.

## Testing
- **POST Test**: Send a valid POST request in Postman; expect `201` with the challenge data. Verify MongoDB has the entry.
- **Validation Test**: Send `{ "duration": 7 }` (no title); expect `400` with “Title is required”.
- **Auth Test**: Omit JWT; expect `401` unauthorized.
- **GET Test**: Call GET after creating a challenge; expect `200` with the challenge. Add a past-dated challenge and confirm it’s excluded.
- **Performance Test**: Send 10 POST requests in quick succession; verify no errors and check MongoDB for all entries.
- **Error Test**: Send invalid JSON (e.g., `startDate: "invalid"`); expect `500` with a stack trace in logs.
- **Concurrency Test**: Use multiple Postman instances to send POST requests simultaneously; ensure no duplicates or conflicts.

## Challenges and Solutions
- **Date Filtering**: Used `$expr` for dynamic date calculations, ensuring accurate end-date checks.
- **Validation**: Added required field checks to prevent invalid saves.

## Future Improvements
- Add PATCH /challenges/:id to update participation.
- Integrate with the frontend Challenges page.
- Add participant tracking logic.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and Mongoose for MongoDB integration.

## Commit Message
"Add /challenges endpoint for challenge management on Day 29"