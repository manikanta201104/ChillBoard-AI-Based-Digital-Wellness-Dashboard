import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import ScreenTime from '../models/screenTime.js';
import Mood from '../models/mood.js';
import ContextEvent from '../models/contextEvent.js';
import { logger } from '../index.js';

const router = express.Router();

function toYMD(d) {
  if (!d) return null;
  const dd = new Date(d);
  const y = dd.getFullYear();
  const m = String(dd.getMonth() + 1).padStart(2, '0');
  const day = String(dd.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function entropyFromMap(obj) {
  const vals = Object.values(obj);
  const total = vals.reduce((a, b) => a + b, 0) || 1;
  const probs = vals.map(v => v / total).filter(p => p > 0);
  return -probs.reduce((s, p) => s + p * Math.log2(p), 0);
}

// GET /dev/features?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns per-day feature rows for the current user (local training use only)
router.get('/features', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const { from, to } = req.query;
  try {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    // Pull ScreenTime within range
    const stQuery = { userId };
    if (fromDate || toDate) {
      stQuery.date = {};
      if (fromDate) stQuery.date.$gte = fromDate;
      if (toDate) stQuery.date.$lte = toDate;
    }
    const screens = await ScreenTime.find(stQuery).sort({ date: 1 });

    // Latest mood (weak label support)
    const mood = await Mood.findOne({ userId }).sort({ timestamp: -1 });

    // Assemble per-day rows
    const rows = [];
    for (const s of screens) {
      const ymd = toYMD(s.date);
      // Aggregate context seconds by category for that day
      const ctx = await ContextEvent.aggregate([
        { $match: { userId, date: ymd } },
        { $group: { _id: '$category', seconds: { $sum: '$seconds' } } },
      ]);
      const catSeconds = Object.fromEntries(ctx.map(c => [c._id, c.seconds]));
      const totalSec = Object.values(catSeconds).reduce((a, b) => a + b, 0);
      const shares = {};
      ['entertainment','education','productivity','social','news','dev','other']
        .forEach(k => { shares[`share_${k}`] = totalSec ? (catSeconds[k] || 0) / totalSec : 0; });
      const entropy = entropyFromMap(catSeconds);

      rows.push({
        date: ymd,
        total_minutes: Math.round((s.totalTime || 0) / 60),
        entropy,
        ...shares,
        label_mood: mood?.mood || null,
      });
    }

    return res.status(200).json(rows);
  } catch (err) {
    logger.error('DEV /features error', { message: err.message });
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /dev/score  (local stub until ONNX/Python scorer is wired)
// Body: { features: {...} }
// Returns: { sl: number, explanation: {...}, contextLabel: string }
router.post('/score', authMiddleware, async (req, res) => {
  try {
    const f = req.body?.features || {};
    // Simple heuristic baseline for dev only
    const mins = Number(f.total_minutes || 0);
    const share_ent = Number(f.share_entertainment || f.share_ent || f.share_entertainment || 0);
    const share_edu = Number(f.share_education || 0);
    const share_prod = Number(f.share_productivity || 0);
    const share_news = Number(f.share_news || 0);
    const share_social = Number(f.share_social || 0);

    // Workload vs entertainment proxy
    const workload = share_prod + share_edu + Number(f.share_dev || 0);
    const entertainment = share_ent + share_social + share_news * 0.7;

    let sl = 0.4 * Math.min(1, mins / 300) + 0.4 * Math.max(0, workload - entertainment) + 0.2 * share_news;
    sl = Math.max(0, Math.min(1, sl));

    // Context label
    const ctx = workload > entertainment ? 'worklike' : (entertainment > 0.5 ? 'entertainment' : 'mixed');

    return res.status(200).json({
      sl,
      explanation: { total_minutes: mins, workload, entertainment, share_news },
      contextLabel: ctx,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
