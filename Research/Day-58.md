# ChillBoard - Day 58: July 29, 2025
## Task: Set Up Test Accounts and Join a Challenge with Multiple Users

### Objective
Create 3–5 test accounts and join them in a “7-Day Digital Detox” challenge to establish a multi-user testing baseline for the challenge system.

### Why This Task Matters
Multi-user testing ensures the challenge and leaderboard features support group participation, a key aspect of ChillBoard’s gamification. This validates scalability and data consistency, critical for community engagement in a production environment.

### Steps Performed
1. **Test Setup**:
   - Started backend on http://localhost:5000 and opened http://localhost:3000 with the primary test user.
   - Created 3–5 test accounts (e.g., User2, User3, User4) via POST /signup with unique emails.
   - Logged in each account and navigated to the Challenges page.
2. **Join Challenge**:
   - Created “7-Day Digital Detox: Reduce 1 hour daily” via POST /challenges with startDate 2025-07-29 and duration 7.
   - Each test user joined the challenge via POST /challenges/join, triggering “Joined” status.
3. **Test Validation**:
   - Verified Challenges page showed “Joined” and leaderboard with all users at rank #1 (0 hours reduction).
   - Confirmed MongoDB Challenge document had all participants with reduction: 0.
4. **Cleanup**:
   - Reset Challenge and User collections if needed.

### Expected Output
- 3–5 test users created and joined in the “7-Day Digital Detox” challenge.
- Participation data saved in MongoDB’s Challenge collection with correct participant array.

### Artifacts
- No code changes required; relies on existing /signup, /challenges, and /challenges/join endpoints.

### Notes
- Ensure unique emails for test accounts to avoid conflicts.
- Monitor MongoDB for participant data consistency.
- Adjust challenge details (e.g., startDate) based on testing timeline.