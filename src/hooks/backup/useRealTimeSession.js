import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import { SocketIOProvider } from '../components/yjs/SocketIOProvider';
import { API_URL } from '../config/api';
import { sessionKeys } from './useSessions';

// Create socket connection for real-time session management
const socket = io(`${API_URL}`, { transports: ["websocket", "polling"] });

/**
 * Enhanced real-time session hook that integrates TanStack Query with existing Socket.IO YJS system
 * Provides live collaboration features while maintaining intelligent caching
 */
export const useRealTimeSession = (sessionId, userEmail) => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // YJS collaboration refs
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const awarenessRef = useRef(null);

  // Fetch session details using TanStack Query
  const {
    data: session,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/sessions/${sessionId}?email=${userEmail}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session details');
      }
      const data = await response.json();
      return data.session;
    },
    enabled: !!sessionId && !!userEmail,
    staleTime: 2 * 60 * 1000, // 2 minutes - session details change less frequently
    refetchOnWindowFocus: true,
  });

  // Initialize YJS collaboration for the session
  useEffect(() => {
    if (!sessionId || !userEmail || !session) return;

    try {
      // Create YJS document for the session
      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      // Create session-level room for general collaboration
      const roomName = `session-${sessionId}`;
      const provider = new SocketIOProvider(roomName, socket, ydoc);
      providerRef.current = provider;
      awarenessRef.current = provider.awareness;

      // Set local user info for awareness
      if (provider.awareness && provider.awareness.setLocalStateField) {
        provider.awareness.setLocalStateField('user', {
          name: userEmail.split('@')[0],
          email: userEmail,
          color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
          joinedAt: Date.now(),
          sessionRole: session.participants?.find(p => p.email === userEmail)?.role || 'viewer'
        });
      }

      // Connection status tracking
      const handleConnectionChange = () => {
        const connected = socket.connected;
        setIsConnected(connected);
        setConnectionStatus(connected ? 'connected' : 'disconnected');
        
        if (connected) {
          console.log(`✅ Connected to session ${sessionId}`);
        } else {
          console.log(`❌ Disconnected from session ${sessionId}`);
        }
      };

      socket.on('connect', handleConnectionChange);
      socket.on('disconnect', handleConnectionChange);
      handleConnectionChange(); // Initial status

      // Track active users through awareness
      const updateActiveUsers = () => {
        if (awarenessRef.current) {
          const users = Array.from(awarenessRef.current.getStates().values())
            .map(state => state.user)
            .filter(user => user && user.email !== userEmail); // Exclude self
          
          setActiveUsers(users);
          
          // Update session cache with live participant count
          queryClient.setQueryData(
            sessionKeys.detail(sessionId),
            (oldSession) => oldSession ? {
              ...oldSession,
              activeParticipants: users.length + 1, // +1 for current user
              lastActivity: new Date().toISOString()
            } : oldSession
          );
        }
      };

      if (awarenessRef.current) {
        awarenessRef.current.on('change', updateActiveUsers);
        updateActiveUsers(); // Initial update
      }

      // Document change handler for activity tracking
      const handleDocumentChange = () => {
        // Update session activity in cache
        queryClient.setQueryData(
          sessionKeys.detail(sessionId),
          (oldSession) => oldSession ? {
            ...oldSession,
            lastActivity: new Date().toISOString(),
            hasUnsavedChanges: true
          } : oldSession
        );

        // Invalidate user sessions to show activity indicators
        queryClient.invalidateQueries({ 
          queryKey: sessionKeys.user(userEmail),
          refetchType: 'none' // Don't refetch, just mark as stale
        });
      };

      ydoc.on('update', handleDocumentChange);

      // Cleanup function
      return () => {
        ydoc.off('update', handleDocumentChange);
        
        if (awarenessRef.current) {
          awarenessRef.current.off('change', updateActiveUsers);
        }
        
        socket.off('connect', handleConnectionChange);
        socket.off('disconnect', handleConnectionChange);
        
        if (providerRef.current) {
          providerRef.current.destroy();
        }
        
        if (ydocRef.current) {
          ydocRef.current.destroy();
        }
      };

    } catch (error) {
      console.error('Failed to initialize real-time session:', error);
      setConnectionStatus('error');
    }
  }, [sessionId, userEmail, session, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
    };
  }, []);

  // Sync session changes back to server periodically
  useEffect(() => {
    if (!isConnected || !sessionId) return;

    const syncInterval = setInterval(() => {
      // Trigger a background refetch to sync any server-side changes
      queryClient.invalidateQueries({ 
        queryKey: sessionKeys.detail(sessionId),
        refetchType: 'none'
      });
    }, 60 * 1000); // Every minute

    return () => clearInterval(syncInterval);
  }, [isConnected, sessionId, queryClient]);

  // Utility functions for components
  const getSharedType = (name) => {
    return ydocRef.current?.get(name, Y.Text);
  };

  const getSharedMap = (name) => {
    return ydocRef.current?.get(name, Y.Map);
  };

  const updateUserPresence = (presence) => {
    if (awarenessRef.current) {
      awarenessRef.current.setLocalStateField('presence', presence);
    }
  };

  const sendCursorPosition = (position) => {
    if (awarenessRef.current) {
      awarenessRef.current.setLocalStateField('cursor', {
        ...position,
        timestamp: Date.now()
      });
    }
  };

  return {
    // Session data from TanStack Query
    session,
    isLoading,
    error,
    refetch,
    
    // Real-time collaboration state
    isConnected,
    connectionStatus,
    activeUsers,
    
    // YJS utilities
    ydoc: ydocRef.current,
    provider: providerRef.current,
    awareness: awarenessRef.current,
    
    // Helper functions
    getSharedType,
    getSharedMap,
    updateUserPresence,
    sendCursorPosition,
    
    // Connection management
    reconnect: () => socket.connect(),
    disconnect: () => socket.disconnect(),
  };
};
