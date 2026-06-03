// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function for API calls
export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API Error');
  }

  return response.json();
};

// Auth Service
export const authService = {
  signup: (name, email, password) =>
    apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role: 'student' }),
    }),

  login: (email, password) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getProfile: () => apiCall('/auth/me'),

  updateProfile: (name, profilePic) =>
    apiCall('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify({ name, profilePic }),
    }),

  logout: () => localStorage.removeItem('token'),
};

// Attempt Service
export const attemptService = {
  createAttempt: (attemptData) =>
    apiCall('/attempts/create', {
      method: 'POST',
      body: JSON.stringify(attemptData),
    }),

  getUserAttempts: (userId, limit = 10, page = 1, type = null) => {
    let url = `/attempts/user/${userId}?limit=${limit}&page=${page}`;
    if (type) url += `&type=${type}`;
    return apiCall(url);
  },

  getAttemptById: (attemptId) => apiCall(`/attempts/${attemptId}`),

  getUserStats: (userId) => apiCall(`/attempts/stats/${userId}`),

  deleteAttempt: (attemptId) =>
    apiCall(`/attempts/${attemptId}`, { method: 'DELETE' }),
};
