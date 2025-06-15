import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import winston from 'winston';
import healthRouter from './routes/health.js';
import connectDB from './db/index.js';
import {config} from './config/env.js';
import mongoose from 'mongoose';
import testRouter from './routes/test.js';
import authRouter from './routes/auth.js';
import screenTimeRouter from './routes/screenTime.js';
import testMoodRouter from './routes/testMood.js';
import moodRouter from './routes/mood.js';
import recommendationRouter from './routes/recommendations.js';

const logger = winston.createLogger ({
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

export {logger};

const app = express ();

app.use (cors ({origin: 'http://localhost:3000'}));
app.use (express.json ());

app.use ('/health', healthRouter);
app.use ('/test-user', testRouter);
app.use ('/auth', authRouter);
app.use ('/screen-time', screenTimeRouter);
app.use ('/test-mood', testMoodRouter);
app.use ('/mood', moodRouter);
app.use ('/recommendations', recommendationRouter);
app.get ('/ping', (req, res) => {
  res.status (200).json ({status: 'Server is running'});
});

app.use ((err, req, res, next) => {
  logger.error (err.stack);
  res.status (500).send ('Something went wrong');
});

const startServer = async () => {
  try {
    await connectDB ();
    app.listen (config.port, () => {
      logger.info (`Server running on port ${config.port}`);
    });
  } catch (error) {
    logger.error ('Failed to start server:', error);
    process.exit (1);
  }
};

process.on ('SIGTERM', async () => {
  logger.info ('SIGTERM received. Closing server...');
  await mongoose.connection.close ();
  process.exit (1);
});

startServer ();
