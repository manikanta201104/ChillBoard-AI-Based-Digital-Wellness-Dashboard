import axios from 'axios';

const api = axios.create ({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const signup = async userData => {
  const response = await api.post ('/auth/signup', userData);
  return response.data;
};

export const login = async userData => {
  const response = await api.post ('/auth/login', userData);
  return response.data;
};

export const getScreenTime = async () => {
  const token = localStorage.getItem ('jwt');
  if (!token) throw new Error ('No token found');

  const response = await api.get ('/screen-time', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const saveMood = async moodData => {
  const token = localStorage.getItem ('jwt');
  if (!token) throw new Error ('No token found');

  const response = await api.post ('/mood', moodData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getRecommendations = async () => {
  const token = localStorage.getItem ('jwt');
  if (!token) throw new Error ('No token found');

  const response = await api.get ('/recommendations', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const updateRecommendation = async (recommendationId, accepted) => {
  const token = localStorage.getItem ('jwt');
  if (!token) throw new Error ('No token found');

  const response = await api.patch (
    `/recommendations/${recommendationId}`,
    {accepted},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const initiateSpotifyLogin = async () => {
  const token = localStorage.getItem ('jwt');
  if (!token) throw new Error ('No token found');

  const response = await api.get ('/spotify/login', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.authorizeURL;
};

export const getUser = async () => {
  const token = localStorage.getItem ('jwt');
  if (!token) throw new Error ('No token found');

  const response = await api.get ('/auth/user', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data; // Expecting { spotifyToken: { accessToken, refreshToken, ... }, ... }
};

export const savePlaylist = async (playlistId, data) => {
  const token = localStorage.getItem ('jwt');
  if (!token) throw new Error ('No token found');
  const response = await api.patch (`/spotify/playlist/${playlistId}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const fetchNewPlaylist = async mood => {
  const token = localStorage.getItem ('jwt');
  if (!token) throw new Error ('No token found');
  const response = await api.get (`spotify/playlist?mood=${mood}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getLatestMood = async () => {
  const token = localStorage.getItem ('jwt');
  if (!token) throw new Error ('No token found');
  const response = await api.get ('/mood/latest', {
    headers: {Authorization: `Bearer ${token}`},
  });
  return response.data;
};

export const getChallenges = async () => {
  const token = localStorage.getItem ('jwt');
  if (!token) throw new Error ('No token found');
  const response = await api.get ('/challenges', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const joinChallenge = async challengeId => {
  const token = localStorage.getItem ('jwt');
  if (!token) throw new Error ('No token found');
  const response = await api.post (
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
  const token = localStorage.getItem ('jwt');
  if (!token) {
    throw new Error ('No token found');
  }
  const response = await api.get ('/challenges/leaderboard', {
    params: {challengeId},
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
