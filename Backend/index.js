import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import winston from 'winston';


mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => logger.error('MongoDB connection error:', err));

import authRoutes from './routes/auth.js';
import screenTimeRoutes from './routes/screenTime.js';
import moodRoutes from './routes/mood.js';
import recommendationsRoutes from './routes/recommendations.js';

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Export logger for use in other files
export { logger };

const app = express();

app.use(cors());
app.use(express.json());

app.get('/test', (req, res) => {
  logger.info('Received GET request at /test');
  res.status(200).json({ message: 'Server is running' });
});

// Simplify the PATCH route for testing
app.patch('/test-patch', (req, res) => {
  res.status(200).json({ message: 'PATCH request received' });
});

app.use('/auth', authRoutes);
app.use('/screen-time', screenTimeRoutes);
app.use('/mood', moodRoutes);
app.use('/recommendations', recommendationsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});