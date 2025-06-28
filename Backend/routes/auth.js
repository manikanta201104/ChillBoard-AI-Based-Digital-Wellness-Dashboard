import express from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../index.js';
import User from '../models/user.js';
import { config } from '../config/env.js';

const router = express.Router();

// POST /auth/signup
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn('Signup failed: Email already exists', { email });
      return res.status(400).json({ message: 'Email already exists' });
    }

    const user = new User({
      userId: `user_${Date.now()}`,
      username,
      email,
      password,
      spotifyToken: null,
      preferences: {},
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: '1h' });
    logger.info('User signed up successfully', { email });
    res.status(201).json({ token });
  } catch (error) {
    logger.error('Error during signup:', error);
    throw error;
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Login failed: User not found', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn('Login failed: Invalid password', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: '1h' });
    logger.info('User logged in successfully', { email });
    res.status(200).json({ token });
  } catch (error) {
    logger.error('Error during login:', error);
    throw error;
  }
});


/**
 * GET /auth/profile
 * Returns the authenticated user's profile.
 * Requires a valid JWT in the Authorization header.
 */
router.get('/profile', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Unauthorized access: No or invalid token');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      logger.warn('Invalid token', { error: err.message });
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await User.findById(decoded.userId).select('username email');
    if (!user) {
      logger.warn('User not found', { userId: decoded.userId });
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('Profile fetched successfully', { userId: decoded.userId });
    res.status(200).json({ username: user.username, email: user.email });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// GET /user - New endpoint to fetch user data including spotifyToken
router.get('/user', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Unauthorized access: No or invalid token');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.userId).select('spotifyToken preferences'); // Only return relevant fields

    if (!user) {
      logger.warn('User not found', { userId: decoded.userId });
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('User data fetched successfully', { userId: decoded.userId });
    res.status(200).json(user);
  } catch (error) {
    logger.error('Error fetching user data:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    throw error;
  }
});


export default router;