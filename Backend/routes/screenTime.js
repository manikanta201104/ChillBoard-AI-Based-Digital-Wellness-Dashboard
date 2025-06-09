import express from 'express';
import { logger } from '../index.js';
import ScreenTime from '../models/screenTime.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /screen-time (from Day 9)
router.post('/', authMiddleware, async (req, res) => {
  const { totalTime, tabs } = req.body;
  const userId = req.user.userId; // From JWT

  try {
    const screenTime = new ScreenTime({
      screenTimeId: `st_${Date.now()}`,
      userId,
      date: new Date(),
      totalTime,
      tabs,
    });

    await screenTime.save();
    logger.info('Screen time data saved', { userId, totalTime });
    res.status(201).json({ message: 'Screen time data saved' });
  } catch (error) {
    logger.error('Error saving screen time:', error);
    throw error;
  }
});

// GET /screen-time (Updated to fetch last 7 days)
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId; // From JWT

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // Last 7 days
    const screenTimeData = await ScreenTime.find({
      userId,
      date: { $gte: sevenDaysAgo },
    }).sort({ date: -1 });

    logger.info('Screen time data fetched', { userId });
    res.status(200).json(screenTimeData);
  } catch (error) {
    logger.error('Error fetching screen time:', error);
    throw error;
  }
});

export default router;