/**
 * API Client Configuration with Axios Interceptors
 * Automatically handles authentication headers for all API requests
 */

import axios from 'axios';
import { API_URL } from '../config/api';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add authentication headers
apiClient.interceptors.request.use(
  (config) => {
    // Get user email from localStorage (stored as 'email' after login)
    const userEmail = localStorage.getItem('email');
    
    if (userEmail) {
      // Add user email to headers for authentication middleware
      config.headers['x-user-email'] = userEmail;
      
      // Also add to request body if it doesn't already have email
      if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
        if (config.data && typeof config.data === 'object' && !config.data.email) {
          config.data.email = userEmail;
        }
      }
      
      // Add to query params for GET requests if not already present
      if (config.method === 'get' && !config.params?.email) {
        config.params = { ...config.params, email: userEmail };
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle authentication errors
      console.error('Authentication required:', error.response?.data?.error);
      
      // Optionally redirect to login page or show auth modal
      // window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
