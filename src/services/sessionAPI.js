/**
 * Session API Service
 * Centralized API functions for session management
 */

import axios from 'axios';
import { API_URL } from '../config/api';

// Secure API client with cookie support
const secureAPIClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true, // Include HTTP-only cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Session API functions
export const sessionAPI = {
  // Fetch all sessions for a user
  getUserSessions: async () => {
    const response = await secureAPIClient.get('/api/sessions');
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch sessions');
    }
    
    return response.data.sessions || [];
  },

  // Get session details by ID
  getSessionDetails: async (sessionId) => {
    const response = await secureAPIClient.get(`/api/sessions/${sessionId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch session details');
    }
    
    return response.data.session;
  },

  // Get user's pending invitations
  getPendingInvitations: async (userEmail) => {
    const response = await secureAPIClient.get(`/api/users/${encodeURIComponent(userEmail)}/pending-invitations`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch pending invitations');
    }
    
    return response.data.invitations;
  },

  // Create a new session
  createSession: async ({ sessionData, userEmail }) => {
    const response = await secureAPIClient.post('/api/sessions', {
      ...sessionData,
      creator: userEmail
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create session');
    }
    
    return response.data.session;
  },

  // Delete a session
  deleteSession: async ({ sessionId }) => {
    const response = await secureAPIClient.delete(`/api/sessions/${sessionId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete session');
    }
    
    return response.data;
  },

  // Invite user to session
  inviteUser: async ({ sessionId, inviteeEmail, role, inviterEmail }) => {
    const response = await secureAPIClient.post(`/api/sessions/${sessionId}/invite`, {
      inviteeEmail: inviteeEmail,
      role: role,
      inviterEmail: inviterEmail
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to invite user');
    }
    
    return response.data;
  },

  // Leave a session
  leaveSession: async ({ sessionId }) => {
    const response = await secureAPIClient.post(`/api/sessions/${sessionId}/leave`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to leave session');
    }
    
    return response.data;
  },

  // Join a session (accept invitation)
  joinSession: async ({ sessionId, userEmail }) => {
    const response = await secureAPIClient.post(`/api/sessions/${sessionId}/join`, {
      userEmail: userEmail
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to join session');
    }
    
    return response.data;
  },

  // Reject/decline a session invitation
  rejectInvitation: async ({ sessionId, userEmail }) => {
    const response = await secureAPIClient.delete(`/api/users/${encodeURIComponent(userEmail)}/invitations/${sessionId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to reject invitation');
    }
    
    return response.data;
  },

  // Remove participant from session
  removeParticipant: async ({ sessionId, participantEmail, userEmail }) => {
    const response = await secureAPIClient.post(`/api/sessions/${sessionId}/remove-participant`, {
      participantEmail: participantEmail,
      removerEmail: userEmail
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove participant');
    }
    
    return response.data;
  },

  // Transfer ownership of session
  transferOwnership: async ({ sessionId, newOwnerEmail, userEmail }) => {
    const response = await secureAPIClient.post(`/api/sessions/${sessionId}/transfer-ownership`, {
      newOwnerEmail: newOwnerEmail,
      currentOwnerEmail: userEmail
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to transfer ownership');
    }
    
    return response.data;
  },

  // Update participant role
  updateRole: async ({ sessionId, participantEmail, newRole, userEmail }) => {
    const response = await secureAPIClient.post(`/api/sessions/${sessionId}/update-role`, {
      participantEmail: participantEmail,
      newRole: newRole,
      updaterEmail: userEmail
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update role');
    }
    
    return response.data;
  },

  // Fetch participants for a specific session
  getSessionParticipants: async (sessionId) => {
    const response = await secureAPIClient.get(`/api/sessions/${sessionId}/participants`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch session participants');
    }
    
    return response.data.participants || [];
  },
};

// Query keys factory for consistent cache management
export const sessionKeys = {
  all: ['sessions'],
  user: (userEmail) => [...sessionKeys.all, 'user', userEmail],
  detail: (sessionId) => [...sessionKeys.all, 'detail', sessionId],
  participants: (sessionId) => [...sessionKeys.all, 'participants', sessionId],
};
