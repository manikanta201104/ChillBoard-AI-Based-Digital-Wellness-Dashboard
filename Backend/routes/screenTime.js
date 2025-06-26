
import express from 'express';
import ScreenTime from '../models/screenTime.js';
import { authMiddleware } from '../middleware/auth.js';
import {logger}  from '../index.js';

const router = express.Router();

// POST /screen-time - Save screen time data
router.post('/', authMiddleware, async (req, res) => {
  const { totalTime, tabs } = req.body;
  const userId = req.user.userId;

  try {
    if (typeof totalTime !== 'number' || totalTime < 0) {
      return res.status(400).json({ message: 'Invalid totalTime' });
    }
    if (!Array.isArray(tabs)) {
      return res.status(400).json({ message: 'Tabs must be an array' });
    }

    const newScreenTime = new ScreenTime({
      screenTimeId: `st_${Date.now()}`,
      userId,
      date: new Date(),
      totalTime,
      tabs,
    });

    await newScreenTime.save();
    logger.info('Screen time saved', { userId, totalTime, tabs });
    res.status(201).json({ message: 'Screen time saved' });
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