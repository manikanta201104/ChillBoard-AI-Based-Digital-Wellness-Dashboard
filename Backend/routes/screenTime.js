import express from 'express';
import ScreenTime from '../models/screenTime.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../index.js';

const router = express.Router();

// POST /screen-time - Save or update screen time data for the day
router.post('/', authMiddleware, async (req, res) => {
  const { totalTime, tabs, date } = req.body;
  const userId = req.user.userId;

  try {
    if (typeof totalTime !== 'number' || totalTime < 0) {
      return res.status(400).json({ message: 'Invalid totalTime' });
    }
    if (!Array.isArray(tabs)) {
      return res.status(400).json({ message: 'Tabs must be an array' });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Invalid or missing date' });
    }

    const validTabs = tabs.filter((tab) => {
      if (!tab.url || typeof tab.timeSpent !== 'number' || tab.timeSpent < 0) {
        logger.warn('Invalid tab data skipped:', tab);
        return false;
      }
      return true;
    });

    let screenTime = await ScreenTime.findOne({ userId, date });
    if (screenTime) {
      // Aggregate totalTime and tabs
      screenTime.totalTime += totalTime;
      const existingTabsMap = new Map(screenTime.tabs.map((tab) => [tab.url, tab.timeSpent]));
      validTabs.forEach((tab) => {
        existingTabsMap.set(tab.url, (existingTabsMap.get(tab.url) || 0) + tab.timeSpent);
      });
      screenTime.tabs = Array.from(existingTabsMap, ([url, timeSpent]) => ({ url, timeSpent }));
    } else {
      screenTime = new ScreenTime({
        screenTimeId: `st_${Date.now()}_${userId}`,
        userId,
        date,
        totalTime,
        tabs: validTabs,
      });
    }

    await screenTime.save();
    logger.info('Screen time saved or updated', { userId, date, totalTime: screenTime.totalTime, tabs: screenTime.tabs });
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

// POST /refresh-token - Refresh JWT
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwtSecret);
    } catch (err) {
      logger.warn('Invalid refresh token', { error: err.message });
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findOne({ 'spotifyToken.refreshToken': refreshToken });
    if (!user) {
      logger.warn('User not found for refresh', { refreshToken });
      return res.status(404).json({ message: 'User not found' });
    }

    const newToken = jwt.sign({ userId: user.userId }, config.jwtSecret, { expiresIn: '1h' });
    user.spotifyToken.accessToken = newToken;
    user.spotifyToken.obtainedAt = new Date();
    await user.save();

    logger.info('Token refreshed successfully', { userId: user.userId });
    res.status(200).json({ token: newToken });
  } catch (error) {
    logger.error('Error refreshing token:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;