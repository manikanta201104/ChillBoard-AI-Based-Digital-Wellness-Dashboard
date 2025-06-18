import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const signup = async (userData) => {
  const response = await api.post('/auth/signup', userData);
  return response.data;
};

export const login = async (userData) => {
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

export const saveMood = async (moodData) => {
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
  return response.data;
};

export const updateRecommendation = async (recommendationId, accepted) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.patch(`/recommendations/${recommendationId}`, { accepted }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
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