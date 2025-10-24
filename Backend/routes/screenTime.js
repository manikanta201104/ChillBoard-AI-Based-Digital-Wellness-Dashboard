import express from 'express';
import ScreenTime from '../models/screenTime.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../index.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/user.js';

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

    // Validate totalTime
    if (typeof totalTime !== 'number' || totalTime < 0) {
      logger.warn('Invalid totalTime', { totalTime });
      return res.status(400).json({ message: 'Invalid totalTime' });
    }

    // Validate tabs
    if (!Array.isArray(tabs)) {
      logger.warn('Tabs must be an array', { tabs });
      return res.status(400).json({ message: 'Tabs must be an array' });
    }

    // Filter and aggregate by URL
    const urlMap = new Map();
    tabs.forEach((tab) => {
      if (!tab || typeof tab.url !== 'string') return;
      const url = tab.url;
      const time = typeof tab.timeSpent === 'number' && tab.timeSpent > 0 ? tab.timeSpent : 0;
      urlMap.set(url, (urlMap.get(url) || 0) + time);
    });
    const aggregatedTabs = Array.from(urlMap.entries()).map(([url, timeSpent]) => ({ url, timeSpent }));

    // Adjust totalTime to be at least the sum of tabs
    const tabsTotalTime = aggregatedTabs.reduce((sum, t) => sum + (t.timeSpent || 0), 0);
    if (totalTime < tabsTotalTime) totalTime = tabsTotalTime;

    if (!screenTimeId) {
      screenTimeId = `st_${Date.now()}_${userId}`;
    }

    // Merge with existing record, making the DB the source of truth to avoid accidental decreases.
    const existing = await ScreenTime.findOne({ userId, date });
    let mergedTabs = aggregatedTabs;
    let mergedTotal = totalTime;
    if (existing) {
      // Merge tabs by URL, taking the maximum time per URL so manual edits are not lost
      const byUrl = new Map();
      (existing.tabs || []).forEach(t => byUrl.set(t.url, Math.max(0, Number(t.timeSpent || 0))));
      aggregatedTabs.forEach(t => {
        const prev = byUrl.get(t.url) || 0;
        byUrl.set(t.url, Math.max(prev, Math.max(0, Number(t.timeSpent || 0))));
      });
      mergedTabs = Array.from(byUrl.entries()).map(([url, timeSpent]) => ({ url, timeSpent }));
      // Never decrease totalTime: store the maximum between incoming and existing
      mergedTotal = Math.max(Number(existing.totalTime || 0), Number(totalTime || 0));
    }

    const updated = await ScreenTime.findOneAndUpdate(
      { userId, date },
      {
        $set: { totalTime: mergedTotal, tabs: mergedTabs },
        $setOnInsert: { screenTimeId, userId, date }
      },
      { new: true, upsert: true }
    );

    logger.info('Screen time replaced for date', {
      userId,
      date: updated.date.toISOString(),
      totalTime: updated.totalTime,
      tabs: updated.tabs,
    });
    res.status(201).json({ message: 'Screen time saved', screenTime: updated });
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