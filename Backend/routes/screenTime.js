import express from 'express';
import ScreenTime from '../models/screenTime.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../index.js';

const router = express.Router();

// POST /screen-time - Save or update screen time data for the day
router.post('/', authMiddleware, async (req, res) => {
  const { totalTime, tabs } = req.body;
  const userId = req.user.userId;
  const date = new Date().toISOString().split('T')[0]; // Use date only (YYYY-MM-DD)

  try {
    if (typeof totalTime !== 'number' || totalTime < 0) {
      return res.status(400).json({ message: 'Invalid totalTime' });
    }
    if (!Array.isArray(tabs)) {
      return res.status(400).json({ message: 'Tabs must be an array' });
    }

    let screenTime = await ScreenTime.findOne({ userId, date });
    if (screenTime) {
      // Update existing day's data
      screenTime.totalTime = (screenTime.totalTime || 0) + totalTime;
      screenTime.tabs = [...screenTime.tabs || [], ...tabs].reduce((acc, curr) => {
        const found = acc.find(item => item.url === curr.url);
        if (found) found.timeSpent += curr.timeSpent;
        else acc.push(curr);
        return acc;
      }, []);
    } else {
      // Create new document for the day
      screenTime = new ScreenTime({
        screenTimeId: `st_${Date.now()}_${userId}`,
        userId,
        date,
        totalTime,
        tabs,
      });
    }

    await screenTime.save();
    logger.info('Screen time saved or updated', { userId, date, totalTime, tabs });
    res.status(201).json({ message: 'Screen time saved or updated' });
  } catch (error) {
    logger.error('Error saving screen time:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /screen-time - Fetch screen time data
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const screenTimeData = await ScreenTime.find({ userId }).sort({ date: -1 });
    res.status(200).json(screenTimeData);
  } catch (error) {
    logger.error('Error fetching screen time:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;