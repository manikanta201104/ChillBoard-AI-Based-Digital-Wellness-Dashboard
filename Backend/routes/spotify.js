import express from 'express';
import SpotifyWebApi from 'spotify-web-api-node';
import { logger } from '../index.js';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/user.js';
import Playlist from '../models/playlist.js';

const router = express.Router();

// Scopes
const scopes = [
  'user-read-private',
  'streaming',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
];

// Mood → category mapping
const moodCategoryMap = {
  stressed: 'chill',
  tired: 'relax',
  happy: 'party',
  sad: 'chill',
  angry: 'rock',
  calm: 'chill',
  neutral: 'chill',
  default: 'chill',
};

// Create a Spotify client for each request
const createSpotifyClient = (accessToken, refreshToken) => {
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
  });
  if (accessToken) spotifyApi.setAccessToken(accessToken);
  if (refreshToken) spotifyApi.setRefreshToken(refreshToken);
  return spotifyApi;
};

// Refresh token
const refreshAccessToken = async (userId, refreshToken) => {
  const spotifyApi = createSpotifyClient(null, refreshToken);
  try {
    const data = await spotifyApi.refreshAccessToken();
    const { access_token, expires_in } = data.body;

    if (!access_token) throw new Error('Failed to refresh token');

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

    logger.info('Token refreshed successfully', { userId, accessToken: access_token.substring(0, 10) + '...' });
    return access_token;
  } catch (err) {
    logger.error('Error refreshing token', { userId, error: err.message, stack: err.stack });
    if (err.body?.error === 'invalid_grant') {
      await User.findOneAndUpdate({ userId }, { $unset: { spotifyToken: 1 } });
      throw new Error('Refresh token invalid. Please re-authenticate.');
    }
    throw err;
  }
};

// --- Routes ---

// Login
router.get('/login', authMiddleware, (req, res) => {
  const userId = req.user.userId;
  const state = Buffer.from(userId).toString('base64');
  const spotifyApi = createSpotifyClient();
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  res.status(200).json({ authorizeURL });
});

// Callback
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.status(400).json({ error });

  const userId = Buffer.from(state, 'base64').toString();
  const spotifyApi = createSpotifyClient();

  try {
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

    logger.info('Tokens saved', { userId });
    res.redirect('https://chillboard.vercel.app/dashboard');
  } catch (err) {
    logger.error('Callback error', { err });
    res.status(500).json({ error: 'Spotify callback failed' });
  }
});

// Get playlists (cached)
router.get('/playlists', authMiddleware, async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.user.userId });
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get playlist by mood
router.get('/playlist', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const mood = req.query.mood || 'default';
  const skip = req.query.skip === 'true';

  try {
    const user = await User.findOne({ userId });
    if (!user?.spotifyToken?.accessToken) {
      return res.status(401).json({ message: 'No token, please login again' });
    }

    let { accessToken, refreshToken, expiresIn, obtainedAt } = user.spotifyToken;
    const now = Date.now();
    const expiry = new Date(obtainedAt).getTime() + expiresIn * 1000;

    if (now >= expiry - 300000) {
      accessToken = await refreshAccessToken(userId, refreshToken);
    }

    const spotifyApi = createSpotifyClient(accessToken, refreshToken);
    const category = moodCategoryMap[mood.toLowerCase()] || moodCategoryMap.default;

    // Browse category playlists instead of wrong search query
    const playlists = await spotifyApi.getPlaylistsForCategory(category, { country: 'US', limit: 10 });

    let availablePlaylists = playlists.body.playlists.items;
    if (!availablePlaylists.length) {
      return res.status(404).json({ message: 'No playlists found' });
    }

    const playlist = availablePlaylists[Math.floor(Math.random() * availablePlaylists.length)];

    await Playlist.updateOne(
      { spotifyPlaylistId: playlist.id, userId },
      {
        userId,
        spotifyPlaylistId: playlist.id,
        name: playlist.name,
        mood: category,
        saved: false,
        createdAt: new Date(),
      },
      { upsert: true }
    );

    res.json({ spotifyPlaylistId: playlist.id, name: playlist.name, mood });
  } catch (err) {
    logger.error('Error fetching playlist', { err });
    res.status(500).json({ error: err.message });
  }
});

// Play playlist
router.post('/play', authMiddleware, async (req, res) => {
  const { device_id, playlist_id, offset } = req.body;
  const userId = req.user.userId;
logger.info('Playback request', { userId, device_id, playlist_id, offset });
  if (!device_id || !playlist_id) {
    return res.status(400).json({ message: 'Missing device_id or playlist_id' });
  }

  try {
    const user = await User.findOne({ userId });
    if (!user?.spotifyToken?.accessToken) {
      return res.status(400).json({ message: 'No Spotify token' });
    }

    let { accessToken, refreshToken, expiresIn, obtainedAt } = user.spotifyToken;
    const now = Date.now();
    const expiry = new Date(obtainedAt).getTime() + expiresIn * 1000;

    if (now >= expiry - 300000) {
      accessToken = await refreshAccessToken(userId, refreshToken);
    }

    const spotifyApi = createSpotifyClient(accessToken, refreshToken);

    // Validate playlist
    try {
      await spotifyApi.getPlaylist(playlist_id);
    } catch (err) {
      return res.status(404).json({ message: 'Invalid or inaccessible playlist' });
    }

    // Transfer + Play
    await spotifyApi.transferMyPlayback([device_id], { play: true });
    await spotifyApi.play({
      device_id,
      context_uri: `spotify:playlist:${playlist_id}`,
      offset: { position: offset || 0 },
    });

    res.json({ message: 'Playback started' });
  } catch (err) {
    let msg = 'Playback failed';
    if (err.statusCode === 403 && err.body?.error?.reason === 'PREMIUM_REQUIRED') {
      msg = 'Spotify Premium is required';
    } else if (err.statusCode === 403 && err.body?.error?.reason === 'NO_ACTIVE_DEVICE') {
      msg = 'Please open Spotify app and start playback manually';
    } else if (err.statusCode === 404) {
      msg = 'Device or playlist not found';
    }
    res.status(err.statusCode || 500).json({ message: msg, error: err.body || err.message });
  }
});

// Update playlist saved state
router.patch('/playlist/:id', authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findOneAndUpdate(
      { spotifyPlaylistId: req.params.id, userId: req.user.userId },
      { saved: req.body.saved },
      { new: true }
    );
    if (!playlist) return res.status(404).json({ message: 'Not found' });
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unlink
router.delete('/unlink', authMiddleware, async (req, res) => {
  try {
    await User.findOneAndUpdate({ userId: req.user.userId }, { $unset: { spotifyToken: 1 } });
    await Playlist.deleteMany({ userId: req.user.userId, saved: true });
    res.json({ message: 'Spotify account unlinked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
