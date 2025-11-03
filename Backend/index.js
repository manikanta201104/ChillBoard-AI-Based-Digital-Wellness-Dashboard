import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import winston from 'winston';
import authRoutes from './routes/auth.js';
import screenTimeRoutes from './routes/screenTime.js';
import moodRoutes from './routes/mood.js';
import recommendationsRoutes from './routes/recommendations.js';
import spotifyRoutes from './routes/spotify.js';
import challengesRoutes from './routes/challenges.js';
import adminRoutes from './routes/admin.js';
import contactRoutes from './routes/contact.js';
import reviewsRoutes from './routes/reviews.js';

dotenv.config ();

// Logger setup
export const logger = winston.createLogger ({
  level: 'info',
  format: winston.format.combine (
    winston.format.timestamp (),
    winston.format.json ()
  ),
  transports: [
    new winston.transports.Console (),
    new winston.transports.File ({filename: 'logs/error.log', level: 'error'}),
    new winston.transports.File ({filename: 'logs/combined.log'}),
  ],
});

const app = express ();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Allow any Chrome extension origin
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }

    // Allow these specific web origins
    const allowedOrigins = [
      'http://localhost:3000',
      'https://www.chillboard.in',
      'https://chillboard.in',
      'https://chillboard-6uoj.onrender.com'
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Block everything else
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS', 'DELETE'],
  // Broaden allowed headers to prevent preflight failures from common client headers
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true
}));



app.use (express.json ());

app.get ('/test', (req, res) => {
  logger.info ('Received GET request at /test');
  res.status (200).json ({message: 'Server is running'});
});

app.patch ('/test-patch', (req, res) => {
  res.status (200).json ({message: 'PATCH request received'});
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});


app.use ('/auth', authRoutes);
app.use ('/screen-time', screenTimeRoutes);
app.use ('/mood', moodRoutes);
app.use ('/recommendations', recommendationsRoutes);
app.use ('/ping', (req, res) => {
  logger.info ('Received GET request at /ping');
  res.status (200).json ({message: 'Pong'});
});
app.use ('/spotify', spotifyRoutes);
app.use ('/challenges', challengesRoutes);
app.use ('/contact', contactRoutes);
app.use ('/admin', adminRoutes);
app.use ('/reviews', reviewsRoutes);
// Alias for clients calling /api/reviews
app.use ('/api/reviews', reviewsRoutes);

// MongoDB Connection
mongoose
  .connect (process.env.MONGO_URI)
  .then (() => logger.info ('Connected to MongoDB'))
  .catch (err => logger.error ('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen (PORT, () => {
  logger.info (`Server running on port ${PORT}`);
});
