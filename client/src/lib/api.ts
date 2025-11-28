import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export const transactionsApi = {
  list: () => api.get('/api/transactions'),
  create: (data: any) => api.post('/api/transactions', data),
  update: (id: string, data: any) => api.put(`/api/transactions/${id}`, data),
  remove: (id: string) => api.delete(`/api/transactions/${id}`),
};

export const dashboardApi = {
  summary: () => api.get('/api/dashboard/summary'),
};

export const aiApi = {
  chat: (message: string, conversationId?: string) =>
    api.post('/api/ai/chat', { message, conversationId }),
  twin: () => api.post('/api/ai/twin', {}),
};
