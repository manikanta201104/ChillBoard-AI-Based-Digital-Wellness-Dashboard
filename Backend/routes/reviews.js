import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Review from '../models/review.js';

const router = express.Router();

// Public: GET /reviews - list approved reviews for landing page
router.get('/', async (req, res) => {
  try {
    const list = await Review.find({ status: 'approved' }).sort({ createdAt: -1 });
    return res.status(200).json(list);
  } catch (e) {
    return res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// Authenticated: POST /reviews - submit a review (goes to pending)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { rating, text, name, email } = req.body;
    if (!rating || !text) return res.status(400).json({ message: 'rating and text are required' });
    const doc = new Review({ userId: req.user.userId, name: name || 'Anonymous', email, rating, text, status: 'pending' });
    await doc.save();
    return res.status(201).json({ message: 'Review submitted and pending approval', review: doc });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to submit review' });
  }
});

export default router;
