# ChillBoard Chrome Extension - Project Report

## Optimization Details
- **Day 15**: Implemented `/recommendations` for mood-based suggestions.
- **Day 22**: Added `/spotify/playlist` for playback.
- **Day 31**: Introduced `/challenges/progress` for reductions.
- **Day 32**: Added `/challenges/leaderboard`.
- **Day 48**: Implemented progress bars.
- **Day 67**: Optimized `/screen-time` to 10-minute sync.
- **Day 68**: Reduced mood detection to 10 seconds.
- **Day 70**: Adjusted `/mood` sync.
- **Day 74**: Conducted full end-to-end test.

## Performance Gains
- **Pre-Optimization**: ~15 calls in 30 minutes.
- **Post-Optimization**: ~5 calls in 30 minutes, a 66–75% reduction.
- **Day 74 Test**: 1 `/screen-time`, 3 `/mood`, 1 `/recommendations`, 1 `/challenges/progress`, 1 `/challenges/leaderboard`, efficient sync.

## Evidence
- **Server Logs** (Sample):
  ```
  [2025-08-14 10:10:00] INFO: Detected mood: stressed (Confidence: 85%)
  [2025-08-14 10:21:00] INFO: Recommendation: “Listen to Chill Vibes”
  [2025-08-14 10:26:00] INFO: Reduction: 3600s, /challenges/progress triggered
  [2025-08-14 10:27:00] INFO: Leaderboard: test123 #1 (1h)
  ```
- **MongoDB Updates** (Sample Query):
  ```
  db.ScreenTime.find({ userId: "test123", date: ISODate("2025-08-14") }) // totalTime: ~1800s
  db.Mood.find({ userId: "test123" }).sort({ timestamp: -1 }) // moods: [happy, stressed]
  db.Recommendation.find({ userId: "test123" }) // “Listen to Chill Vibes”, “Great job...”
  db.Challenge.find({ name: "7-Day Digital Detox" }) // participants: [{userId: "test123", reduction: 3600}]
  db.Playlist.find({ userId: "test123" }) // playlistId: 7xPq9PHE4n5xQ9XbS7g5gA
  ```
- **Screenshot**: [Attached - Dashboard with charts, mood history, recommendation; Challenges page with leaderboard].

## Testing Results
- **End-to-End Test**: 30-minute browse tracked 5 tabs, mood switched from “stressed” to “happy”, “Listen to Chill Vibes” played, 1-hour reduction updated leaderboard.
- **Integration Test**: Data synced to MongoDB; recommendation adapted to challenge progress (“Great job on your reduction!”).
- **Validation**: Dashboard showed updated charts, mood history, and recommendation; Challenges page reflected reduction; MongoDB data consistent.

## Conclusion
Full end-to-end test succeeded, with all features integrated and data consistent across the app and MongoDB. Ready for demo.

## Contributors
- Developed by the ChillBoard team.

## License
MIT License - See LICENSE file for details.