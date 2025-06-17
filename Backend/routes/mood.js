import express from 'express';
import  {logger}  from '../index.js';
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

    const newMood = new Mood({
      moodId: `mood_${Date.now()}`,
      userId,
      mood,
      confidence,
      timestamp: new Date(),
    });

    await newMood.save();
    logger.info('Mood saved', { userId, mood, confidence });

    // Simulate TriggerLink for recommendations (Day 15)
    const triggerLink = {
      fromSource: 'mood',
      data: { mood, confidence, timestamp: new Date().toISOString() },
    };
    logger.info('TriggerLink generated', triggerLink);

    res.status(201).json({ message: 'Mood saved' });
  } catch (error) {
    logger.error('Error saving mood:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;