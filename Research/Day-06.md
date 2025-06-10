# Day 6: Production-Grade Express.js Backend and MongoDB Setup for ChillBoard

**Date**: June 07, 2025  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Set up a production-grade Express.js backend with ES Modules, connect to MongoDB via a modular DB setup, and create a `/health` endpoint.

## Task Overview
On Day 6, I created a production-grade Express.js backend for ChillBoard, using ES Modules (`type: "module"`). I modularized the MongoDB connection in `Backend/db/index.js`, configured CORS, environment variables, and logging, and added a `/health` endpoint to test the server.

## What Was Done
1. **Set Up Backend Structure**:
   - Created `Backend/` with subfolders: `config/`, `db/`, `routes/`.
   - Initialized project with `npm init -y` and set `"type": "module"`.
   - Installed dependencies: `express`, `cors`, `dotenv`, `mongoose`, `express-async-errors`, `winston`.

2. **Configured Server**:
   - **index.js**: Set up Express server with middleware, routes, and error handling.
   - **config/env.js**: Validated environment variables (`MONGO_URI`, `PORT`).
   - **routes/health.js**: Created `/health` endpoint.
   - Used `winston` for logging (console and file logs).
   - Added graceful shutdown for MongoDB.

3. **MongoDB Connection**:
   - **db/index.js**: Modularized MongoDB connection with Mongoose.
   - Connected to `mongodb://localhost/chillboard` with error handling and logging.

4. **Tested the Backend**:
   - Started MongoDB (`mongod`).
   - Ran server: `npm start`.
   - Saw logs: “Server running on port 5000, Connected to MongoDB”.
   - Tested in Postman: `GET http://localhost:5000/health` returned “Server is running”.
   - Verified in MongoDB Compass: `chillboard` database created (empty).

## Key Components
- **Files**:
  - `index.js`: Main server setup.
  - `db/index.js`: MongoDB connection.
  - `routes/health.js`: `/health` endpoint.
  - `config/env.js`: Environment validation.
  - `.env`: Stores `PORT`, `MONGO_URI`.
- **Dependencies**:
  - `express`, `cors`, `dotenv`, `mongoose`.
  - `express-async-errors`, `winston`.
- **Production Practices**:
  - ES Modules (`import` syntax).
  - Modular structure (`db/`, `routes/`).
  - Logging with `winston`.
  - Error handling and graceful shutdown.

## Outcomes
- Production-grade Express.js server running on `localhost:5000`.
- MongoDB connected via `db/index.js`.
- `/health` endpoint works, ready for more routes.
- Backend prepared for extension data sync (Day 9).

## Notes
- **Success**: Server runs, MongoDB connected, `/health` works.
- **Issues**: None (or note any, e.g., “MongoDB URI incorrect”).
- **Next Steps**: Add API endpoints for screen time and tab usage (Day 9).
- **Resources**:
  - Express: `expressjs.com`
  - Mongoose: `mongoosejs.com`
  - YouTube: “Express.js & MongoDB Tutorial” by Traversy Media (searched: “Traversy Media Express MongoDB”)

## Next Steps
- **Day 9**: Create API endpoints to receive extension data.
- Commit files to GitHub.
- Update Notion/Trello board.