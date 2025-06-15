
import express from 'express';
import { logger } from '../index.js';
import ScreenTime from '../models/screenTime.js';
import Mood from '../models/mood.js';
import Recommendation from '../models/recommendation.js';
import TriggerLink from '../models/triggerLink.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /recommendations
router.post('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Fetch latest ScreenTime data
    const latestScreenTime = await ScreenTime.findOne({ userId })
      .sort({ date: -1 })
      .limit(1);

    // Fetch latest Mood data
    const latestMood = await Mood.findOne({ userId })
      .sort({ timestamp: -1 })
      .limit(1);

    // Debug logs
    logger.info('Fetched ScreenTime for user:', { userId, latestScreenTime });
    logger.info('Fetched Mood for user:', { userId, latestMood });

    // Default recommendation
    let recommendation = {
      type: 'message',
      details: { message: 'Keep up the good work!' },
      trigger: { message: 'No specific conditions met' },
      triggerSource: 'default',
      triggerNote: 'Default recommendation',
    };

    // Apply recommendation rules
    if (latestScreenTime && latestMood) {
      const totalTime = latestScreenTime.totalTime / 60; // Convert to minutes
      const mood = latestMood.mood;

      logger.info('Applying rules:', { totalTime, mood });

      if (totalTime > 300 && mood === 'stressed') {
        recommendation = {
          type: 'break',
          details: { action: 'walk', duration: '5m' },
          trigger: { screenTime: '>5h', mood: 'stressed' },
          triggerSource: 'mood',
          triggerNote: 'Triggered by high screen time and stress',
        };
      } else if (totalTime > 180 && mood === 'tired') {
        recommendation = {
          type: 'break',
          details: { action: 'rest', duration: '10m' },
          trigger: { screenTime: '>3h', mood: 'tired' },
          triggerSource: 'mood',
          triggerNote: 'Triggered by moderate screen time and tiredness',
        };
      } else if (mood === 'happy') {
        recommendation = {
          type: 'message',
          details: { message: 'You’re doing great!' },
          trigger: { mood: 'happy' },
          triggerSource: 'mood',
          triggerNote: 'Triggered by positive mood',
        };
      }
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
      trigger: JSON.stringify(recommendation.trigger),
      accepted: false,
    });

    await newRecommendation.save();
    logger.info('Recommendation saved', { userId, recommendation });

    // Create TriggerLink
    const newTriggerLink = new TriggerLink({
      triggerLinkId: `tl_${Date.now()}`,
      fromSource: recommendation.triggerSource,
      recommendationId: newRecommendation.recommendationId,
      timestamp: new Date(),
      note: recommendation.triggerNote,
    });

    await newTriggerLink.save();
    logger.info('TriggerLink created', { userId, triggerLink: newTriggerLink });

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

// GET /recommendations
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const recommendations = await Recommendation.find({ userId })
      .sort({ timestamp: -1 })
      .limit(5);

    logger.info('Recommendations fetched', { userId, count: recommendations.length });
    res.status(200).json(recommendations);
  } catch (error) {
    logger.error('Error fetching recommendations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
