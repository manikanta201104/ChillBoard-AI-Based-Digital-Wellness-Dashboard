import express from 'express';
import ScreenTime from '../models/screenTime.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../index.js';

const router = express.Router();

// Helper function to normalize date to IST midnight (UTC+5:30)
const normalizeToIST = (dateInput) => {
  let date;
  const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    date = new Date(dateInput + 'T00:00:00+05:30'); // Treat string as IST
  } else if (typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = new Date(dateInput);
  } else {
    logger.warn('Invalid date format, normalizing to today in IST', { dateInput });
    date = new Date();
  }

  // Convert to IST and set to midnight
  const utcTime = date.getTime();
  const istTime = utcTime + IST_OFFSET;
  date = new Date(istTime);
  date.setUTCHours(-5, -30, 0, 0); // Adjust to IST midnight
  return date;
};

// POST /screen-time - Save or update screen time data for the day
router.post('/', authMiddleware, async (req, res) => {
  let { totalTime, tabs, date, screenTimeId } = req.body;
  const userId = req.user.userId;

  try {
    // Normalize date to IST midnight
    date = normalizeToIST(date);

    if (isNaN(date.getTime())) {
      logger.warn('Invalid date after normalization', { date });
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (typeof totalTime !== 'number' || totalTime < 0) {
      logger.warn('Invalid totalTime', { totalTime });
      return res.status(400).json({ message: 'Invalid totalTime' });
    }
    if (!Array.isArray(tabs)) {
      logger.warn('Tabs must be an array', { tabs });
      return res.status(400).json({ message: 'Tabs must be an array' });
    }

    const validTabs = tabs.filter((tab) => {
      if (!tab.url || typeof tab.timeSpent !== 'number' || tab.timeSpent < 0) {
        logger.warn('Invalid tab data skipped:', tab);
        return false;
      }
      return true;
    });

    if (!screenTimeId) {
      screenTimeId = `st_${Date.now()}_${userId}`;
      logger.info('Generated screenTimeId', { screenTimeId });
    }

    let screenTime = await ScreenTime.findOne({ userId, date });
    if (screenTime) {
      screenTime.totalTime += totalTime;
      const existingTabsMap = new Map(screenTime.tabs.map((tab) => [tab.url, tab.timeSpent]));
      validTabs.forEach((tab) => {
        existingTabsMap.set(tab.url, (existingTabsMap.get(tab.url) || 0) + tab.timeSpent);
      });
      screenTime.tabs = Array.from(existingTabsMap, ([url, timeSpent]) => ({ url, timeSpent }));
      screenTime.screenTimeId = screenTime.screenTimeId || screenTimeId;
    } else {
      screenTime = new ScreenTime({
        screenTimeId,
        userId,
        date,
        totalTime,
        tabs: validTabs,
      });
    }

    await screenTime.save();
    logger.info('Screen time saved or updated', { userId, date: screenTime.date.toISOString(), totalTime: screenTime.totalTime, tabs: screenTime.tabs });
    res.status(201).json({ message: 'Screen time saved or updated', screenTime });
  } catch (error) {
    if (error.code === 11000) {
      try {
        const screenTime = await ScreenTime.findOne({ userId, date });
        if (screenTime) {
          screenTime.totalTime += totalTime;
          const existingTabsMap = new Map(screenTime.tabs.map((tab) => [tab.url, tab.timeSpent]));
          validTabs.forEach((tab) => {
            existingTabsMap.set(tab.url, (existingTabsMap.get(tab.url) || 0) + tab.timeSpent);
          });
          screenTime.tabs = Array.from(existingTabsMap, ([url, timeSpent]) => ({ url, timeSpent }));
          await screenTime.save();
          logger.info('Merged duplicate screen time', { userId, date: screenTime.date.toISOString(), totalTime: screenTime.totalTime });
          return res.status(201).json({ message: 'Screen time merged', screenTime });
        }
      } catch (mergeError) {
        logger.error('Error merging duplicate screen time:', mergeError);
        return res.status(500).json({ message: 'Server error during merge' });
      }
    }
    logger.error('Error saving screen time:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

// GET /screen-time/trends - Fetch weekly screen time trends
router.get('/trends', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const oneWeekAgo = normalizeToIST(new Date());
    oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7);

    const trends = await ScreenTime.aggregate([
      { $match: { userId, date: { $gte: oneWeekAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Kolkata' } },
          totalTime: { $sum: '$totalTime' },
        },
      },
      { $sort: { _id: 1 } },
    ]).exec();

    const labels = trends.map(t => `Week ${new Date(t._id).getUTCDate()}`);
    const data = trends.map(t => t.totalTime / 3600); // Convert to hours

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