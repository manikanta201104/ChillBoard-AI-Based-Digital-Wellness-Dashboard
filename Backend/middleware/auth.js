import jwt from 'jsonwebtoken';
import  logger  from '../logger.js';
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
    req.user = decoded; // Should contain userId or other info
    next();
  } catch (error) {
    logger.warn('Invalid token', { error: error.message });
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
