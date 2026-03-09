import axios from "axios";

const api = axios.create({
  baseURL: "https://chillboard-6uoj.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("jwt");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            {
              refreshToken,
            },
          );

          const { token: newToken, refreshToken: newRefreshToken } =
            response.data;
          localStorage.setItem("jwt", newToken);
          if (newRefreshToken) {
            localStorage.setItem("refreshToken", newRefreshToken);
          }

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem("jwt");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userId");
          localStorage.removeItem("role");
          window.location.href = "/";
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem("jwt");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("role");
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  },
);

export const signup = async (userData) => {
  const response = await api.post("/auth/signup", userData);
  return response.data;
};

export const login = async (userData) => {
  const response = await api.post("/auth/login", userData);
  return response.data;
};

// Forgot Password APIs (no auth required)
export const forgotPasswordRequest = async (email) => {
  const response = await api.post("/auth/forgot-password/request", { email });
  return response.data; // expects { message }
};

export const forgotPasswordVerify = async (email, code) => {
  const response = await api.post("/auth/forgot-password/verify", {
    email,
    code,
  });
  return response.data; // expects { message }
};

export const forgotPasswordReset = async (email, code, newPassword) => {
  const response = await api.post("/auth/forgot-password/reset", {
    email,
    code,
    newPassword,
  });
  return response.data; // expects { message }
};

export const getScreenTime = async () => {
  const response = await api.get("/screen-time");
  return response.data;
};

export const saveMood = async (moodData) => {
  const response = await api.post("/mood", moodData);
  return response.data;
};

export const getRecommendations = async () => {
  const response = await api.get("/recommendations");
  const recommendations = response.data;
  if (
    !recommendations.length ||
    Date.now() - new Date(recommendations[0].timestamp).getTime() >
      5 * 60 * 1000
  ) {
    await api.post("/recommendations", {});
    const updatedResponse = await api.get("/recommendations");
    return updatedResponse.data;
  }
  return recommendations;
};

export const updateRecommendation = async (recommendationId, accepted) => {
  const response = await api.patch(`/recommendations/${recommendationId}`, {
    accepted,
  });
  return response.data;
};

export const initiateSpotifyLogin = async () => {
  const response = await api.get("/spotify/login");
  return response.data.authorizeURL;
};

export const getUser = async () => {
  const response = await api.get("/auth/profile");
  return response.data;
};

export const savePlaylist = async (playlistId, data, authToken) => {
  if (!authToken) throw new Error("No auth token provided");
  const response = await api.patch(`/spotify/playlist/${playlistId}`, data, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return response.data;
};

export const fetchNewPlaylist = async (mood, skip = false) => {
  const response = await api.get(
    `spotify/playlist?mood=${mood}${skip ? "&skip=true" : ""}`,
  );
  return response.data;
};

export const startPlayback = async (deviceId, playlistId, offset = 0) => {
  const response = await api.post("/spotify/play", {
    device_id: deviceId,
    playlist_id: playlistId,
    offset,
  });
  return response.data;
};

export const getLatestMood = async () => {
  const response = await api.get("/mood/latest");
  return response.data;
};

export const getChallenges = async () => {
  const response = await api.get("/challenges");
  return response.data;
};

export const joinChallenge = async (challengeId) => {
  const response = await api.post("/challenges/join", { challengeId });
  return response.data;
};

export const getLeaderboard = async (challengeId) => {
  const response = await api.get("/challenges/leaderboard", {
    params: { challengeId },
  });
  return response.data;
};

export const unlinkSpotify = async () => {
  const response = await api.delete("/spotify/unlink");
  return response.data;
};

export const getUserPlaylists = async () => {
  const response = await api.get("/spotify/playlists");
  return response.data;
};

// Settings API functions - DISABLED
// All settings functionality has been disabled

// export const saveSettings = async (settingsData) => {
//   const response = await api.post("/auth/settings", settingsData);
//   return response.data;
// };

// export const getUserSettings = async () => {
//   const response = await api.get("/auth/user/settings");
//   return response.data;
// };

// export const patchUserSettings = async (settingsData) => {
//   const response = await api.patch("/auth/user/settings", settingsData);
//   return response.data;
// };

// Admin: list challenges with pagination
export const adminListChallenges = async (page = 1, limit = 10) => {
  const res = await api.get("/admin/challenges", {
    params: { page, limit },
  });
  // Back-compat: unwrap paginated data if present
  return res.data?.data ?? res.data;
};

export const adminCreateChallenge = async (payload) => {
  const res = await api.post("/admin/challenges", payload);
  return res.data;
};

export const adminUpdateChallenge = async (challengeId, payload) => {
  const res = await api.patch(`/admin/challenges/${challengeId}`, payload);
  return res.data;
};

export const adminDeleteChallenge = async (challengeId) => {
  const res = await api.delete(`/admin/challenges/${challengeId}`);
  return res.data;
};

// Admin: list contacts with pagination
export const adminListContacts = async (page = 1, limit = 10) => {
  const res = await api.get("/admin/contacts", {
    params: { page, limit },
  });
  // Back-compat: unwrap paginated data if present
  return res.data?.data ?? res.data;
};

export const adminResolveContact = async (id, resolved) => {
  const res = await api.patch(`/admin/contacts/${id}`, { resolved });
  return res.data;
};

// Admin: list users with pagination
export const adminListUsers = async (page = 1, limit = 10) => {
  const res = await api.get("/admin/users", {
    params: { page, limit },
  });
  // Back-compat: unwrap paginated data if present
  return res.data?.data ?? res.data;
};

export const adminUpdateUser = async (userId, payload) => {
  const res = await api.patch(`/admin/users/${userId}`, payload);
  return res.data;
};

// NEW: Admin - delete a user
export const adminDeleteUser = async (userId) => {
  const res = await api.delete(`/admin/users/${userId}`);
  return res.data;
};

// Reviews APIs
// Public: get approved reviews for landing page
export const getApprovedReviews = async () => {
  const res = await api.get("/reviews");
  return res.data;
};

// Authenticated: submit a review (goes to pending)
export const submitReview = async ({ rating = 5, text, name, email }) => {
  const token = localStorage.getItem("jwt");
  if (!token) throw new Error("No token found");
  const res = await api.post(
    "/api/reviews",
    { rating, text, name, email },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
};

// Admin: list reviews by status (default pending)
// Admin: list reviews with pagination
export const adminListReviews = async (
  status = "pending",
  page = 1,
  limit = 10,
) => {
  const token = localStorage.getItem("jwt");
  if (!token) throw new Error("No token found");
  const res = await api.get(`/admin/reviews`, {
    params: { status, page, limit },
    headers: { Authorization: `Bearer ${token}` },
  });
  // Back-compat: unwrap paginated data if present
  return res.data?.data ?? res.data;
};

// Admin: approve review
export const adminApproveReview = async (id) => {
  const token = localStorage.getItem("jwt");
  if (!token) throw new Error("No token found");
  const res = await api.patch(
    `/admin/reviews/${id}/approve`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
};

export const sendContactMessage = async (contactData) => {
  const token = localStorage.getItem("jwt");
  if (!token) throw new Error("No token found");
  const response = await api.post("/contact", contactData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getScreenTimeTrends = async () => {
  const token = localStorage.getItem("jwt");
  if (!token) throw new Error("No token found");
  const response = await api.get("/screen-time/trends", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getMoodTrends = async () => {
  const token = localStorage.getItem("jwt");
  if (!token) throw new Error("No token found");
  const response = await api.get("/mood/trends", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
