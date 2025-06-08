/**
 * Secure API Client with Token Management
 * Uses memory storage + httpOnly cookies for secure token handling
 */

import axios from 'axios';

// API Configuration
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Token storage in memory (not localStorage for security)
let accessToken = null;
let tokenExpiry = null;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true, // Include httpOnly cookies
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(async (config) => {
  // Check if we have a valid token in memory
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else {
    // Try to refresh token from secure httpOnly cookie via backend
    try {
      console.log('Attempting to refresh token from backend...');
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Token refresh successful');
        if (data.accessToken) {
          setTokens(data.accessToken, data.expiresIn);
          config.headers.Authorization = `Bearer ${data.accessToken}`;
        } else {
          console.log('No access token returned from refresh endpoint');
        }
      } else {
        console.log('Token refresh failed with status:', response.status);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  }
  return config;
});

// Response interceptor - handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear memory tokens
      clearTokens();
      
      // Try to refresh token once
      try {
        const response = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setTokens(data.accessToken, data.expiresIn);
          
          // Retry the original request
          const originalRequest = error.config;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient.request(originalRequest);
        }
      } catch (refreshError) {
        console.log('Token refresh failed:', refreshError);
      }
      
      // If refresh fails, redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Token management functions
export function setTokens(token, expiresIn) {
  accessToken = token;
  tokenExpiry = Date.now() + (expiresIn * 1000);
}

export function clearTokens() {
  accessToken = null;
  tokenExpiry = null;
}

export function hasValidToken() {
  return accessToken && tokenExpiry && Date.now() < tokenExpiry;
}

export { apiClient };
