import express from 'express';
import ScreenTime from '../models/screenTime.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../index.js';
import Challenge from '../models/challenge.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const { title, description, duration, goal, startDate } = req.body;

  try {
    if (!title || !duration || !goal || !startDate) {
      return res
        .status(400)
        .json({ message: 'Title, duration, goal, and startDate are required' });
    }

    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({ message: 'Invalid startDate format' });
    }

    const challenge = new Challenge({
      challengeId: `challenge_${Date.now()}`,
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
  try {
    const now = new Date();
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
          new Date(now.toDateString()),
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

  try {
    if (!challengeId) {
      return res.status(400).json({ message: 'challengeId is required' });
    }
    const challenge = await Challenge.findOne({ challengeId });
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    const participantIndex = challenge.participants.findIndex(
      p => p.userId === userId
    );
    if (participantIndex !== -1) {
      return res
        .status(400)
        .json({ message: 'User already joined this challenge' });
    }

    challenge.participants.push({ userId, reduction: 0 });
    await challenge.save();
    logger.info('User joined challenge', { challengeId, userId });
    res
      .status(200)
      .json({ message: 'Successfully joined challenge', challenge });
  } catch (err) {
    logger.error('Error joining challenge', {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/progress', authMiddleware, async (req, res) => {
  const { challengeId } = req.body;
  const userId = req.user.userId;

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
      return res
        .status(403)
        .json({ message: 'User not participating in this challenge' });
    }

    const now = new Date();
    const startDate = challenge.startDate;
    const endDate = new Date(
      startDate.getTime() + challenge.duration * 24 * 60 * 60 * 1000
    );

    if (now < startDate || now > endDate) {
      return res.status(400).json({ message: 'Challenge is not active' });
    }

    // Fetch baseline (7 days before startDate, up to the day before startDate)
    const baselineStart = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const baselineEnd = new Date(startDate.getTime() - 1 * 24 * 60 * 60 * 1000);

    // Set to midnight UTC for range
    const startOfBaselineStart = new Date(Date.UTC(baselineStart.getUTCFullYear(), baselineStart.getUTCMonth(), baselineStart.getUTCDate()));
    const startOfBaselineEnd = new Date(Date.UTC(baselineEnd.getUTCFullYear(), baselineEnd.getUTCMonth(), baselineEnd.getUTCDate(), 23, 59, 59, 999));

    logger.info('Baseline query', { startOfBaselineStart, startOfBaselineEnd, userId, startDate });

    const baselineData = await ScreenTime.aggregate([
      {
        $match: {
          userId,
          date: {
            $gte: startOfBaselineStart,
            $lte: startOfBaselineEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          avgTotalTime: { $avg: '$totalTime' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (!baselineData.length || baselineData[0].count < 7) {
      return res.status(400).json({ message: 'Insufficient baseline data' });
    }

    const baselineTotalTime = baselineData[0].avgTotalTime;
    logger.info('Baseline calculation', { baselineTotalTime, count: baselineData[0].count });

    // Fetch the latest available ScreenTime (current or most recent day)
    const currentDay = new Date(now.toISOString().split('T')[0]);
    let currentData = await ScreenTime.findOne({ userId, date: currentDay });
    if (!currentData) {
      // Fallback to the most recent day if current day data is missing
      currentData = await ScreenTime.findOne({ userId, date: { $lt: currentDay } }).sort({ date: -1 });
    }
    const currentTotalTime = currentData ? currentData.totalTime : baselineTotalTime; // Default to baseline if no data
    logger.info('Current day data', { currentTotalTime, date: currentData ? currentData.date : currentDay });

    // Calculate daily reduction (in hours), capped at goal
    const dailyReduction = Math.min(challenge.goal / 60, Math.max(0, (baselineTotalTime - currentTotalTime) / 3600));
    const totalReduction = participant.reduction + dailyReduction; // Accumulate reduction

    // Update reduction, ensuring it doesn’t exceed the goal times duration
    const maxReduction = (challenge.goal / 60) * challenge.duration;
    participant.reduction = Math.min(totalReduction, maxReduction);
    await challenge.save();
    logger.info('Progress updated', { challengeId, userId, reduction: participant.reduction });
    res.status(200).json({ message: 'Progress updated', reduction: participant.reduction });
  } catch (err) {
    logger.error('Error updating progress', {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;