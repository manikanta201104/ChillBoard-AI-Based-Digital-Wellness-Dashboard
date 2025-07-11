import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
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

export const getScreenTime = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.get('/screen-time', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const saveMood = async moodData => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.post('/mood', moodData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getRecommendations = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.get('/recommendations', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  // Trigger POST if no recent recommendations (e.g., last 5 minutes)
  const recommendations = response.data;
  if (!recommendations.length || (Date.now() - new Date(recommendations[0].timestamp).getTime() > 5 * 60 * 1000)) {
    await api.post('/recommendations', {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const updatedResponse = await api.get('/recommendations', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return updatedResponse.data;
  }
  return recommendations;
};

export const updateRecommendation = async (recommendationId, accepted) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.patch(
    `/recommendations/${recommendationId}`,
    { accepted },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const initiateSpotifyLogin = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.get('/spotify/login', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.authorizeURL;
};

export const getUser = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.get('/auth/profile', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data; // Expecting { username, email, ... }
};

export const savePlaylist = async (playlistId, data) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.patch(`/spotify/playlist/${playlistId}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const fetchNewPlaylist = async (mood, skip = false) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.get(`spotify/playlist?mood=${mood}${skip ? '&skip=true' : ''}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const joinChallenge = async challengeId => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.post(
    '/challenges/join',
    {
      challengeId,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const getLeaderboard = async challengeId => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.get('/challenges/leaderboard', {
    params: { challengeId },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const unlinkSpotify = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.delete('/spotify/unlink', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getUserPlaylists = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.get('/auth/playlists', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const saveSettings = async (settingsData) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.post('/auth/settings', settingsData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const sendContactMessage = async (contactData) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.post('/contact', contactData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};