import axios from 'axios';

const api = axios.create({
  baseURL: 'https://chillboard-6uoj.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const signup = async userData => {
  const response = await api.post('/auth/signup', userData);
  return response.data;
};

export const login = async userData => {
  const response = await api.post('/auth/login', userData);
  return response.data;
};

// Forgot Password APIs (no auth required)
export const forgotPasswordRequest = async (email) => {
  const response = await api.post('/auth/forgot-password/request', { email });
  return response.data; // expects { message }
};

export const forgotPasswordVerify = async (email, code) => {
  const response = await api.post('/auth/forgot-password/verify', { email, code });
  return response.data; // expects { message }
};

export const forgotPasswordReset = async (email, code, newPassword) => {
  const response = await api.post('/auth/forgot-password/reset', { email, code, newPassword });
  return response.data; // expects { message }
};

export const getScreenTime = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.get('/screen-time', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const saveMood = async moodData => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.post('/mood', moodData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getRecommendations = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.get('/recommendations', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const recommendations = response.data;
  if (!recommendations.length || (Date.now() - new Date(recommendations[0].timestamp).getTime() > 5 * 60 * 1000)) {
    await api.post('/recommendations', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedResponse = await api.get('/recommendations', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return updatedResponse.data;
  }
  return recommendations;
};

export const updateRecommendation = async (recommendationId, accepted) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.patch(`/recommendations/${recommendationId}`, { accepted }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const initiateSpotifyLogin = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.get('/spotify/login', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.authorizeURL;
};

export const getUser = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.get('/auth/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const savePlaylist = async (playlistId, data, authToken) => {
  if (!authToken) throw new Error('No auth token provided');
  const response = await api.patch(`/spotify/playlist/${playlistId}`, data, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return response.data;
};

export const fetchNewPlaylist = async (mood, skip = false) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.get(`spotify/playlist?mood=${mood}${skip ? '&skip=true' : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const startPlayback = async (deviceId, playlistId, offset = 0) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.post('/spotify/play', { device_id: deviceId, playlist_id: playlistId, offset }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getLatestMood = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.get('/mood/latest', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getChallenges = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.get('/challenges', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const joinChallenge = async challengeId => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.post('/challenges/join', { challengeId }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getLeaderboard = async challengeId => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.get('/challenges/leaderboard', {
    params: { challengeId },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const unlinkSpotify = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.delete('/spotify/unlink', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getUserPlaylists = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.get('/spotify/playlists', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const saveSettings = async (settingsData) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.post('/auth/settings', settingsData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getUserSettings = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.get('/auth/user/settings', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const patchUserSettings = async (settingsData) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.patch('/auth/user/settings', settingsData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Admin: list challenges with pagination
export const adminListChallenges = async (page = 1, limit = 10) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const res = await api.get('/admin/challenges', { params: { page, limit }, headers: { Authorization: `Bearer ${token}` } });
  // Back-compat: unwrap paginated data if present
  return res.data?.data ?? res.data;
};

export const adminCreateChallenge = async (payload) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const res = await api.post('/admin/challenges', payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export const adminUpdateChallenge = async (challengeId, payload) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const res = await api.patch(`/admin/challenges/${challengeId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export const adminDeleteChallenge = async (challengeId) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const res = await api.delete(`/admin/challenges/${challengeId}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

// Admin: list contacts with pagination
export const adminListContacts = async (page = 1, limit = 10) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const res = await api.get('/admin/contacts', { params: { page, limit }, headers: { Authorization: `Bearer ${token}` } });
  // Back-compat: unwrap paginated data if present
  return res.data?.data ?? res.data;
};

export const adminResolveContact = async (id, resolved) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const res = await api.patch(`/admin/contacts/${id}`, { resolved }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

// Admin: list users with pagination
export const adminListUsers = async (page = 1, limit = 10) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const res = await api.get('/admin/users', { params: { page, limit }, headers: { Authorization: `Bearer ${token}` } });
  // Back-compat: unwrap paginated data if present
  return res.data?.data ?? res.data;
};

export const adminUpdateUser = async (userId, payload) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const res = await api.patch(`/admin/users/${userId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

// NEW: Admin - delete a user
export const adminDeleteUser = async (userId) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const res = await api.delete(`/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

// Reviews APIs
// Public: get approved reviews for landing page
export const getApprovedReviews = async () => {
  const res = await api.get('/reviews');
  return res.data;
};

// Authenticated: submit a review (goes to pending)
export const submitReview = async ({ rating = 5, text, name, email }) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const res = await api.post('/api/reviews', { rating, text, name, email }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

// Admin: list reviews by status (default pending)
// Admin: list reviews with pagination
export const adminListReviews = async (status = 'pending', page = 1, limit = 10) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const res = await api.get(`/admin/reviews`, { params: { status, page, limit }, headers: { Authorization: `Bearer ${token}` } });
  // Back-compat: unwrap paginated data if present
  return res.data?.data ?? res.data;
};

// Admin: approve review
export const adminApproveReview = async (id) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const res = await api.patch(`/admin/reviews/${id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export const sendContactMessage = async (contactData) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.post('/contact', contactData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getScreenTimeTrends = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.get('/screen-time/trends', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getMoodTrends = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.get('/mood/trends', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};