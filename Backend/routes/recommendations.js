import express from 'express';
import { logger } from '../index.js';
import ScreenTime from '../models/screenTime.js';
import Mood from '../models/mood.js';
import Recommendation from '../models/recommendation.js';
import ContextEvent from '../models/contextEvent.js';
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

      // DEV: SL-based policy using context aggregates (local only)
      if (process.env.DEV_MODE === 'true' && process.env.DEV_SL === 'true') {
        try {
          const todayYmd = new Date().toISOString().split('T')[0];
          const agg = await ContextEvent.aggregate([
            { $match: { userId, date: todayYmd } },
            { $group: { _id: '$category', seconds: { $sum: '$seconds' } } },
          ]);
          const byCat = Object.fromEntries(agg.map(a => [a._id, a.seconds]));
          const totalSec = Object.values(byCat).reduce((a,b)=>a+b,0) || 0;
          const share = (k) => totalSec ? (byCat[k] || 0) / totalSec : 0;
          const shares = {
            entertainment: share('entertainment'),
            education: share('education'),
            productivity: share('productivity'),
            social: share('social'),
            news: share('news'),
            dev: share('dev'),
            other: share('other'),
          };
          const mins = Math.round(latestScreenTime.totalTime / 60);
          const workload = shares.productivity + shares.education + shares.dev;
          const entertainment = shares.entertainment + shares.social + shares.news * 0.7;
          let sl = 0.4 * Math.min(1, mins / 300) + 0.4 * Math.max(0, workload - entertainment) + 0.2 * shares.news;
          sl = Math.max(0, Math.min(1, sl));
          const ctxLabel = workload > entertainment ? 'worklike' : (entertainment > 0.5 ? 'entertainment' : 'mixed');

          // Policy mapping
          const hour = new Date().getHours();
          let cat = 'chill';
          if (sl >= 0.7) {
            if (ctxLabel === 'worklike') cat = 'focus';
            else cat = hour >= 21 || hour < 6 ? 'sleep' : 'calm';
          } else if (sl >= 0.4) {
            if (ctxLabel === 'worklike') cat = 'focus';
            else cat = hour >= 20 ? 'relax' : 'upbeat';
          } else {
            if (ctxLabel === 'entertainment') cat = 'upbeat';
            else cat = hour >= 21 || hour < 6 ? 'sleep' : 'chill';
          }

          try {
            const rec = await getPlaylistRec(cat, 'DEV SL policy recommendation');
            rec.triggerSource = 'dev_sl';
            rec.trigger = {
              ...rec.trigger,
              sl: Number(sl.toFixed(2)),
              contextLabel: ctxLabel,
              shares,
            };
            rec.triggerNote = `DEV policy (sl=${sl.toFixed(2)}, ctx=${ctxLabel})`;
            recommendation = rec;
          } catch (e) {
            console.error('DEV SL playlist fetch failed', e?.message || e);
          }
        } catch (e) {
          console.warn('DEV SL path failed, falling back to rule-based', e?.message || e);
        }
      }

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
        console.log('No matching condition met:', { totalTime, mood });
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