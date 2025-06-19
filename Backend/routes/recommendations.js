import express from 'express';
import { logger } from '../index.js';
import ScreenTime from '../models/screenTime.js';
import Mood from '../models/mood.js';
import Recommendation from '../models/recommendation.js';
import TriggerLink from '../models/triggerLink.js';
import { authMiddleware } from '../middleware/auth.js';
import Playlist from '../models/playlist.js';

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
      const mood = latestMood.mood.toLowerCase();

      // Check most specific conditions first
      if (totalTime > 300 && mood === 'stressed') {
        // Fetch a calm playlist for stressed mood
        const playlist = await Playlist.findOne({ userId, mood: 'calm' })
          .sort({ timestamp: -1 })
          .limit(1)
          .exec();
        if (playlist) {
          recommendation = {
            type: 'music',
            details: {
              playlistId: playlist.spotifyPlaylistId,
              name: playlist.name,
            },
            trigger: { screenTime: '>5h', mood: 'stressed' },
            triggerSource: 'mood',
            triggerNote: 'Music suggested for stress',
          };
        } else {
          recommendation = {
            type: 'break',
            details: { action: 'stretch', duration: '5m' }, // Changed to avoid confusion with tired
            trigger: { screenTime: '>5h', mood: 'stressed' },
            triggerSource: 'mood',
            triggerNote: 'Triggered by high screen time and stress, no playlist',
          };
        }
      } else if (totalTime > 180 && mood === 'tired') {
        // Fetch a relax playlist for tired mood
        const playlist = await Playlist.findOne({ userId, mood: 'tired' })
          .sort({ timestamp: -1 })
          .limit(1)
          .exec();
        if (playlist) {
          recommendation = {
            type: 'music',
            details: {
              playlistId: playlist.spotifyPlaylistId,
              name: playlist.name,
            },
            trigger: { screenTime: '>3h', mood: 'tired' },
            triggerSource: 'mood',
            triggerNote: 'Music suggested for tiredness',
          };
        } else {
          recommendation = {
            type: 'break',
            details: { action: 'rest', duration: '10m' },
            trigger: { screenTime: '>3h', mood: 'tired' },
            triggerSource: 'mood',
            triggerNote: 'Triggered by moderate screen time and tiredness',
          };
        }
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
      details: JSON.stringify(recommendation.details), // Ensure consistent stringification
      trigger: JSON.stringify(recommendation.trigger),
      accepted: false,
    });

    await newRecommendation.save();
    logger.info('Recommendation saved', { userId, recommendation: newRecommendation });

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
    res.status(500).json({ message: 'Server error', error: error.message });
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
  const userId = req.user.userId;
  const recommendationId = req.params.id;
  const { accepted } = req.body;

  try {
    if (typeof accepted !== 'boolean') {
      return res.status(400).json({ message: 'Accepted field must be a boolean' });
    }

    const updatedRecommendation = await Recommendation.findOneAndUpdate(
      { recommendationId, userId },
      { accepted },
      { new: true }
    );

    if (!updatedRecommendation) {
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