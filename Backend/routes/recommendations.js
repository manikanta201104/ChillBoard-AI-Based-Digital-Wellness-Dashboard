import express from 'express';
import { logger } from '../index.js';
import ScreenTime from '../models/screenTime.js';
import Mood from '../models/mood.js';
import Recommendation from '../models/recommendation.js';
import TriggerLink from '../models/triggerLink.js';
import { authMiddleware } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

// POST /recommendations
router.post('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Fetch latest ScreenTime data for the current day
    const today = new Date().toISOString().split('T')[0];
    let latestScreenTime = await ScreenTime.findOne({ userId, date: today });

    // If no document exists, upsert a new one
    if (!latestScreenTime) {
      latestScreenTime = await ScreenTime.findOneAndUpdate(
        { userId, date: today },
        { userId, date: today, totalTime: 0, tabs: [] },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Fetch latest Mood data
    const latestMood = await Mood.findOne({ userId }).sort({ timestamp: -1 }).limit(1);

    // Default recommendation placeholder that we will override when rules match
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
      console.log('Evaluating recommendation with:', { totalTime, mood, timestamp: latestMood.timestamp, rawTotalTime: latestScreenTime.totalTime });

      // Helper to fetch a Spotify playlist for a semantic category (mapped in spotify.js)
      const getPlaylistRec = async (category, note) => {
        const playlistResponse = await axios.get(`${process.env.BACKEND_URL}/spotify/playlist?mood=${encodeURIComponent(category)}`, {
          headers: { Authorization: req.headers.authorization },
        });
        const { spotifyPlaylistId, name } = playlistResponse.data;
        return {
          type: 'music',
          details: { playlistId: spotifyPlaylistId, name },
          trigger: { category, totalTime: `${Math.round(totalTime)}m`, mood },
          triggerSource: 'mood',
          triggerNote: note,
        };
      };

      // Check most specific conditions first
      // 1) Very high usage + stressed: calm/relaxing
      if (totalTime > 300 && mood === 'stressed') {
        try {
          recommendation = await getPlaylistRec('calm', 'Music suggested for stress');
          console.log('Music recommendation triggered:', { playlistId: spotifyPlaylistId, name });
        } catch (spotifyError) {
          console.error('Spotify API error:', spotifyError.message);
          recommendation.triggerNote += ` (Spotify API failed: ${spotifyError.message})`;
        }
      // 2) Long usage + tired: sleep or relax depending on time of day
      } else if (totalTime > 180 && mood === 'tired') {
        try {
          const hour = new Date().getHours();
          const cat = hour >= 21 || hour < 6 ? 'sleep' : 'relax';
          recommendation = await getPlaylistRec(cat, 'Music suggested for tiredness');
        } catch (spotifyError) {
          console.error('Spotify API error:', spotifyError.message);
          recommendation.triggerNote += ` (Spotify API failed: ${spotifyError.message})`;
        }
      // 3) Happy: upbeat/focus based on time (morning focus, otherwise upbeat)
      } else if (mood === 'happy') {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 11) {
          try {
            recommendation = await getPlaylistRec('focus', 'Morning focus boost for happy mood');
          } catch (spotifyError) {
            console.error('Spotify API error:', spotifyError.message);
            recommendation.triggerNote += ` (Spotify API failed: ${spotifyError.message})`;
          }
        } else {
          try {
            recommendation = await getPlaylistRec('upbeat', 'Upbeat tunes for a happy mood');
          } catch (spotifyError) {
            console.error('Spotify API error:', spotifyError.message);
            recommendation.triggerNote += ` (Spotify API failed: ${spotifyError.message})`;
          }
        }
      // 4) Angry: energy/workout to vent
      } else if (mood === 'angry') {
        try {
          recommendation = await getPlaylistRec('energy', 'High-energy music for anger relief');
        } catch (spotifyError) {
          console.error('Spotify API error:', spotifyError.message);
          recommendation.triggerNote += ` (Spotify API failed: ${spotifyError.message})`;
        }
      // 5) Sad: chill first; if usage low, suggest upbeat to lift mood
      } else if (mood === 'sad') {
        try {
          recommendation = await getPlaylistRec(totalTime < 60 ? 'upbeat' : 'chill', 'Mood support for sadness');
        } catch (spotifyError) {
          console.error('Spotify API error:', spotifyError.message);
          recommendation.triggerNote += ` (Spotify API failed: ${spotifyError.message})`;
        }
      // 6) Neutral/calm + high usage: focus
      } else if ((mood === 'neutral' || mood === 'calm') && totalTime > 120) {
        try {
          recommendation = await getPlaylistRec('focus', 'Deep focus after extended screen time');
        } catch (spotifyError) {
          console.error('Spotify API error:', spotifyError.message);
          recommendation.triggerNote += ` (Spotify API failed: ${spotifyError.message})`;
        }
      // 7.1) Movement prompts based on high usage or stressed/tired state
      } else if (totalTime >= 150 || (['stressed','tired'].includes(mood) && totalTime >= 60)) {
        // Prefer a short 5-minute walk
        recommendation = {
          type: 'activity',
          details: { message: 'Take a 5-minute walk to reset your focus.', durationMinutes: 5 },
          trigger: { totalTime: `${Math.round(totalTime)}m`, mood },
          triggerSource: 'rule',
          triggerNote: 'Prompted 5-min walk after prolonged usage or stress/tired mood',
        };
      } else if (totalTime >= 90) {
        // Suggest a 5-minute body stretch
        recommendation = {
          type: 'activity',
          details: { message: 'Stretch your body for 5 minutes to reduce strain.', durationMinutes: 5 },
          trigger: { totalTime: `${Math.round(totalTime)}m`, mood },
          triggerSource: 'rule',
          triggerNote: 'Prompted 5-min stretch after extended usage',
        };
      // 7) Morning routine
      } else if (new Date().getHours() >= 5 && new Date().getHours() < 9) {
        try {
          recommendation = await getPlaylistRec('morning', 'Morning routine boost');
        } catch (spotifyError) {
          console.error('Spotify API error:', spotifyError.message);
          recommendation.triggerNote += ` (Spotify API failed: ${spotifyError.message})`;
        }
      // 8) Evening wind-down
      } else if (new Date().getHours() >= 20 && new Date().getHours() <= 23) {
        try {
          recommendation = await getPlaylistRec('evening', 'Evening wind-down');
        } catch (spotifyError) {
          console.error('Spotify API error:', spotifyError.message);
          recommendation.triggerNote += ` (Spotify API failed: ${spotifyError.message})`;
        }
      } else {
        // No strong condition matched: provide a motivational nudge
        const messages = [
          'Small steps count. Take a 2-minute stretch and hydrate. You got this!',
          'Protect your eyes: follow the 20-20-20 rule. Keep going!',
          'Consistency beats intensity. A short walk can boost your energy.',
          'Deep breaths. Reset posture. Refocus for the next block.',
          'Progress > perfection — you are doing great!'
        ];
        const pick = messages[Math.floor(Math.random() * messages.length)];
        recommendation = {
          type: 'message',
          details: { message: pick },
          trigger: { totalTime: `${Math.round(totalTime)}m`, mood },
          triggerSource: 'rule',
          triggerNote: 'Motivational message fallback',
        };
      }
    } else {
      console.log('Missing latestScreenTime or latestMood:', { latestScreenTime, latestMood });
    }

    // Save recommendation to database
    const newRecommendation = new Recommendation({
      recommendationId: `rec_${Date.now()}`,
      userId,
      timestamp: new Date(),
      type: recommendation.type,
      details: JSON.stringify(recommendation.details),
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