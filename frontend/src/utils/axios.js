import axios from 'axios';
import { auth } from '../config/firebase';

const api = axios.create({
  baseURL: 'http://localhost:5000'
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api; 