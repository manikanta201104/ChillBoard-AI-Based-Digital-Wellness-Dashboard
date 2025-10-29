import express from 'express';
import SpotifyWebApi from 'spotify-web-api-node';
import { logger } from '../index.js';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/user.js';
import Playlist from '../models/playlist.js';

const router = express.Router();

// Spotify API setup
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

// Updated scopes including user-read-playback-state
const scopes = [
  'user-read-private',
  'streaming',
  'user-read-email',
  'user-read-playback-state',    // Added for fetching devices and playback state
  'user-modify-playback-state',
];

// Mood/category to Spotify search category mapping
// Extended to support richer recommendation categories
const moodCategoryMap = {
  stressed: 'calm',
  tired: 'relax',
  happy: 'upbeat',
  sad: 'chill',
  angry: 'energetic',
  calm: 'chill',
  neutral: 'chill',
  // new direct categories used by recommendations
  focus: 'focus',
  relax: 'relax',
  energy: 'energetic',
  sleep: 'sleep',
  workout: 'energetic',
  study: 'focus',
  morning: 'upbeat',
  evening: 'relax',
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

    const updatedUser = await User.findOneAndUpdate(
      { userId },
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
    if (err.body && err.body.error === 'invalid_grant') {
      await User.findOneAndUpdate(
        { userId },
        { $unset: { spotifyToken: 1 } },
        { new: true }
      );
      throw new Error('Refresh token invalid, please re-authenticate with Spotify');
    }
    throw new Error(`Failed to refresh access token: ${errorDetail}`);
  }
};

