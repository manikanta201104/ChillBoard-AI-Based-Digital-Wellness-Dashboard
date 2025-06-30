import express from 'express';
import ScreenTime from '../models/screenTime.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../index.js';

const router = express.Router();

// POST /screen-time - Save or aggregate screen time data
router.post('/', authMiddleware, async (req, res) => {
  const { totalTime, tabs } = req.body;
  const userId = req.user.userId;
  const date = new Date(); // Use current date for consistency

  try {
    if (typeof totalTime !== 'number' || totalTime < 0) {
      return res.status(400).json({ message: 'Invalid totalTime' });
    }
    if (!Array.isArray(tabs)) {
      return res.status(400).json({ message: 'Tabs must be an array' });
    }

    const queryDate = new Date(date.toISOString().split('T')[0]); // Normalize to start of day
    let screenTime = await ScreenTime.findOne({ userId, date: { $gte: queryDate, $lt: new Date(queryDate.getTime() + 86400000) } });
    if (screenTime) {
      screenTime.totalTime = (screenTime.totalTime || 0) + totalTime;
      screenTime.tabs = [...screenTime.tabs || [], ...tabs].reduce((acc, curr) => {
        const found = acc.find(item => item.url === curr.url);
        if (found) found.timeSpent += curr.timeSpent || 0;
        else acc.push(curr);
        return acc;
      }, []);
      await screenTime.save();
    } else {
      const newScreenTime = new ScreenTime({
        screenTimeId: `st_${Date.now()}`,
        userId,
        date: queryDate, // Store normalized date
        totalTime,
        tabs,
      });
      await newScreenTime.save();
    }
    logger.info('Screen time saved/aggregated', { userId, totalTime, tabs, date: queryDate });
    res.status(201).json({ message: 'Screen time saved/aggregated' });
  } catch (error) {
    logger.error('Error saving screen time:', error);
    if (error.code === 11000) {
      res.status(409).json({ message: 'Duplicate entry detected, data aggregated' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// GET /screen-time - Fetch screen time data
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const date = new Date().toISOString().split('T')[0]; // Current date
  const queryDate = new Date(date);

  try {
    const screenTimeData = await ScreenTime.find({
      userId,
      date: { $gte: queryDate, $lt: new Date(queryDate.getTime() + 86400000) }
    }).sort({ date: -1 });
    res.status(200).json(screenTimeData);
  } catch (error) {
    logger.error('Error fetching screen time:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;