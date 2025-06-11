import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear the invalid token
      localStorage.removeItem('jwt');
      // Redirect to login page
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const signup = async (userData) => {
  const response = await api.post('/auth/signup', userData);
  return response.data;
};

export const login = async (userData) => {
  const response = await api.post('/auth/login', userData);
  // Store the new token, overwriting any old token
  if (response.data.token) {
    localStorage.setItem('jwt', response.data.token);
  }
  return response.data;
};

export const getScreenTime = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');
  const response = await api.get('/screen-time', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const sendMood = async (moodData) => {
  const token = localStorage.getItem('jwt');
  if (!token) throw new Error('No token found');

  const response = await api.post('/mood', moodData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};