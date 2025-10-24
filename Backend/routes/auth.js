import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { logger } from '../index.js';
import User from '../models/user.js';
import { config } from '../config/env.js';
import { authMiddleware } from '../middleware/auth.js';
import Playlist from '../models/playlist.js';

const router = express.Router();

// POST /auth/signup
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // Prevent any signup attempt using the fixed admin email
    if (email === 'manikanta02244021@gmail.com') {
      logger.warn('Signup blocked for admin email');
      return res.status(403).json({ message: 'Registration not allowed for this email' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn('Signup failed: Email already exists', { email });
      return res.status(400).json({ message: 'Email already exists' });
    }

    const userId = `user_${Date.now()}`;
    const accessToken = jwt.sign({ userId }, config.jwtSecret, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });

    const user = new User({
      userId,
      username,
      email,
      password,
      spotifyToken: {
        accessToken,
        refreshToken,
        expiresIn: 86400, // 24 hours in seconds
        obtainedAt: new Date(),
      },
      preferences: {},
    });

    await user.save();

    logger.info('User signed up successfully', { email });
    res.status(201).json({ token: accessToken, refreshToken, userId });
  } catch (error) {
    logger.error('Error during signup:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Admin restriction: only a single fixed admin email/password combination is allowed.
    // The password is compared securely via bcrypt. Provide the hash via ENV; fallback to hardcoded for initial setup.
    const ADMIN_EMAIL = 'manikanta02244021@gmail.com';
    const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH; // set this in ENV for secure deployments

    if (email === ADMIN_EMAIL) {
      // Secure path: when ADMIN_PASSWORD_HASH is set, verify via bcrypt
      // Dev/initial path: if no hash is configured, allow exact plaintext match
      let ok = false;
      if (ADMIN_HASH) {
        ok = await bcrypt.compare(password, ADMIN_HASH);
      } else {
        ok = password === 'Manikanta20@#';
      }
      if (!ok) {
        logger.warn('Admin login failed: invalid password', { email });
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      // Ensure an admin user exists/upsert in DB, so downstream queries work.
      let adminUser = await User.findOne({ email });
      if (!adminUser) {
        adminUser = new User({
          userId: `admin_${Date.now()}`,
          username: 'Admin',
          email,
          password: await bcrypt.hash(password, 10),
          role: 'admin',
          active: true,
          preferences: {},
        });
      } else {
        adminUser.role = 'admin';
        adminUser.active = true;
      }
      const accessToken = jwt.sign({ userId: adminUser.userId, role: 'admin' }, config.jwtSecret, { expiresIn: '24h' });
      const refreshToken = jwt.sign({ userId: adminUser.userId, role: 'admin' }, config.jwtSecret, { expiresIn: '7d' });
      adminUser.spotifyToken = {
        accessToken,
        refreshToken,
        expiresIn: 86400,
        obtainedAt: new Date(),
      };
      await adminUser.save();
      logger.info('Admin logged in successfully', { email, userId: adminUser.userId });
      return res.status(200).json({ token: accessToken, refreshToken, userId: adminUser.userId, role: 'admin' });
    }

    // Normal user login flow, role defaults to 'user'
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
    const accessToken = jwt.sign({ userId: user.userId, role: 'user' }, config.jwtSecret, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ userId: user.userId, role: 'user' }, config.jwtSecret, { expiresIn: '7d' });
    user.spotifyToken = {
      accessToken,
      refreshToken,
      expiresIn: 86400, // 24 hours in seconds
      obtainedAt: new Date(),
    };
    await user.save();
    logger.info('User logged in successfully', { email, userId: user.userId });
    return res.status(200).json({ token: accessToken, refreshToken, userId: user.userId, role: 'user', clearChallengeData: true });
  } catch (error) {
    logger.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /auth/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('username email spotifyToken preferences role active');

    if (!user) {
      logger.warn('User not found', { userId: req.user.userId });
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('Profile fetched successfully', { userId: req.user.userId });
    res.status(200).json({ 
      username: user.username, 
      email: user.email, 
      spotifyToken: user.spotifyToken, 
      preferences: user.preferences,
      role: user.role,
      active: user.active
    });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /user
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('spotifyToken preferences');
    if (!user) {
      logger.warn('User not found', { userId: req.user.userId });
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('User data fetched successfully', { userId: req.user.userId });
    res.status(200).json(user);
  } catch (error) {
    logger.error('Error fetching user data:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /auth/playlists
router.get('/playlists', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlists = await Playlist.find({ userId, saved: true }).select('name mood spotifyPlaylistId');
    logger.info('Playlists fetched successfully', { userId });
    res.status(200).json(playlists);
  } catch (error) {
    logger.error('Error fetching playlists:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /settings
router.post('/settings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { webcamEnabled, notifyEvery, showOnLeaderboard } = req.body;

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.preferences = { webcamEnabled, notifyEvery, showOnLeaderboard };
    await user.save();

    logger.info('Settings saved successfully', { userId });
    res.status(200).json({ message: 'Settings saved successfully' });
  } catch (error) {
    logger.error('Error saving settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /user/settings - fetch only preferences
router.get('/user/settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('preferences');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user.preferences || {});
  } catch (error) {
    logger.error('Error fetching user settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /user/settings - update preferences
router.patch('/user/settings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { webcamEnabled, notifyEvery, showOnLeaderboard } = req.body;
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.preferences = { ...(user.preferences || {}), webcamEnabled, notifyEvery, showOnLeaderboard };
    await user.save();
    res.status(200).json({ message: 'Settings updated', preferences: user.preferences });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;