// GET /spotify/login
router.get('/login', authMiddleware, (req, res) => {
  const userId = req.user.userId;
  const state = Buffer.from(userId).toString('base64');
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
    const user = await User.findOne({ userId });
    if (!user) {
      logger.error('User not found during Spotify callback', { userId });
      return res.status(404).json({ message: 'User not found' });
    }

    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    await User.findOneAndUpdate(
      { userId },
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

    logger.info('Spotify tokens saved for player', { userId });
    res.redirect('https://www.chillboard.in/dashboard');
  } catch (err) {
    logger.error('Error in Spotify callback', { error: err.message, stack: err.stack });
    if (err.body && err.body.error === 'invalid_grant') {
      return res.status(400).json({ message: 'Invalid authorization code', error: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /spotify/playlists
router.get('/playlists', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const playlists = await Playlist.find({ userId });
    logger.info('Fetched user playlists', { userId, playlistCount: playlists.length });
    res.status(200).json(playlists);
  } catch (err) {
    logger.error('Error fetching playlists', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /spotify/playlist
router.get('/playlist', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const mood = req.query.mood || 'default';
  const skip = req.query.skip === 'true';

  try {
    const user = await User.findOne({ userId });
    if (!user || !user.spotifyToken || !user.spotifyToken.accessToken) {
      return res.status(401).json({ message: 'Spotify token not found, please re-authenticate' });
    }

    const { accessToken, refreshToken, expiresIn, obtainedAt } = user.spotifyToken;
    const now = Date.now();
    const tokenExpiry = new Date(obtainedAt).getTime() + expiresIn * 1000;

    let currentAccessToken = accessToken;
    if (now >= tokenExpiry - 300000) {
      logger.info('Token nearing expiry or expired, refreshing', { userId, tokenExpiry });
      try {
        currentAccessToken = await refreshAccessToken(userId, refreshToken);
        if (!currentAccessToken) {
          throw new Error('Failed to refresh access token');
        }
        spotifyApi.setAccessToken(currentAccessToken);
      } catch (refreshErr) {
        if (refreshErr.message.includes('re-authenticate')) {
          return res.status(401).json({ message: 'Invalid refresh token, please re-authenticate with Spotify', redirect: '/spotify/login' });
        }
        throw refreshErr;
      }
    } else {
      logger.info('Token still valid', { userId, tokenExpiry });
      spotifyApi.setAccessToken(currentAccessToken);
    }

    let cachedPlaylist = null;
    if (!skip) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      cachedPlaylist = await Playlist.findOne({
        userId,
        mood: moodCategoryMap[mood.toLowerCase()] || moodCategoryMap.default,
        createdAt: { $gte: twentyFourHoursAgo },
        saved: { $ne: true }
      }).sort({ createdAt: -1 });

      if (cachedPlaylist) {
        logger.info('Returning cached playlist', { userId, playlistId: cachedPlaylist.spotifyPlaylistId });
        return res.status(200).json({ spotifyPlaylistId: cachedPlaylist.spotifyPlaylistId, name: cachedPlaylist.name, mood });
      }
    }

    if (skip || !cachedPlaylist) {
      const category = moodCategoryMap[mood.toLowerCase()] || moodCategoryMap.default;

      let playlists;
      try {
        playlists = await spotifyApi.searchPlaylists(`category:${category}`, { limit: 10 });
        logger.info('Spotify API response', { items: playlists.body.playlists?.items?.map(p => ({ id: p?.id, name: p?.name })) || [] });
      } catch (searchErr) {
        if (searchErr.statusCode === 401) {
          logger.warn('Token invalid, retrying with refresh', { userId });
          currentAccessToken = await refreshAccessToken(userId, refreshToken);
          spotifyApi.setAccessToken(currentAccessToken);
          playlists = await spotifyApi.searchPlaylists(`category:${category}`, { limit: 10 });
        } else if (searchErr.statusCode === 500) {
          logger.error('Spotify server error, retrying after delay', { userId });
          await new Promise(resolve => setTimeout(resolve, 5000));
          playlists = await spotifyApi.searchPlaylists(`category:${category}`, { limit: 10 });
        } else {
          throw searchErr;
        }
      }

      if (!playlists || !playlists.body || !playlists.body.playlists || !playlists.body.playlists.items || playlists.body.playlists.items.length === 0) {
        return res.status(404).json({ message: 'No playlists found for this mood' });
      }

      const availablePlaylists = playlists.body.playlists.items.filter(p => p && p.id && (!cachedPlaylist || p.id !== cachedPlaylist?.spotifyPlaylistId));
      if (availablePlaylists.length === 0 && !skip) {
        logger.warn('No new playlists available, forcing new search');
        playlists = await spotifyApi.searchPlaylists(`category:${category} calm`, { limit: 10 });
        availablePlaylists = playlists.body.playlists.items.filter(p => p && p.id && (!cachedPlaylist || p.id !== cachedPlaylist?.spotifyPlaylistId));
      }

      if (availablePlaylists.length === 0) {
        return res.status(404).json({ message: 'No valid playlists available' });
      }

      const playlist = availablePlaylists[Math.floor(Math.random() * availablePlaylists.length)];
      const response = { spotifyPlaylistId: playlist.id, name: playlist.name, mood: mood.toLowerCase() };

      const existingPlaylist = await Playlist.findOne({ spotifyPlaylistId: playlist.id });
      if (!existingPlaylist) {
        const newPlaylist = new Playlist({
          userId,
          spotifyPlaylistId: playlist.id,
          name: playlist.name,
          mood: category,
          saved: false,
        });
        await newPlaylist.save();
        logger.info('New playlist saved', { userId, playlistId: playlist.id });
      } else if (skip) {
        await Playlist.findOneAndUpdate(
          { spotifyPlaylistId: playlist.id },
          { createdAt: new Date(), saved: false },
          { new: true }
        );
      }

      res.status(200).json(response);
    }
  } catch (err) {
    logger.error('Error fetching playlist', { error: err.message, stack: err.stack, statusCode: err.statusCode });
    if (err.message.includes('re-authenticate')) {
      return res.status(401).json({ message: 'Invalid refresh token, please re-authenticate with Spotify', redirect: '/spotify/login' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /spotify/play
router.post('/play', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const { device_id, playlist_id, offset } = req.body;

  if (!device_id || !playlist_id) {
    return res.status(400).json({ message: 'Missing device_id or playlist_id' });
  }

  try {
    const user = await User.findOne({ userId });
    if (!user || !user.spotifyToken || !user.spotifyToken.accessToken) {
      return res.status(400).json({ message: 'Spotify token not found' });
    }

    const { accessToken, refreshToken, expiresIn, obtainedAt } = user.spotifyToken;
    const now = Date.now();
    const tokenExpiry = new Date(obtainedAt).getTime() + expiresIn * 1000;

    let currentAccessToken = accessToken;
    if (now >= tokenExpiry - 300000) {
      logger.info('Token nearing expiry or expired, refreshing', { userId, tokenExpiry });
      currentAccessToken = await refreshAccessToken(userId, refreshToken);
      spotifyApi.setAccessToken(currentAccessToken);
    } else {
      spotifyApi.setAccessToken(currentAccessToken);
    }

    // Validate playlist exists and is accessible
    try {
      await spotifyApi.getPlaylist(playlist_id);
    } catch (playlistErr) {
      logger.error('Invalid playlist', { playlist_id, error: playlistErr.message });
      return res.status(404).json({ message: 'Invalid or inaccessible playlist' });
    }

    // Transfer playback to device
    try {
      await spotifyApi.transferMyPlayback([device_id]);
      logger.info('Playback transferred to device', { userId, device_id });
    } catch (transferErr) {
      if (transferErr.statusCode === 403 || transferErr.statusCode === 404) {
        logger.warn('Transfer failed', { userId, device_id, reason: transferErr.body?.error?.reason || 'UNKNOWN' });
        return res.status(transferErr.statusCode).json({
          message: 'Failed to transfer playback. Ensure device is active and open Spotify.',
          error: transferErr.body || { reason: 'UNKNOWN' },
        });
      }
      throw transferErr;
    }

    // Start playback
    await spotifyApi.play({
      device_id,
      context_uri: `spotify:playlist:${playlist_id}`,
      offset: { position: offset || 0 },
    });

    logger.info('Playback started successfully', { userId, device_id, playlist_id, offset });
    res.status(200).json({ message: 'Playback started' });
  } catch (err) {
    logger.error('Error starting playback', {
      error: err.body ? `${err.message} - ${JSON.stringify(err.body)}` : err.message,
      stack: err.stack,
      statusCode: err.statusCode,
    });
    if (err.statusCode === 401) {
      return res.status(401).json({ message: 'Permissions missing or token invalid. Re-authenticate.' });
    } else if (err.statusCode === 403) {
      return res.status(403).json({
        message: 'Playback failed: Restriction violated',
        error: err.body || { reason: 'UNKNOWN' },
      });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /spotify/playlist/:id
router.patch('/playlist/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { saved } = req.body;

  try {
    const playlist = await Playlist.findOne({ spotifyPlaylistId: id, userId: req.user.userId });
    if (!playlist) {
      logger.warn('Playlist not found for update', { spotifyPlaylistId: id, userId: req.user.userId });
      return res.status(404).json({ message: 'Playlist not found' });
    }
    if (playlist.saved && saved === true) {
      logger.info('Playlist already saved', { spotifyPlaylistId: id, userId: req.user.userId });
      return res.status(200).json({ message: 'Playlist already saved', playlist });
    }
    const updatedPlaylist = await Playlist.findOneAndUpdate(
      { spotifyPlaylistId: id, userId: req.user.userId },
      { saved: saved === true },
      { new: true, runValidators: true }
    );
    logger.info('Playlist updated', { spotifyPlaylistId: id, saved: updatedPlaylist.saved });
    res.status(200).json(updatedPlaylist);
  } catch (err) {
    logger.error('Error updating playlist', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /spotify/unlink
router.delete('/unlink', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findOne({ userId });
    if (!user) return res.status(400).json({ message: 'User not found' });

    user.spotifyToken = null;
    await user.save();

    await Playlist.deleteMany({ userId, saved: true });

    logger.info('Spotify account unlinked successfully', { userId });
    res.status(200).json({ message: 'Spotify account unlinked successfully' });
  } catch (error) {
    logger.error('Error unlinking Spotify account', { error: error.message, stack: error.stack });
    res.status(500).json({ message: error.message });
  }
});

export default router;