import express from 'express';
import ScreenTime from '../models/screenTime.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../index.js';
import Challenge from '../models/challenge.js';
import User from '../models/user.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';

const router = express.Router();

// Use dynamic current time
const getCurrentTime = () => new Date();

router.post('/', authMiddleware, async (req, res) => {
  const { title, description, duration, goal, startDate } = req.body;

  try {
    if (!title || !duration || !goal || !startDate) {
      return res.status(400).json({
        message: 'Title, duration, goal, and startDate are required',
      });
    }

    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({ message: 'Invalid startDate format' });
    }

    const challenge = new Challenge({
      challengeId: `challenge_${uuidv4()}`,
      title,
      description: description || '',
      duration,
      goal,
      startDate: parsedStartDate,
    });

    await challenge.save();
    logger.info('Challenge created', {
      challengeId: challenge.challengeId,
      title,
    });
    res.status(201).json(challenge);
  } catch (err) {
    logger.error('Error creating challenge', {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  const now = getCurrentTime();
  try {
    const challenges = await Challenge.find({
      $or: [
        { startDate: { $lte: now } },
        {
          startDate: {
            $gt: now,
            $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      ],
      $expr: {
        $gte: [
          {
            $add: [
              '$startDate',
              { $multiply: ['$duration', 24 * 60 * 60 * 1000] },
            ],
          },
          new Date(now.toISOString().split('T')[0]),
        ],
      },
    }).sort({ startDate: 1 });

    logger.info('Challenges fetched', { count: challenges.length });
    res.status(200).json(challenges);
  } catch (err) {
    logger.error('Error fetching challenges', {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/join', authMiddleware, async (req, res) => {
  const { challengeId } = req.body;
  const userId = req.user.userId;
  const now = getCurrentTime();

  try {
    if (!challengeId) {
      return res.status(400).json({ message: 'challengeId is required' });
    }

    const challenge = await Challenge.findOne({ challengeId });
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const alreadyJoined = challenge.participants.some(p => p.userId === userId);
    if (alreadyJoined) {
      return res.status(400).json({ message: 'User already joined this challenge' });
    }

    challenge.participants.push({ userId, reduction: 0, lastUpdate: now.getTime(), joinedAt: now.getTime() });
    await challenge.save();

    logger.info('User joined challenge', { challengeId, userId });
    res.status(200).json({ message: 'Successfully joined challenge', challenge });
  } catch (err) {
    logger.error('Error joining challenge', {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/progress', authMiddleware, async (req, res) => {
  const { challengeId, manualTrigger = false } = req.body;
  const userId = req.user.userId;
  const now = getCurrentTime();

  try {
    if (!challengeId) {
      return res.status(400).json({ message: 'challengeId is required' });
    }

    const challenge = await Challenge.findOne({ challengeId });
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const participant = challenge.participants.find(p => p.userId === userId);
    if (!participant) {
      return res.status(403).json({ message: 'User not participating in this challenge' });
    }

    if (now < challenge.startDate || now > new Date(challenge.startDate.getTime() + challenge.duration * 24 * 60 * 60 * 1000)) {
      return res.status(400).json({ message: 'Challenge is not active' });
    }

    // Day-over-day reduction model anchored to participant join date
    const anchorDate = new Date(Math.max(challenge.startDate.getTime(), participant.joinedAt || challenge.startDate.getTime()));
    const anchorYmd = new Date(new Date(anchorDate).setHours(0,0,0,0));
    const startOfCurrentDay = new Date(new Date(now).setHours(0,0,0,0));
    const endOfCurrentDay = new Date(new Date(now).setHours(23,59,59,999));

    // Prevent multiple updates in the same day (unless manualTrigger explicitly set to true)
    const lastUpdateDay = new Date(new Date(participant.lastUpdate).setHours(0,0,0,0));
    if (!manualTrigger && lastUpdateDay.getTime() === startOfCurrentDay.getTime()) {
      logger.info('Progress update skipped, already updated today', { challengeId, userId, lastUpdate: participant.lastUpdate });
      return res.status(204).send('Already updated today');
    }

    // Find last available tracked day before today (>= anchor). If none, fallback to any prior day.
    let prevDoc = await ScreenTime.findOne({ userId, date: { $lt: startOfCurrentDay, $gte: anchorYmd } }).sort({ date: -1 });
    if (!prevDoc) {
      prevDoc = await ScreenTime.findOne({ userId, date: { $lt: startOfCurrentDay } }).sort({ date: -1 });
    }
    const todayDoc = await ScreenTime.findOne({ userId, date: { $gte: startOfCurrentDay, $lte: endOfCurrentDay } });

    if (!prevDoc || !todayDoc) {
      logger.info('Insufficient data for update (need current day and a previous tracked day since anchor)', { challengeId, userId, hasPrev: !!prevDoc, hasCurrent: !!todayDoc });
      return res.status(200).json({ message: 'Insufficient data for update' });
    }

    // Do not credit reduction for days with 0 screen time (anti-cheat)
    if ((prevDoc.totalTime || 0) === 0 || (todayDoc.totalTime || 0) === 0) {
      logger.info('Zero-time detected, skipping reduction', { challengeId, userId, prevDate: prevDoc.date, prevTotal: prevDoc.totalTime, currentTotal: todayDoc.totalTime });
      return res.status(200).json({ message: 'Skipped day with zero screen time' });
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const gapDays = Math.max(1, Math.round((startOfCurrentDay - new Date(new Date(prevDoc.date).setHours(0,0,0,0))) / dayMs));
    const deltaHours = Math.max(0, (prevDoc.totalTime - todayDoc.totalTime) / 3600);
    const addedHours = deltaHours; // No per-day or total caps

    const totalReductionHours = (participant.reduction / 3600) + addedHours;
    const newReduction = totalReductionHours * 3600;

    if (now.getTime() - participant.lastUpdate >= 3600000 || manualTrigger || lastUpdateDay.getTime() !== startOfCurrentDay.getTime()) {
      const updatedChallenge = await Challenge.findOneAndUpdate(
        { challengeId, 'participants.userId': userId },
        { $set: { 'participants.$.reduction': newReduction, 'participants.$.lastUpdate': now.getTime() } },
        { new: true, runValidators: true }
      );
      if (!updatedChallenge) throw new Error('Failed to update participant');
      logger.info('Progress updated (uncapped, gap-aware)', { challengeId, userId, addedHours, gapDays, totalHours: totalReductionHours, timestamp: now, prevDate: prevDoc.date, currentDate: startOfCurrentDay });
      res.status(200).json({
        message: 'Progress updated (uncapped, gap-aware)',
        reduction: totalReductionHours,
      });
    } else {
      logger.info('Progress update skipped, within 1-hour interval', { challengeId, userId, lastUpdate: participant.lastUpdate, now: now.getTime() });
      res.status(204).send('No update needed within hour');
    }
  } catch (err) {
    logger.error('Error updating progress', {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const { challengeId } = req.query;
    if (!challengeId) {
      return res.status(400).json({ message: 'challengeId is required' });
    }

    const challenge = await Challenge.findOne({ challengeId }).lean();
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (!challenge.participants || !Array.isArray(challenge.participants) || challenge.participants.length === 0) {
      // Friendly empty state: return an empty leaderboard instead of error
      return res.status(200).json([]);
    }

    let rank = 1;
    const rankedParticipants = challenge.participants
      .sort((a, b) => b.reduction - a.reduction)
      .map((participant, index) => ({
        ...participant,
        rank: index + 1,
      }))
      .slice(0, 10);

    const allUserIds = rankedParticipants.map(p => p.userId);

    const users = await User.find(
      { userId: { $in: allUserIds } },
      'username userId'
    ).lean();

    const leaderboard = rankedParticipants.map(participant => {
      const match = users.find(u => u.userId === participant.userId);
      return {
        rank: participant.rank,
        userId: participant.userId,
        username: match ? match.username : 'Anonymous',
        reduction: participant.reduction / 3600,
      };
    });

    res.status(200).json(leaderboard);
  } catch (err) {
    logger.error('Error fetching leaderboard', {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Daily progress update at midnight IST
cron.schedule('0 0 * * *', async () => {
  const now = getCurrentTime();
  try {
    const challenges = await Challenge.find({
      startDate: { $lte: now },
      $expr: {
        $gte: [
          { $add: ['$startDate', { $multiply: ['$duration', 24 * 60 * 60 * 1000] }] },
          now,
        ],
      },
    });

    for (const challenge of challenges) {
      const challengeEnd = new Date(challenge.startDate.getTime() + challenge.duration * 24 * 60 * 60 * 1000);
      for (const participant of challenge.participants) {
        const userId = participant.userId;
        const challengeId = challenge.challengeId;

        // Gap-aware calculation (IST midnight triggered)
        const anchorDate = new Date(Math.max(challenge.startDate.getTime(), participant.joinedAt || challenge.startDate.getTime()));
        const anchorYmd = new Date(anchorDate.toISOString().split('T')[0]);
        const currentDay = new Date(now.toISOString().split('T')[0]);
        // Find last available tracked day before currentDay (>= anchor). If none, fallback to any prior day.
        let prevDoc = await ScreenTime.findOne({ userId, date: { $lt: currentDay, $gte: anchorYmd } }).sort({ date: -1 });
        if (!prevDoc) {
          prevDoc = await ScreenTime.findOne({ userId, date: { $lt: currentDay } }).sort({ date: -1 });
        }
        const todayDoc = await ScreenTime.findOne({ userId, date: currentDay });
        if (!prevDoc || !todayDoc) {
          logger.info('Insufficient data (cron), need current day and a previous tracked day since anchor', { challengeId, userId, hasPrev: !!prevDoc, hasCurrent: !!todayDoc });
          continue;
        }

        if ((prevDoc.totalTime || 0) === 0 || (todayDoc.totalTime || 0) === 0) {
          logger.info('Zero-time detected (cron), skipping reduction', { challengeId, userId, prevDate: prevDoc.date, prevTotal: prevDoc.totalTime, currentTotal: todayDoc.totalTime });
          continue;
        }

        const dayMs = 24 * 60 * 60 * 1000;
        const gapDays = Math.max(1, Math.round((new Date(currentDay) - new Date(prevDoc.date)) / dayMs));
        const deltaHours = Math.max(0, (prevDoc.totalTime - todayDoc.totalTime) / 3600);
        const addedHours = deltaHours;
        const totalReductionHours = (participant.reduction / 3600) + addedHours;
        const newReduction = totalReductionHours * 3600;

        await Challenge.findOneAndUpdate(
          { challengeId, 'participants.userId': userId },
          { $set: { 'participants.$.reduction': newReduction, 'participants.$.lastUpdate': now.getTime() } },
          { new: true, runValidators: true }
        );
        logger.info('Daily progress updated (uncapped, gap-aware)', { 
          challengeId, 
          userId, 
          addedHours, 
          totalHours: totalReductionHours, 
          timestamp: now,
          currentDate: currentDay,
          prevDate: prevDoc.date,
          gapDays,
        });
      }
    }
    logger.info('Daily progress update completed', { timestamp: now });
  } catch (err) {
    logger.error('Error in daily progress update', { error: err.message, stack: err.stack });
  }
}, { timezone: 'Asia/Kolkata' });

export default router;