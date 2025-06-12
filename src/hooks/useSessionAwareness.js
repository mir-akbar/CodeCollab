/**
 * Session Awareness Hook
 * Tracks online users across the entire session using Y.js awareness
 */

import { useState, useEffect, useRef } from 'react';
import { codeCollaborationService } from '../services/code-editor/codeCollaborationService';

export const useSessionAwareness = (sessionId) => {
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [userCount, setUserCount] = useState(0);
  const listenersRef = useRef(new Map());

  useEffect(() => {
    if (!sessionId) {
      setOnlineUsers(new Set());
      setUserCount(0);
      return;
    }

    console.log('👥 Setting up session awareness for:', sessionId);

    // Function to aggregate users from all file connections in this session
    const updateSessionUsers = () => {
      const allUsers = new Set();
      
      // Get all connections for this session
      codeCollaborationService.connections.forEach((connection, connectionKey) => {
        if (connection.sessionId === sessionId && connection.awareness) {
          // Get all users from this file's awareness
          const awarenessStates = connection.awareness.getStates();
          awarenessStates.forEach((state, clientId) => {
            if (state.user?.email) {
              allUsers.add(JSON.stringify({
                email: state.user.email,
                name: state.user.name || state.user.email.split('@')[0],
                clientId: clientId,
                file: connection.filePath
              }));
            }
          });
        }
      });

      // Convert back to objects and update state
      const uniqueUsers = Array.from(allUsers).map(userStr => JSON.parse(userStr));
      
      // Remove duplicates by email, keeping the most recent connection
      const userMap = new Map();
      uniqueUsers.forEach(user => {
        if (!userMap.has(user.email) || user.clientId > userMap.get(user.email).clientId) {
          userMap.set(user.email, user);
        }
      });

      const finalUsers = Array.from(userMap.values());
      console.log('👥 Session awareness updated - Users online:', finalUsers.length, finalUsers.map(u => u.name));
      
      setOnlineUsers(new Set(finalUsers.map(u => u.email)));
      setUserCount(finalUsers.length);
    };

    // Set up listeners for all current and future connections in this session
    const setupConnectionListener = (connectionKey, connection) => {
      if (connection.sessionId !== sessionId) return;

      const awarenessListener = () => {
        updateSessionUsers();
      };

      // Add listener
      codeCollaborationService.on(connectionKey, 'awareness-changed', awarenessListener);
      
      // Store for cleanup
      listenersRef.current.set(connectionKey, awarenessListener);
      
      console.log('👥 Added awareness listener for:', connectionKey);
    };

    // Listen for new connections
    const originalConnect = codeCollaborationService.connect.bind(codeCollaborationService);
    codeCollaborationService.connect = function(sessionIdParam, filePath, user) {
      const result = originalConnect(sessionIdParam, filePath, user);
      if (sessionIdParam === sessionId) {
        const connectionKey = `${sessionIdParam}-${filePath}`;
        const connection = this.connections.get(connectionKey);
        if (connection) {
          // Wait for connection to be established before setting up listener
          setTimeout(() => setupConnectionListener(connectionKey, connection), 100);
        }
      }
      return result;
    };

    // Set up listeners for existing connections
    codeCollaborationService.connections.forEach((connection, connectionKey) => {
      setupConnectionListener(connectionKey, connection);
    });

    // Initial update
    updateSessionUsers();

    // Cleanup function
    return () => {
      console.log('👥 Cleaning up session awareness for:', sessionId);
      
      // Remove all listeners
      listenersRef.current.forEach((listener, connectionKey) => {
        codeCollaborationService.off(connectionKey, 'awareness-changed', listener);
      });
      listenersRef.current.clear();
      
      // Restore original connect method
      // Note: This is a simplified cleanup, in production you might want a more robust approach
    };
  }, [sessionId]);

  return {
    onlineUsers: Array.from(onlineUsers),
    userCount,
    isOnline: (userEmail) => onlineUsers.has(userEmail)
  };
};
