import jwt from 'jsonwebtoken';
import { logger } from '../index.js';
import { config } from '../config/env.js';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Authorization header missing or malformed');
    return res.status(401).json({ message: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    // Include role from token when present to avoid extra DB lookups
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (error) {
    logger.warn('Invalid token', { error: error.message });
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', error: error.message });
    }
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// NEW: verifyAdmin middleware for admin-only APIs
export const verifyAdmin = async (req, res, next) => {
  try {
    // Fast-path: trust JWT role when it's 'admin'
    if (req.user?.role === 'admin') return next();

    // Fallback to DB check if token lacks role field
    const { default: User } = await import('../models/user.js');
    const user = await User.findOne({ userId: req.user.userId }).select('role active');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.active) return res.status(403).json({ message: 'User account is deactivated' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
  } catch (error) {
    logger.error('verifyAdmin error', { error: error.message });
    return res.status(500).json({ message: 'Internal server error' });
  }
};