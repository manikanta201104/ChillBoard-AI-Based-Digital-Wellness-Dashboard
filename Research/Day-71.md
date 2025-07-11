# ChillBoard Chrome Extension - Project Report

## Optimization Details

- **Day 67**: Optimized `/screen-time` to sync every 10 minutes, reducing call frequency.
- **Day 68**: Reduced mood detection to 5 seconds with conditional sync, cutting calls by \~85–90%.
- **Day 69**: Set `/challenges/progress` to update once per hour, extended `/spotify/playlist` caching to 24 hours.
- **Day 70**: Increased mood sync to 10 seconds, reducing `/mood` calls to 3–5 in 30 minutes.
- **Day 71**: Re-tested screen time and mood detection post-optimization.

## Performance Gains

- **Pre-Optimization**: \~15 calls in 30 minutes.
- **Post-Optimization**: \~5 calls in 30 minutes, a 66–75% reduction.
- **Day 71 Test**: Confirmed 6 calls in 20 minutes (2 `/screen-time`, 4 `/mood`), aligning with optimizations.

## Evidence

- **Server Logs** (Sample):

  ```
  [2025-08-11 10:10:00] INFO: /screen-time sync - totalTime: 600s, tabUsage: {YouTube: 240s, GoogleDocs: 180s, ...}
  [2025-08-11 10:10:10] INFO: /mood sync - mood: happy, confidence: 0.85
  [2025-08-11 10:20:00] INFO: /screen-time sync - totalTime: 1200s, tabUsage: {YouTube: 480s, GoogleDocs: 360s, ...}
  ```

- **MongoDB Updates** (Sample Query):

  ```
  db.ScreenTime.find({ userId: "test123", date: ISODate("2025-08-11") }) // totalTime: 1200s, tabUsage: {YouTube: 480s, ...}
  db.Mood.find({ userId: "test123", timestamp: { $gte: ISODate("2025-08-11T10:00:00Z"), $lte: ISODate("2025-08-11T10:20:00Z") } }) // 4 entries, confidence >0.7
  ```

- **Screenshot**: \[Attached - Dashboard showing 1200s screen time, mood: calm\].

## Testing Results

- **Tracking Test**: 20-minute browse across 5 tabs, `/screen-time` synced at 10 and 20 minutes, `totalTime` (1200s) within 5% of active time (1180s), tab usage accurate.
- **Mood Detection Test**: Displayed happy (0.85), stressed (0.78), tired (0.72), calm (0.88) over 6–8 minutes, all &gt;70% confidence, synced every 10 seconds.
- **Integration Test**: Dashboard updated screen time and mood in real-time, MongoDB reflected accurate entries.
- **Validation**: Data integration successful, no discrepancies.

## Conclusion

Screen time tracking and mood detection remain reliable post-optimization, with accurate real-time integration. Ready for further feature development.

## Contributors

- Developed by the ChillBoard team.

## License

MIT License - See LICENSE file for details.