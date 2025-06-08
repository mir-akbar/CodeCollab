/**
 * Authentication utilities for secure HTTP-only cookie based auth
 */

import { apiClient } from '../services/apiClient';

/**
 * Check if user is authenticated (works with HTTP-only cookies)
 */
export async function isAuthenticated() {
  try {
    const response = await apiClient.get('/api/auth/me');
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Get current user information from secure backend
 */
export async function getCurrentUserInfo() {
  try {
    const response = await apiClient.get('/api/auth/me');
    return response.data.user;
  } catch (error) {
    console.log('Failed to get user info:', error);
    return null;
  }
}

/**
 * Store tokens securely via backend (HTTP-only cookies)
 */
export async function storeTokensSecurely(tokens) {
  try {
    const response = await apiClient.post('/api/auth/store-tokens', tokens);
    return response.data.success;
  } catch (error) {
    console.error('Failed to store tokens:', error);
    return false;
  }
}

/**
 * Logout and clear secure tokens
 */
export async function logout() {
  try {
    await apiClient.post('/api/auth/logout');
    return true;
  } catch (error) {
    console.error('Logout failed:', error);
    return false;
  }
}
