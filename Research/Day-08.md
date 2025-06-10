# Day 8: User Authentication for ChillBoard Backend

**Date**: June 07, 2025 (Completed early for June 09, 2025)  
**Project**: ChillBoard – AI-Based Digital Wellness Dashboard  
**Objective**: Implement user authentication with `/signup` and `/login` endpoints, using JWT and bcrypt.

## Task Overview
On Day 8, I added user authentication to the ChillBoard backend. I installed `jsonwebtoken` and `bcrypt`, created `/signup` and `/login` endpoints to hash passwords and return JWT tokens, and tested them with Postman.

## What Was Done
1. **Installed Dependencies**:
   - Added `jsonwebtoken` for token generation.
   - Added `bcrypt` for password hashing.
   - Added `JWT_SECRET` to `.env`.

2. **Updated User Model**:
   - Added pre-save hook to hash passwords.
   - Added `comparePassword` method for login.

3. **Created Auth Endpoints**:
   - **POST /auth/signup**: Hashes password, saves user, returns JWT.
   - **POST /auth/login**: Verifies credentials, returns JWT.

4. **Tested Endpoints**:
   - Signed up with `POST /auth/signup`:
     ```json
     {
       "username": "user1",
       "email": "user@example.com",
       "password": "password123"
     }
     ```
     Received a JWT token.
   - Logged in with `POST /auth/login`:
     ```json
     {
       "email": "user@example.com",
       "password": "password123"
     }
     ```
     Received a JWT token.
   - Verified in MongoDB Compass: User saved with hashed password.

## Key Components
- **Files**:
  - `models/user.js`: Updated for password hashing.
  - `routes/auth.js`: `/signup` and `/login` endpoints.
- **Dependencies**:
  - `jsonwebtoken`, `bcrypt`.
- **Features**:
  - Password hashing, JWT token generation.
  - Error handling, logging with `winston`.

## Outcomes
- Backend now supports user signup and login.
- Passwords are securely hashed; tokens are returned.
- Ready for secure data sync (Day 9).

## Notes
- **Success**: Signup and login work; tokens returned.
- **Issues**: None (or note any, e.g., “Duplicate email error”).
- **Next Steps**: Add data sync endpoints (Day 9).
- **Resources**:
  - JWT: `jwt.io`
  - Bcrypt: `npmjs.com/package/bcrypt`
  - YouTube: “Node.js Authentication Tutorial” by Traversy Media (searched: “Traversy Media Node.js authentication”)

## Next Steps
- **Day 9**: Create API endpoints for extension data sync.
- Commit files to GitHub.
- Update Notion/Trello board.