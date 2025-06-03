import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

/**
 * Enhanced Session Manager that supports both legacy and new session systems
 */
const useSessionManager = (userEmail) => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [systemInfo, setSystemInfo] = useState({ usingNewSystem: false });
  const [favoriteSessionIds, setFavoriteSessionIds] = useState([]);

  // Check which session system is active
  const checkSystemStatus = useCallback(async () => {
    try {
      console.log('Checking session system status...');
      const response = await axios.get(`${API_URL}/session/health`);
      console.log('Session system health response:', response.data);
      const isNewSystem = response.data.system === 'new';
      setSystemInfo({
        usingNewSystem: isNewSystem,
        status: response.data.status
      });
      console.log('Using new session system:', isNewSystem);
      return isNewSystem;
    } catch (error) {
      // If new endpoint doesn't exist, assume legacy system
      console.log('New session system not available, using legacy. Error:', error.message);
      setSystemInfo({ usingNewSystem: false });
      return false;
    }
  }, []);

  // Fetch sessions using new unified endpoint
  const fetchSessionsNew = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/sessions`, {
        params: { email: userEmail }
      });

      if (response.data.success) {
        return response.data.sessions || []; // Fixed: use 'sessions' not 'allSessions'
      } else {
        throw new Error('Failed to fetch sessions');
      }
    } catch (error) {
      console.error('Error fetching sessions (new system):', error);
      throw error;
    }
  }, [userEmail]);

  // Main fetch function that adapts to the current system
  const fetchUserSessions = useCallback(async () => {
    if (!userEmail) return;

    setIsLoading(true);
    setError(null);

    try {
      // Always check system status first
      const isNewSystem = await checkSystemStatus();
      
      let sessionsData;
      if (isNewSystem) {
        console.log('📊 Using new session system');
        sessionsData = await fetchSessionsNew();
      } else {
        console.log('📊 Using legacy session system - falling back to new system');
        // Fallback to new system even if health check fails
        sessionsData = await fetchSessionsNew();
      }

      // Process the sessions data directly (it's already in the right format)
      console.log('Raw sessions data:', sessionsData);
      
      setSessions(sessionsData);
      console.log(`✅ Loaded ${sessionsData.length} sessions`);

    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, checkSystemStatus, fetchSessionsNew]);

  // Create session (adapts to current system)
  const createSession = async (sessionData) => {
    try {
      const isNewSystem = systemInfo.usingNewSystem;
      
      if (isNewSystem) {
        const response = await axios.post(`${API_URL}/sessions`, {
          ...sessionData,
          creator: userEmail
        });
        
        if (response.data.success) {
          await fetchUserSessions(); // Refresh sessions
          return response.data.session;
        } else {
          throw new Error('Failed to create session');
        }
      } else {
        // Use legacy creation logic (if needed)
        throw new Error('Legacy session creation not implemented in this component');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  };

  // Invite user to session (adapts to current system)
  const inviteUser = async (sessionId, inviteeEmail, role = 'editor') => {
    try {
      const endpoint = systemInfo.usingNewSystem ? `/sessions/${sessionId}/invite` : '/manage_session/invite-session';
      
      const requestData = systemInfo.usingNewSystem ? {
        email: inviteeEmail,
        inviterEmail: userEmail,
        access: role === 'editor' ? 'edit' : 'view'
      } : {
        sessionId,
        email: inviteeEmail,
        id: sessionId, // Legacy format
        access: role === 'editor' ? 'edit' : 'view'
      };

      const response = await axios.post(`${API_URL}${endpoint}`, requestData);
      
      if (response.data.success) {
        await fetchUserSessions(); // Refresh sessions
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to invite user');
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      throw error;
    }
  };

  // Delete session (adapts to current system)
  const deleteSession = async (sessionId) => {
    try {
      if (systemInfo.usingNewSystem) {
        const response = await axios.delete(`${API_URL}/sessions/${sessionId}`, {
          data: { userEmail }
        });
        
        await fetchUserSessions(); // Refresh sessions
        return response.data;
      } else {
        const response = await axios.post(`${API_URL}/manage_session/delete-session`, {
          sessionId
        });
        
        await fetchUserSessions(); // Refresh sessions
        return response.data;
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  };

  // Get migration status (only for new system)
  const getMigrationStatus = async () => {
    if (!systemInfo.usingNewSystem) {
      return { available: false };
    }

    try {
      const response = await axios.get(`${API_URL}/session/migration-status`);
      return { available: true, ...response.data };
    } catch (error) {
      console.error('Error getting migration status:', error);
      return { available: false, error: error.message };
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (userEmail) {
      fetchUserSessions();
    }
    
    // Load favorites from localStorage
    const storedFavorites = localStorage.getItem("favoriteSessionIds");
    if (storedFavorites) {
      try {
        setFavoriteSessionIds(JSON.parse(storedFavorites));
      } catch (error) {
        console.error("Error parsing favorites from localStorage:", error);
      }
    }
  }, [userEmail, fetchUserSessions]);

  // Toggle favorite functionality
  const toggleFavorite = (sessionId) => {
    setFavoriteSessionIds((prev) => {
      const newFavorites = prev.includes(sessionId) 
        ? prev.filter((id) => id !== sessionId) 
        : [...prev, sessionId];

      // Save to localStorage
      localStorage.setItem("favoriteSessionIds", JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  return {
    // Data
    sessions,
    setSessions,
    isLoading,
    error,
    systemInfo,
    favoriteSessionIds,
    email: userEmail,
    
    // Actions
    fetchUserSessions,
    createSession,
    inviteUser,
    deleteSession,
    getMigrationStatus,
    toggleFavorite,
    
    // Helper functions
    refreshSessions: fetchUserSessions,
    isUsingNewSystem: systemInfo.usingNewSystem
  };
};

export default useSessionManager;
