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

    challenge.participants.push({ userId, reduction: 0, lastUpdate: now.getTime() });
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

    const baselineStart = new Date(challenge.startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const baselineEnd = new Date(challenge.startDate.getTime() - 1 * 24 * 60 * 60 * 1000);
    const startOfBaselineStart = new Date(baselineStart.toISOString().split('T')[0]);
    const startOfBaselineEnd = new Date(new Date(baselineEnd.toISOString().split('T')[0]).getTime() + 86399999);

    const baselineData = await ScreenTime.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startOfBaselineStart, $lte: startOfBaselineEnd },
        },
      },
      {
        $group: {
          _id: null,
          avgTotalTime: { $avg: '$totalTime' },
          count: { $sum: 1 },
        },
      },
    ]).catch(err => {
      logger.error('Aggregation error for baseline data', { error: err.message, stack: err.stack });
      return [];
    });

    let baselineTotalTime;
    if (!baselineData.length || baselineData[0].count < 7) {
      logger.info('Insufficient baseline data, using earliest challenge day as baseline', { userId });
      const firstDayData = await ScreenTime.findOne({ 
        userId, 
        date: { $gte: challenge.startDate, $lte: new Date(challenge.startDate.getTime() + challenge.duration * 24 * 60 * 60 * 1000) } 
      }).sort({ date: 1 });
      baselineTotalTime = firstDayData ? firstDayData.totalTime : 0;
      if (!firstDayData) {
        logger.warn('No screen time data available in challenge period, skipping update', { userId });
        return res.status(200).json({ message: 'No screen time data available, update skipped' });
      }
    } else {
      baselineTotalTime = baselineData[0].avgTotalTime;
    }

    const currentDay = new Date(now.toISOString().split('T')[0]);
    let currentData = await ScreenTime.findOne({ userId, date: currentDay });
    if (!currentData) {
      currentData = await ScreenTime.findOne({ 
        userId, 
        date: { $lt: currentDay, $gte: challenge.startDate } 
      }).sort({ date: -1 });
    }

    const currentTotalTime = currentData ? currentData.totalTime : baselineTotalTime;

    const dailyReduction = Math.min(
      challenge.goal / 60,
      Math.max(0, (baselineTotalTime - currentTotalTime) / 3600)
    );
    const totalReduction = (participant.reduction / 3600) + dailyReduction;
    const maxReduction = (challenge.goal / 60) * challenge.duration;
    const newReduction = Math.min(totalReduction, maxReduction) * 3600;

    if (now.getTime() - participant.lastUpdate >= 3600000 || manualTrigger) {
      const updatedChallenge = await Challenge.findOneAndUpdate(
        { challengeId, 'participants.userId': userId },
        { $set: { 'participants.$.reduction': newReduction, 'participants.$.lastUpdate': now.getTime() } },
        { new: true, runValidators: true }
      );
      if (!updatedChallenge) throw new Error('Failed to update participant');
      logger.info('Progress updated', { challengeId, userId, reduction: newReduction / 3600, timestamp: now });
      res.status(200).json({
        message: 'Progress updated',
        reduction: newReduction / 3600,
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

        const baselineStart = new Date(challenge.startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        const baselineEnd = new Date(challenge.startDate.getTime() - 1 * 24 * 60 * 60 * 1000);
        const startOfBaselineStart = new Date(baselineStart.toISOString().split('T')[0]);
        const startOfBaselineEnd = new Date(new Date(baselineEnd.toISOString().split('T')[0]).getTime() + 86399999);

        const baselineData = await ScreenTime.aggregate([
          { $match: { userId, date: { $gte: startOfBaselineStart, $lte: startOfBaselineEnd } } },
          { $group: { _id: null, avgTotalTime: { $avg: '$totalTime' }, count: { $sum: 1 } } },
        ]);

        let baselineTotalTime;
        if (!baselineData.length || baselineData[0].count < 7) {
          const firstDayData = await ScreenTime.findOne({ 
            userId, 
            date: { $gte: challenge.startDate, $lte: challengeEnd } 
          }).sort({ date: 1 });
          baselineTotalTime = firstDayData ? firstDayData.totalTime : 0;
          if (!firstDayData) {
            logger.warn('No screen time data in challenge period, skipping update', { userId, challengeId });
            continue;
          }
          logger.info('Using earliest challenge day as baseline', { userId, challengeId, date: firstDayData.date });
        } else {
          baselineTotalTime = baselineData[0].avgTotalTime;
          logger.info('Using baseline average', { userId, challengeId, avgTotalTime: baselineTotalTime });
        }

        const currentDay = new Date(now.toISOString().split('T')[0]);
        let currentData = await ScreenTime.findOne({ userId, date: currentDay });
        if (!currentData) {
          currentData = await ScreenTime.findOne({ 
            userId, 
            date: { $lt: currentDay, $gte: challenge.startDate } 
          }).sort({ date: -1 });
          if (!currentData) {
            logger.warn('No recent screen time data, using baseline', { userId, challengeId });
          }
        }

        const currentTotalTime = currentData ? currentData.totalTime : baselineTotalTime;
        const dailyReduction = Math.min(
          challenge.goal / 60,
          Math.max(0, (baselineTotalTime - currentTotalTime) / 3600)
        );
        const totalReduction = (participant.reduction / 3600) + dailyReduction;
        const maxReduction = (challenge.goal / 60) * challenge.duration;
        const newReduction = Math.min(totalReduction, maxReduction) * 3600;

        await Challenge.findOneAndUpdate(
          { challengeId, 'participants.userId': userId },
          { $set: { 'participants.$.reduction': newReduction, 'participants.$.lastUpdate': now.getTime() } },
          { new: true, runValidators: true }
        );
        logger.info('Daily progress updated', { 
          challengeId, 
          userId, 
          reduction: newReduction / 3600, 
          timestamp: now,
          currentDate: currentDay,
          currentTotalTime,
          baselineTotalTime
        });
      }
    }
    logger.info('Daily progress update completed', { timestamp: now });
  } catch (err) {
    logger.error('Error in daily progress update', { error: err.message, stack: err.stack });
  }
}, {
  timezone: 'Asia/Kolkata',
});

export default router;