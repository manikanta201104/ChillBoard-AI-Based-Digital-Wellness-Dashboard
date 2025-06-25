import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../index.js';
import Challenge from '../models/challenge.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const { title, description, duration, goal, startDate } = req.body;

  try {
    if (!title || !duration || !goal || !startDate) {
      return res.status(400).json({ message: 'Title, duration, goal, and startDate are required' });
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
    logger.info('Challenge created', { challengeId: challenge.challengeId, title });
    res.status(201).json(challenge);
  } catch (err) {
    logger.error('Error creating challenge', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const challenges = await Challenge.find({
      // Include challenges that have started or are upcoming
      $or: [
        { startDate: { $lte: now } }, // Started challenges
        { startDate: { $gt: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } }, // Upcoming within 7 days
      ],
      $expr: { $gte: [{ $add: ['$startDate', { $multiply: ['$duration', 24 * 60 * 60 * 1000] }] }, now] }, // Not expired
    }).sort({ startDate: 1 }); // Sort by start date
    logger.info('Challenges fetched', { count: challenges.length });
    res.status(200).json(challenges);
  } catch (err) {
    logger.error('Error fetching challenges', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/join',authMiddleware,async(req,res)=>{
  const {challengeId}=req.body;
  const userId=req.user.userId;

  try{
    if(!challengeId){
      return res.status(400).json({message:'challengeId is required'});
    }
    const challenge=await Challenge.findOne({challengeId});
    if(!challenge){
      return res.status(404).json({message:'Challenge not found'});
    }
    const participantIndex=challenge.participants.findIndex(p=>p.userId===userId);
    if(participantIndex!==-1){
      return res.status(400).json({message:'User already joined this challenge'});
    }

    challenge.participants.push({userId,reduction:0});
    await challenge.save();
    logger.info('User joined challenge',{challengeId,userId});
    res.status(200).json({message:'Successfully joined challenge',challenge});
  }catch(err){
    logger.error('Error joining challenge',{error:err.message,stack:err.stack});
    res.status(500).json({message:'Server error',error:err.message});
  }
})

export default router;