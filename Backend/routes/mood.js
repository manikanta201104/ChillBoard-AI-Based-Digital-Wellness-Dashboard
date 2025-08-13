import express from 'express';
import { logger } from '../index.js';
import Mood from '../models/mood.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /mood
router.post('/', authMiddleware, async (req, res) => {
  const { mood, confidence } = req.body;
  const userId = req.user.userId;

  try {
    if (!['happy', 'sad', 'angry', 'stressed', 'calm', 'neutral'].includes(mood)) {
      return res.status(400).json({ message: 'Invalid mood' });
    }
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      return res.status(400).json({ message: 'Invalid confidence value' });
    }

    const latestMood = await Mood.findOne({ userId }).sort({ timestamp: -1 });
    const timeSinceLast = latestMood ? (Date.now() - latestMood.timestamp.getTime()) / 1000 : 30;
    const confidenceDrop = latestMood ? Math.abs(confidence - latestMood.confidence) : 0;

    if (confidenceDrop > 0.2 || (timeSinceLast >= 30 && (!latestMood || mood !== latestMood.mood))) {
      const updatedMood = await Mood.findOneAndUpdate(
        { userId },
        { mood, confidence, timestamp: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      logger.info('Mood updated', { userId, mood, confidence, timestamp: updatedMood.timestamp });

      const triggerLink = { fromSource: 'mood', data: { mood, confidence, timestamp: new Date().toISOString() } };
      logger.info('TriggerLink generated', triggerLink);

      res.status(200).json({ message: 'Mood updated', mood: updatedMood });
    } else {
      logger.info('No significant mood change, skipping update', { userId, mood, confidence });
      res.status(204).send('No significant change');
    }
  } catch (error) {
    logger.error('Error updating mood:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /mood/latest
router.get('/latest', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const latestMood = await Mood.findOne({ userId }).sort({ timestamp: -1 }).exec();

    if (!latestMood) {
      return res.status(404).json({ message: 'No mood data found for this user' });
    }

    logger.info('Latest mood fetched', { userId, mood: latestMood.mood, timestamp: latestMood.timestamp });
    res.status(200).json(latestMood);
  } catch (error) {
    logger.error('Error fetching latest mood:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /mood/trends - Fetch weekly mood trends
router.get('/trends', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7);
    oneWeekAgo.setUTCHours(0, 0, 0, 0);

    const trends = await Mood.aggregate([
      { $match: { userId, timestamp: { $gte: oneWeekAgo } } },
      {
        $group: {
          _id: '$mood',
          count: { $sum: 1 },
        },
      },
    ]).exec();

    const labels = ['Happy', 'Sad', 'Angry', 'Stressed', 'Calm', 'Neutral'];
    const data = labels.map(mood => trends.find(t => t._id === mood)?.count || 0);

    res.status(200).json({ labels, data });
  } catch (error) {
    logger.error('Error fetching mood trends:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;