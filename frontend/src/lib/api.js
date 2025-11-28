import axios from 'axios';
import { auth } from './firebase';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Token error:', error);
  }
  return config;
});

export const authApi = {
  getMe: () => api.get('/auth/me'),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export const transactionApi = {
  getAll: () => api.get('/transactions'),
  create: (data) => api.post('/transactions', data),
  delete: (id) => api.delete(`/transactions/${id}`),
};

export const incomeApi = {
  getAll: () => api.get('/income'),
  create: (data) => api.post('/income', data),
  delete: (id) => api.delete(`/income/${id}`),
};

export const subscriptionApi = {
  getAll: () => api.get('/subscriptions'),
  create: (data) => api.post('/subscriptions', data),
  delete: (id) => api.delete(`/subscriptions/${id}`),
};

export const aiApi = {
  chat: (message, conversationId) => api.post('/ai/chat', { message, conversation_id: conversationId }),
  getConversations: () => api.get('/ai/conversations'),
  getTwin: () => api.post('/ai/twin'),
};

export const alertApi = {
  getAll: () => api.get('/alerts'),
  markRead: (id) => api.post(`/alerts/${id}/read`),
};

export default api;