import express from 'express';
import logger from '../logger.js'; // Import logger from the new file
import ScreenTime from '../models/screenTime.js';
import Mood from '../models/mood.js';
import Recommendation from '../models/recommendation.js';
import TriggerLink from '../models/triggerLink.js';
import { authMiddleware } from '../middleware/auth.js';

// Log only inside a function to avoid initialization issues
const logInitialization = () => {
  logger.info('Loading recommendations.js routes');
};
logInitialization();

const router = express.Router();

// POST /recommendations
router.post('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const latestScreenTime = await ScreenTime.findOne({ userId })
      .sort({ date: -1 })
      .limit(1);

    const latestMood = await Mood.findOne({ userId })
      .sort({ timestamp: -1 })
      .limit(1);

    let recommendation = {
      type: 'message',
      details: { message: 'Keep up the good work!' },
      trigger: { message: 'No specific conditions met' },
      triggerSource: 'default',
      triggerNote: 'Default recommendation',
    };

    if (latestScreenTime && latestMood) {
      const totalTime = latestScreenTime.totalTime / 60;
      const mood = latestMood.mood;

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

    const newTriggerLink = new TriggerLink({
      triggerLinkId: `tl_${Date.now()}`,
      fromSource: recommendation.triggerSource,
      recommendationId: newRecommendation.recommendationId,
      timestamp: new Date(),
      note: recommendation.triggerNote,
    });

    await newTriggerLink.save();
    logger.info('TriggerLink created', { userId, triggerLink: newTriggerLink });

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

// PATCH /recommendations/:id
router.patch('/:id', authMiddleware, async (req, res) => {
  logger.info(`Received PATCH request for /recommendations/${req.params.id}`);
  const userId = req.user.userId;
  const recommendationId = req.params.id;
  const { accepted } = req.body;

  try {
    if (typeof accepted !== 'boolean') {
      logger.warn('Invalid request: Accepted field must be a boolean');
      return res.status(400).json({ message: 'Accepted field must be a boolean' });
    }

    logger.info(`Querying recommendation: recommendationId=${recommendationId}, userId=${userId}`);
    const updatedRecommendation = await Recommendation.findOneAndUpdate(
      { recommendationId, userId },
      { accepted },
      { new: true }
    );

    if (!updatedRecommendation) {
      logger.warn(`Recommendation not found: recommendationId=${recommendationId}, userId=${userId}`);
      return res.status(404).json({ message: 'Recommendation not found or not authorized' });
    }

    logger.info('Recommendation updated', { userId, recommendationId, accepted });
    res.status(200).json(updatedRecommendation);
  } catch (error) {
    logger.error('Error updating recommendation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;