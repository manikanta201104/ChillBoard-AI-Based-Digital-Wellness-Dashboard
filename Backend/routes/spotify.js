import express from 'express';
import SpotifyWebApi from 'spotify-web-api-node';
import { logger } from '../index.js';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/user.js';

const router = express.Router();

// Spotify API setup
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// Scopes for Spotify permissions
const scopes = ['user-read-private', 'playlist-read-private'];

// GET /spotify/login
router.get('/login', authMiddleware, (req, res) => {
  const userId = req.user.userId; // This is the _id from the JWT
  const state = Buffer.from(userId).toString('base64'); // Encode _id as state
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  res.status(200).json({ authorizeURL });
});

// GET /spotify/callback
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  // Handle errors or user denial
  if (error) {
    logger.error('Spotify authorization error', { error });
    return res.status(400).json({ message: 'Spotify authorization failed', error });
  }

  // Decode state to get _id
  const userId = Buffer.from(state, 'base64').toString();

  try {
    // Verify user exists by _id
    const user = await User.findById(userId); // Use findById for _id lookup
    if (!user) {
      logger.error('User not found during Spotify callback', { userId });
      return res.status(404).json({ message: 'User not found' });
    }

    // Exchange authorization code for access token
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    // Update user with Spotify tokens
    await User.findByIdAndUpdate(
      userId,
      {
        spotifyToken: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
          obtainedAt: new Date()
        }
      },
      { new: true }
    );

    logger.info('Spotify tokens saved for user', { userId });
    res.redirect('http://localhost:3000/dashboard');
  } catch (err) {
    logger.error('Error in Spotify callback', { error: err.message });
    if (err.body && err.body.error === 'invalid_grant') {
      return res.status(400).json({ message: 'Invalid authorization code', error: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;