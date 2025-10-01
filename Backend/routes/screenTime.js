import express from 'express';
import ScreenTime from '../models/screenTime.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../index.js';

const router = express.Router();

// POST /screen-time - Save or update screen time data for the day
router.post('/', authMiddleware, async (req, res) => {
  let { totalTime, tabs, date, screenTimeId } = req.body;
  const userId = req.user.userId;

  try {
    // Normalize date
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = new Date(date + 'T00:00:00Z');
    } else if (typeof date === 'number') {
      date = new Date(date);
      date.setUTCHours(0, 0, 0, 0);
    } else if (date instanceof Date) {
      date.setUTCHours(0, 0, 0, 0);
    } else {
      logger.warn('Invalid date format, normalizing to today', { date });
      date = new Date();
      date.setUTCHours(0, 0, 0, 0);
    }

    if (isNaN(date.getTime())) {
      logger.warn('Invalid date after normalization', { date });
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Validate totalTime and cap at 24 hours
    if (typeof totalTime !== 'number' || totalTime < 0) {
      logger.warn('Invalid totalTime', { totalTime });
      return res.status(400).json({ message: 'Invalid totalTime' });
    }
    totalTime = Math.min(totalTime, 86400);

    // Validate tabs
    if (!Array.isArray(tabs)) {
      logger.warn('Tabs must be an array', { tabs });
      return res.status(400).json({ message: 'Tabs must be an array' });
    }

    const validTabs = tabs.filter((tab) => {
      if (!tab.url || typeof tab.url !== 'string' || typeof tab.timeSpent !== 'number') {
        logger.warn('Invalid tab data skipped:', { tab });
        return false;
      }
      return true; // Allow tabs with timeSpent >= 0
    });

    // Calculate sum of tab times for consistency check
    const tabsTotalTime = validTabs.reduce((sum, tab) => sum + (tab.timeSpent || 0), 0);
    if (totalTime < tabsTotalTime) {
      logger.warn('totalTime is less than sum of tabs.timeSpent, adjusting', {
        totalTime,
        tabsTotalTime,
      });
      totalTime = tabsTotalTime; // Trust tab times if higher
    }
    totalTime = Math.min(totalTime, 86400); // Re-cap after adjustment

    if (!screenTimeId) {
      screenTimeId = `st_${Date.now()}_${userId}`;
      logger.info('Generated screenTimeId', { screenTimeId });
    }

    let screenTime = await ScreenTime.findOne({ userId, date });
    if (screenTime) {
      // Update existing record
      screenTime.totalTime = totalTime;
      const existingTabsMap = new Map(screenTime.tabs.map((tab) => [tab.url, tab.timeSpent]));
      validTabs.forEach((tab) => {
        existingTabsMap.set(tab.url, (existingTabsMap.get(tab.url) || 0) + tab.timeSpent);
      });
      screenTime.tabs = Array.from(existingTabsMap, ([url, timeSpent]) => ({ url, timeSpent: Math.min(timeSpent, 86400) }));
      screenTime.screenTimeId = screenTime.screenTimeId || screenTimeId;
    } else {
      // Create new record
      screenTime = new ScreenTime({
        screenTimeId,
        userId,
        date,
        totalTime,
        tabs: validTabs.map(tab => ({ url: tab.url, timeSpent: Math.min(tab.timeSpent, 86400) })),
      });
    }

    await screenTime.save();
    logger.info('Screen time saved or updated', {
      userId,
      date: screenTime.date.toISOString(),
      totalTime: screenTime.totalTime,
      tabs: screenTime.tabs,
    });
    res.status(201).json({ message: 'Screen time saved or updated', screenTime });
  } catch (error) {
    logger.error('Error saving screen time:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /screen-time - Fetch screen time data
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const screenTimeData = await ScreenTime.find({ userId }).sort({ date: -1 });
    const formattedData = screenTimeData.map((data) => {
      const obj = data.toObject();
      obj.date = data.date.toISOString().split('T')[0];
      obj.totalTime = Math.min(obj.totalTime, 86400);
      obj.tabs.forEach(tab => tab.timeSpent = Math.min(tab.timeSpent, 86400));
      return obj;
    });
    res.status(200).json(formattedData);
  } catch (error) {
    logger.error('Error fetching screen time:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /screen-time/trends - Fetch weekly screen time trends
router.get('/trends', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7);
    oneWeekAgo.setUTCHours(0, 0, 0, 0);

    const trends = await ScreenTime.aggregate([
      { $match: { userId, date: { $gte: oneWeekAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          totalTime: { $sum: '$totalTime' },
        },
      },
      { $sort: { _id: 1 } },
    ]).exec();

    const labels = trends.map((t) => `Week ${new Date(t._id).getUTCDate()}`);
    const data = trends.map((t) => t.totalTime / 3600); // Convert to hours

    res.status(200).json({ labels, data });
  } catch (error) {
    logger.error('Error fetching screen time trends:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /screen-time/refresh-token
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (!refreshToken) {
      logger.warn('Refresh token missing');
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
      logger.warn('User not found for refresh token', { refreshToken });
      return res.status(404).json({ message: 'User not found' });
    }

    const newToken = jwt.sign({ userId: user.userId }, config.jwtSecret, { expiresIn: '24h' });
    user.spotifyToken.accessToken = newToken;
    user.spotifyToken.obtainedAt = new Date();
    user.spotifyToken.expiresIn = 86400;
    await user.save();

    logger.info('Token refreshed successfully', { userId: user.userId });
    res.status(200).json({ token: newToken });
  } catch (error) {
    logger.error('Error refreshing token:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;