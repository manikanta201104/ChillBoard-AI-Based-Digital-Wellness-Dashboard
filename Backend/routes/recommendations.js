
import express from 'express';
import { logger } from '../index.js';
import ScreenTime from '../models/screenTime.js';
import Mood from '../models/mood.js';
import Recommendation from '../models/recommendation.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /recommendations
router.post('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Log the userId for debugging
    logger.info('Fetching data for user', { userId });

    // Fetch latest ScreenTime data
    const latestScreenTime = await ScreenTime.findOne({ userId })
      .sort({ date: -1 })
      .limit(1);

    // Fetch latest Mood data
    const latestMood = await Mood.findOne({ userId })
      .sort({ timestamp: -1 })
      .limit(1);

    // Log the fetched data
    logger.info('Fetched ScreenTime and Mood', {
      screenTime: latestScreenTime,
      mood: latestMood,
    });

    // Default recommendation
    let recommendation = {
      type: 'message',
      details: { message: 'Keep up the good work!' },
      trigger: 'default',
    };

    // Apply recommendation rules
    if (latestScreenTime && latestMood) {
      const totalTime = latestScreenTime.totalTime / 60; // Convert to minutes
      const mood = latestMood.mood;

      logger.info('Applying rules', { totalTime, mood }); // Ensure mood is logged

      if (totalTime > 300 && mood === 'stressed') {
        recommendation = {
          type: 'break',
          details: { action: 'walk', duration: '5m' },
          trigger: 'screenTime and mood',
        };
      } else if (totalTime > 180 && mood === 'tired') {
        recommendation = {
          type: 'break',
          details: { action: 'rest', duration: '10m' },
          trigger: 'screenTime and mood',
        };
      } else if (mood === 'happy') {
        recommendation = {
          type: 'message',
          details: { message: 'You’re doing great!' },
          trigger: 'mood',
        };
      }
    } else {
      logger.warn('No ScreenTime or Mood data found', { userId });
    }

    // Save recommendation to database
    const newRecommendation = new Recommendation({
      recommendationId: `rec_${Date.now()}`,
      userId,
      timestamp: new Date(),
      type: recommendation.type,
      details: recommendation.type === 'message'
        ? recommendation.details.message
        : `Take a ${recommendation.details.duration} ${recommendation.details.action}`,
      trigger: recommendation.trigger,
      accepted: false,
    });

    await newRecommendation.save();
    logger.info('Recommendation generated and saved', { userId, recommendation });

    // Return recommendation
    res.status(200).json({
      type: recommendation.type,
      details: recommendation.details,
    });
  } catch (error) {
    logger.error('Error generating recommendation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
