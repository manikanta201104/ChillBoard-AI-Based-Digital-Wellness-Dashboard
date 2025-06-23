import express from 'express';
import SpotifyWebApi from 'spotify-web-api-node';
import { logger } from '../index.js';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/user.js';
import Playlist from '../models/playlist.js'; // New: Import Playlist model

const router = express.Router();

// Spotify API setup
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// Scopes for Spotify permissions (updated to include streaming)
const scopes = [
  'user-read-private',
  'streaming', 
  'user-read-email' // Optional but recommended for SDK
];

// Mood to Spotify category mapping
const moodCategoryMap = {
  stressed: 'calm',
  tired: 'relax',
  happy: 'upbeat',
  sad: 'chill',
  angry: 'energetic',
  calm: 'chill',
  neutral: 'chill',
  default: 'chill',
};

// Function to refresh access token
const refreshAccessToken = async (userId, refreshToken) => {
  const spotifyApiRefresh = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    refreshToken,
  });

  try {
    const data = await spotifyApiRefresh.refreshAccessToken();
    const { access_token, expires_in } = data.body;

    if (!access_token || !expires_in) {
      throw new Error('Invalid response from Spotify token refresh');
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        spotifyToken: {
          accessToken: access_token,
          refreshToken,
          expiresIn: expires_in,
          obtainedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error('User not found during token update');
    }

    logger.info('Access token refreshed successfully', { userId, expiresIn: expires_in });
    return access_token;
  } catch (err) {
    const errorDetail = err.body ? `${err.message} - ${JSON.stringify(err.body)}` : err.message;
    logger.error('Error refreshing access token', {
      error: errorDetail,
      stack: err.stack,
      statusCode: err.statusCode,
    });
    throw new Error(`Failed to refresh access token: ${errorDetail}`);
  }
};

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

  if (error) {
    logger.error('Spotify authorization error', { error });
    return res.status(400).json({ message: 'Spotify authorization failed', error });
  }

  const userId = Buffer.from(state, 'base64').toString();

  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.error('User not found during Spotify callback', { userId });
      return res.status(404).json({ message: 'User not found' });
    }

    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    await User.findByIdAndUpdate(
      userId,
      {
        spotifyToken: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
          obtainedAt: new Date(),
        },
      },
      { new: true }
    );

    logger.info('Spotify tokens saved for user', { userId });
    res.redirect('http://localhost:3000/dashboard');
  } catch (err) {
    logger.error('Error in Spotify callback', { error: err.message, stack: err.stack });
    if (err.body && err.body.error === 'invalid_grant') {
      return res.status(400).json({ message: 'Invalid authorization code', error: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/playlist', authMiddleware, async (req, res) => {
  const userId = req.user.userId; // This is the _id from the JWT
  const mood = req.query.mood || 'default';

  try {
    const user = await User.findById(userId);
    if (!user || !user.spotifyToken || !user.spotifyToken.accessToken) {
      return res.status(400).json({ message: 'Spotify token not found' });
    }

    const { accessToken, refreshToken, expiresIn, obtainedAt } = user.spotifyToken;

    // Check if token is expired
    const now = Date.now();
    const tokenExpiry = new Date(obtainedAt).getTime() + (expiresIn * 1000);
    let currentAccessToken = accessToken;

    logger.info('Token status', { userId, now, tokenExpiry, isExpired: now >= tokenExpiry });

    if (now >= tokenExpiry) {
      logger.info('Token expired, attempting refresh', { userId, tokenExpiry });
      currentAccessToken = await refreshAccessToken(userId, refreshToken);
      if (!currentAccessToken) {
        return res.status(500).json({ message: 'Failed to refresh access token' });
      }
      logger.info('Token refreshed, new token set', { userId });
    } else {
      logger.info('Token still valid', { userId, tokenExpiry });
    }

    spotifyApi.setAccessToken(currentAccessToken);
    logger.info('Token set for API call', { userId, token: currentAccessToken.substring(0, 10) + '...' });

    const category = moodCategoryMap[mood.toLowerCase()] || moodCategoryMap.default;

    logger.info('Searching playlists for category', { category });
    let playlists;
    try {
      playlists = await spotifyApi.searchPlaylists(category, { limit: 1 });
      logger.info('Playlists response', { body: playlists.body });
    } catch (searchErr) {
      logger.error('Spotify API error', {
        error: searchErr.message,
        stack: searchErr.stack,
        body: searchErr.body ? JSON.stringify(searchErr.body) : 'No body',
        statusCode: searchErr.statusCode,
        rawResponse: searchErr.response ? searchErr.response.text : 'No response',
      });
      throw searchErr;
    }

    if (!playlists.body.playlists || playlists.body.playlists.items.length === 0) {
      return res.status(404).json({ message: 'No playlists found for this mood' });
    }

    const playlist = playlists.body.playlists.items[0];
    const response = {
      spotifyPlaylistId: playlist.id,
      name: playlist.name,
      mood: mood.toLowerCase(),
    };

    // Save playlist with the mapped category
    const existingPlaylist = await Playlist.findOne({ spotifyPlaylistId: playlist.id });
    if (!existingPlaylist) {
      const newPlaylist = new Playlist({
        userId,
        spotifyPlaylistId: playlist.id,
        name: playlist.name,
        mood: category, // Using mapped category (e.g., 'calm' for 'stressed')
        saved: false
      });
      await newPlaylist.save();
      logger.info('Playlist saved', { userId, playlist: newPlaylist });
    }

    logger.info('Playlist fetched', { userId, playlist: response });
    res.status(200).json(response);
  } catch (err) {
    logger.error('Error fetching playlist', {
      error: err.message,
      stack: err.stack,
      body: err.body ? JSON.stringify(err.body) : 'No body',
      statusCode: err.statusCode,
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;