import express from 'express';
import { logger } from '../index.js';
import Mood from '../models/mood.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /test-mood
router.post('/', authMiddleware, async (req, res) => {
  // Validate req.body
  if (!req.body) {
    logger.warn('Request body is missing');
    return res.status(400).json({ message: 'Request body is missing' });
  }

  const { mood, confidence } = req.body;
  const userId = req.user.userId;

  // Validate required fields
  if (!mood || confidence === undefined) {
    logger.warn('Missing required fields', { mood, confidence });
    return res.status(400).json({ message: 'Mood and confidence are required' });
  }

  // Validate mood enum
  const validMoods = ['happy', 'sad', 'angry', 'stressed', 'calm', 'neutral'];
  if (!validMoods.includes(mood)) {
    logger.warn('Invalid mood value', { mood });
    return res.status(400).json({ message: 'Invalid mood value' });
  }

  // Validate confidence range
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    logger.warn('Invalid confidence value', { confidence });
    return res.status(400).json({ message: 'Confidence must be a number between 0 and 1' });
  }

  try {
    const newMood = new Mood({
      moodId: `mood_${Date.now()}`,
      userId,
      mood,
      confidence,
      timestamp: new Date(),
    });

    await newMood.save();
    logger.info('Mood saved successfully', { userId, mood });
    res.status(201).json({ message: 'Mood saved' });
  } catch (error) {
    logger.error('Error saving mood:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;