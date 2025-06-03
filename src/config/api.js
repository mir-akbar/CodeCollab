/**
 * API Configuration
 * Centralized API endpoint configuration for the application
 */

import { env } from './environment';

// Base API URL
export const API_URL = env.API_BASE_URL;

// WebSocket URL  
export const WEBSOCKET_URL = env.WEBSOCKET_URL;

// Workspace URL for session collaboration
export const workspaceUrl = `${env.API_BASE_URL}/api/workspace`;

// API endpoints
export const endpoints = {
  // Session management
  sessions: `${API_URL}/api/sessions`,
  sessionById: (id) => `${API_URL}/api/sessions/${id}`,
  
  // User management  
  users: `${API_URL}/api/users`,
  userSessions: (email) => `${API_URL}/api/users/${email}/sessions`,
  
  // File management
  files: `${API_URL}/api/files`,
  fileById: (id) => `${API_URL}/api/files/${id}`,
  
  // Collaboration
  workspace: workspaceUrl,
  collaborate: (sessionId) => `${workspaceUrl}/${sessionId}`,
  
  // Authentication
  auth: {
    login: `${API_URL}/api/auth/login`,
    logout: `${API_URL}/api/auth/logout`,
    verify: `${API_URL}/api/auth/verify`
  }
};

// Default axios configuration
export const axiosConfig = {
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// WebSocket configuration
export const wsConfig = {
  url: WEBSOCKET_URL,
  options: {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000
  }
};

export default {
  API_URL,
  WEBSOCKET_URL,
  workspaceUrl,
  endpoints,
  axiosConfig,
  wsConfig
};
