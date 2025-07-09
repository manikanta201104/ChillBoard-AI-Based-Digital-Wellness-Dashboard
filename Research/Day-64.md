# ChillBoard - Day 64: August 04, 2025
## Regression Test Plan

### Objective
Verify that bug fixes from Days 61–63 (screen time, Spotify, leaderboards) haven’t reintroduced issues.

### Test Setup
- **Accounts**: `user_1750648555738`, `user_1750648555739`, `user_1750648555740`.
- **Environment**: Chrome with extension, MongoDB reset.
- **Scenarios**: Days 49–60 test cases.

### Test Cases
1. **Screen Time**
   - Action: 5 tabs, 20m browsing.
   - Expected: `totalTime` ≈ 20m (±5%).
   - Check: `chrome.storage.local`, ScreenTime collection.
2. **Spotify Playback**
   - Action: Play playlist, expire token, 10 rapid requests.
   - Expected: Re-authentication, cached playback.
   - Check: Dashboard, logs.
3. **Leaderboards**
   - Action: Join challenge, set reductions (1.5h, 1h, 0.5h), update to 2h, test ties.
   - Expected: Rankings #1, #2, #3, real-time update, equal ranks for ties.
   - Check: Challenges page, Challenge collection.

### Bug Re-Check
- Monitor logs for new/recurring errors.
- Trace to Days 61–63 fixes if issues found.

### Expected Output
- Regression test completed, confirming no reintroduced issues.

### Notes
- Log all test results.
- Reset test data post-test.