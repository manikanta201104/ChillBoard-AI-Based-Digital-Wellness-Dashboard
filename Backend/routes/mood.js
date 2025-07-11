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

    const lastMood = await Mood.findOne({ userId });
    const confidenceDrop = lastMood ? Math.abs(confidence - lastMood.confidence) : 0;
    const timeSinceLast = lastMood ? (Date.now() - lastMood.timestamp) / 1000 : 30;

    if (confidenceDrop > 0.2 || (timeSinceLast >= 30 && mood !== lastMood?.mood)) {
      const updatedMood = await Mood.findOneAndUpdate(
        { userId },
        { mood, confidence, timestamp: new Date() },
        { upsert: true, new: true, runValidators: true }
      );

      logger.info('Mood updated', { userId, mood, confidence, timestamp: updatedMood.timestamp });

      // Simulate TriggerLink for recommendations (Day 15)
      const triggerLink = {
        fromSource: 'mood',
        data: { mood, confidence, timestamp: new Date().toISOString() },
      };
      logger.info('TriggerLink generated', triggerLink);

      res.status(200).json({ message: 'Mood updated', mood: updatedMood });
    } else {
      logger.info('No significant mood change, skipping update', { userId, mood, confidence });
      res.status(204).send('No significant change');
    }
  } catch (error) {
    logger.error('Error updating mood:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /mood/latest
router.get('/latest', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const latestMood = await Mood.findOne({ userId }).exec();

    if (!latestMood) {
      return res.status(404).json({ message: 'No mood data found for this user' });
    }

    logger.info('Latest mood fetched', { userId, mood: latestMood.mood, timestamp: latestMood.timestamp });
    res.status(200).json(latestMood);
  } catch (error) {
    logger.error('Error fetching latest mood:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;