import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import ContextEvent from '../models/contextEvent.js';
import { logger } from '../index.js';

const router = express.Router();

// POST /context-events
router.post('/events', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const events = Array.isArray(req.body?.events) ? req.body.events : [];

  if (events.length === 0) {
    return res.status(200).json({ message: 'No events' });
  }

  try {
    const ops = events
      .filter(e => e.date && e.hostname && e.category)
      .map((e) => ({
        updateOne: {
          filter: {
            userId,
            date: e.date,
            hostname: e.hostname,
            category: e.category,
            titleHash: e.titleHash || null,
          },
          update: {
            $setOnInsert: {
              userId,
              date: e.date,
              hostname: e.hostname,
              category: e.category,
              titleHash: e.titleHash || null,
              source: 'extension',
            },
            $set: {
              sentiment: ['neg', 'neu', 'pos'].includes(e.sentiment)
                ? e.sentiment
                : null,
            },
            $inc: {
              seconds: Math.max(0, Number(e.seconds || 0)),
            },
          },
          upsert: true,
        },
      }));

    if (ops.length > 0) {
      await ContextEvent.bulkWrite(ops, { ordered: false });
    }

    logger.info('Context events ingested', { userId, count: ops.length });

    return res.status(200).json({ message: 'ok', count: ops.length });
  } catch (err) {
    logger.error('Ingest error', {
      message: err.message,
      writeErrors: err.writeErrors || [],
    });

    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /context/aggregate?date=YYYY-MM-DD
router.get('/aggregate', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const date = req.query.date;

  if (!date) return res.status(400).json({ message: 'date is required' });

  try {
    const agg = await ContextEvent.aggregate([
      { $match: { userId, date } },
      {
        $group: {
          _id: { category: '$category', hostname: '$hostname' },
          seconds: { $sum: '$seconds' },
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id.category',
          hostname: '$_id.hostname',
          seconds: 1,
        }
      },
      { $sort: { seconds: -1 } },
    ]);

    return res.status(200).json(agg);
  } catch (err) {
    logger.error('Aggregate error', { message: err.message });
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
