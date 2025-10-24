import express from 'express';
import { authMiddleware, verifyAdmin } from '../middleware/auth.js';
import Challenge from '../models/challenge.js';
import ContactMessage from '../models/contactmessage.js';
import User from '../models/user.js';
import ScreenTime from '../models/screenTime.js';
import Review from '../models/review.js';

const router = express.Router();

// All admin routes require auth + admin role
router.use(authMiddleware, verifyAdmin);

// Challenges
router.get('/challenges', async (req, res) => {
  try {
    const list = await Challenge.find({}).sort({ createdAt: -1 });
    // Return all challenges for admin management
    return res.status(200).json(list);
  } catch (e) {
    return res.status(500).json({ message: 'Failed to fetch challenges' });
  }
});

router.post('/challenges', async (req, res) => {
  try {
    const { title, goalHours, startDate, endDate, active } = req.body;
    const doc = new Challenge({
      challengeId: `ch_${Date.now()}`,
      title,
      description: '',
      duration: Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (24 * 60 * 60 * 1000))),
      goal: Number(goalHours) || 0,
      startDate: new Date(startDate),
      participants: [],
      createdAt: new Date(),
      // store active flag inside document (schema lacks explicit field, attach as metadata)
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ message: 'Failed to create challenge' });
  }
});

router.patch('/challenges/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { title, goalHours, startDate, endDate, active } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (goalHours !== undefined) update.goal = Number(goalHours) || 0;
    if (startDate !== undefined) update.startDate = new Date(startDate);
    if (endDate !== undefined) update.duration = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate || new Date())) / (24 * 60 * 60 * 1000)));
    const doc = await Challenge.findOneAndUpdate({ challengeId }, update, { new: true });
    if (!doc) return res.status(404).json({ message: 'Challenge not found' });
    res.status(200).json(doc);
  } catch (e) {
    res.status(500).json({ message: 'Failed to update challenge' });
  }
});

router.delete('/challenges/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const result = await Challenge.findOneAndDelete({ challengeId });
    if (!result) return res.status(404).json({ message: 'Challenge not found' });
    res.status(200).json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete challenge' });
  }
});

// Contacts
router.get('/contacts', async (req, res) => {
  try {
    const list = await ContactMessage.find({}).sort({ createdAt: -1 });
    res.status(200).json(list);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
});

router.patch('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolved } = req.body;
    const doc = await ContactMessage.findByIdAndUpdate(id, { resolved: !!resolved }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Contact not found' });
    res.status(200).json(doc);
  } catch (e) {
    res.status(500).json({ message: 'Failed to update contact' });
  }
});

// Users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('userId username email role active');
    // Build simple screen time summaries using ScreenTime model
    const all = await ScreenTime.find({}).select('userId date totalTime');
    const byUser = {};
    all.forEach(x => {
      byUser[x.userId] = byUser[x.userId] || { total: 0, days: 0 };
      byUser[x.userId].total += Number(x.totalTime || 0);
      byUser[x.userId].days += 1;
    });
    const result = users.map(u => ({
      userId: u.userId,
      username: u.username,
      email: u.email,
      role: u.role,
      active: u.active,
      totalScreenTime: byUser[u.userId]?.total || 0,
      daysTracked: byUser[u.userId]?.days || 0,
    }));
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.patch('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { active, resetChallengeProgress } = req.body;
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (active !== undefined) user.active = !!active;
    await user.save();
    // Optionally reset challenge progress: remove user from all participants arrays
    if (resetChallengeProgress) {
      await Challenge.updateMany(
        { 'participants.userId': userId },
        { $pull: { participants: { userId } } }
      );
    }
    res.status(200).json({ message: 'User updated' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

export default router;
