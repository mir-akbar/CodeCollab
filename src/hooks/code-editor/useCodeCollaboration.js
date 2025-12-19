/**
 * Code Collaboration Hooks
 * React hooks for real-time code collaboration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { codeCollaborationService } from '../../services/code-editor/codeCollaborationService';
import { fileWebSocketService } from '../../services/file-manager/fileWebSocket';
import { apiClient } from '../../services/apiClient';
import { useUser } from '../../contexts/UserContext';
import { endpoints } from '@/config/api';

/**
 * Hook for managing collaborative code editing with upload coordination
 */
export function useCodeCollaboration(sessionId, filePath) {
  const { userEmail } = useUser();
  const [isConnected, setIsConnected] = useState(false);
  const [isCollaborationReady, setIsCollaborationReady] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const connectionRef = useRef(null);
  const collaborationReadyTimeoutRef = useRef(null);

  // Listen for file upload completion and collaboration readiness
  useEffect(() => {
    if (!sessionId || !filePath) return;

    const cleanupFileEvents = fileWebSocketService.subscribeToFileEvents(sessionId, (event) => {
      if (event.type === 'collaboration-ready' && event.data.file?.path === filePath) {
        console.log('🤝 Collaboration ready for file:', filePath);
        setIsCollaborationReady(true);
        // Clear any pending timeout
        if (collaborationReadyTimeoutRef.current) {
          clearTimeout(collaborationReadyTimeoutRef.current);
          collaborationReadyTimeoutRef.current = null;
        }
      }
    });

    // Set a reasonable timeout for collaboration readiness (3 seconds for better reliability)
    collaborationReadyTimeoutRef.current = setTimeout(() => {
      console.log('⚠️ Collaboration timeout, proceeding anyway for:', filePath);
      setIsCollaborationReady(true);
    }, 3000);

    return () => {
      cleanupFileEvents();
      if (collaborationReadyTimeoutRef.current) {
        clearTimeout(collaborationReadyTimeoutRef.current);
      }
    };
  }, [sessionId, filePath]);

  // Initialize collaboration connection
  useEffect(() => {
    if (!sessionId || !filePath || !userEmail) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Connect to collaboration
      connectionRef.current = codeCollaborationService.connect(sessionId, filePath, {
        email: userEmail,
        name: userEmail.split('@')[0]
      });

      // Set up event listeners
      const handleConnectionStatus = ({ connected, status }) => {
        console.log('🔗 [HOOK] Connection status changed for', filePath, '- Connected:', connected, 'Status:', status);
        setIsConnected(connected);
        if (connected) {
          // Load initial users when connected
          const initialUsers = codeCollaborationService.getOnlineUsers(sessionId, filePath);
          setOnlineUsers([...initialUsers]);
          
          // Set collaboration ready with a short delay for existing files
          setTimeout(() => {
            console.log('🔄 Setting collaboration ready for existing file:', filePath);
            setIsCollaborationReady(true);
          }, 200); // Short delay for existing files
        }
        setIsLoading(false);
      };

      const handleSynced = () => {
        console.log('📄 Document synced for:', filePath);
        setIsLoading(false);
      };

      // Listen for awareness changes to update user count in real-time
      const handleAwarenessChange = () => {
        const currentUsers = codeCollaborationService.getOnlineUsers(sessionId, filePath);
        console.log('👥 [FILE-SPECIFIC] Awareness changed for', filePath, '- Users viewing this file:', currentUsers.length, currentUsers.map(u => u.name || u.email));
        console.log('📝 [FILE-SPECIFIC] These users are actively viewing/editing:', filePath);
        setOnlineUsers([...currentUsers]);
      };

      // Subscribe to events
      console.log('🔗 [HOOK] Subscribing to connection events for:', filePath);
      codeCollaborationService.on(sessionId, filePath, 'connection-status', handleConnectionStatus);
      codeCollaborationService.on(sessionId, filePath, 'synced', handleSynced);
      codeCollaborationService.on(sessionId, filePath, 'awareness-changed', handleAwarenessChange);

      // Set up a periodic check to ensure status stays accurate
      const statusCheckInterval = setInterval(() => {
        const currentConnectionStatus = codeCollaborationService.isConnected(sessionId, filePath);
        if (currentConnectionStatus !== isConnected) {
          console.log(`🔄 [HOOK] Status sync needed for ${filePath}: ${isConnected} -> ${currentConnectionStatus}`);
          setIsConnected(currentConnectionStatus);
          
          if (currentConnectionStatus) {
            // Update user count when connection is restored
            const currentUsers = codeCollaborationService.getOnlineUsers(sessionId, filePath);
            setOnlineUsers([...currentUsers]);
          }
        }
      }, 2000); // Check every 2 seconds

      // Check if already connected (this handles the case where connection happens before event listeners are set up)
      // Use multiple checks with increasing delays to catch late-connecting WebSockets
      const checkConnectionStatus = () => {
        const isCurrentlyConnected = codeCollaborationService.isConnected(sessionId, filePath);
        console.log('🔗 [HOOK] Connection status check for', filePath, ':', isCurrentlyConnected);
        if (isCurrentlyConnected) {
          console.log('🔗 [HOOK] Connection already established, setting state manually');
          handleConnectionStatus({ connected: true, status: 'connected' });
          
          // Also manually trigger user count update
          handleAwarenessChange();
          return true; // Connected successfully
        }
        return false; // Not connected yet
      };
      
      // Try immediate check first
      if (!checkConnectionStatus()) {
        // If not connected immediately, try with small delay
        setTimeout(() => {
          if (!checkConnectionStatus()) {
            // If still not connected, try with longer delay
            setTimeout(() => {
              checkConnectionStatus();
            }, 500);
          }
        }, 100);
      }

      return () => {
        console.log('🧹 Cleaning up code collaboration for:', filePath);
        
        // Clear the interval
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
        }
        
        try {
          codeCollaborationService.off(sessionId, filePath, 'connection-status', handleConnectionStatus);
          codeCollaborationService.off(sessionId, filePath, 'synced', handleSynced);
          codeCollaborationService.off(sessionId, filePath, 'awareness-changed', handleAwarenessChange);
          codeCollaborationService.disconnect(sessionId, filePath);
        } catch (error) {
          console.warn('Error during collaboration cleanup:', error);
        }
      };
    } catch (err) {
      console.error('Error initializing code collaboration:', err);
      setError(err);
      setIsLoading(false);
    }
  }, [sessionId, filePath, userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // Create Monaco binding
  const createBinding = useCallback((editor, onContentChange) => {
    if (!sessionId || !filePath || !editor) {
      console.warn('Cannot create binding: missing parameters');
      return null;
    }

    return codeCollaborationService.createMonacoBinding(
      sessionId, 
      filePath, 
      editor, 
      onContentChange
    );
  }, [sessionId, filePath]);

  // Initialize content
  const initializeContent = useCallback(async (content) => {
    if (!sessionId || !filePath) return false;
    
    return await codeCollaborationService.initializeContent(sessionId, filePath, content);
  }, [sessionId, filePath]);

  // Get current content
  const getContent = useCallback(() => {
    if (!sessionId || !filePath) return '';
    
    return codeCollaborationService.getContent(sessionId, filePath);
  }, [sessionId, filePath]);

  return {
    // State
    isConnected,
    isCollaborationReady,
    isLoading,
    error,
    onlineUsers,
    
    // Actions
    createBinding,
    initializeContent,
    getContent,
    
    // Computed
    userCount: onlineUsers.length,
    connectionStatus: isConnected ? 'connected' : 'disconnected'
  };
}

/**
 * Hook for fetching file content with instant loading from cache
 */
export function useFileContent(sessionId, filePath) {
  const queryClient = useQueryClient();
  
  // Try to get from cache first for instant loading
  const cachedContent = queryClient.getQueryData(['file-content', sessionId, filePath]);
  
  const query = useQuery({
    queryKey: ['file-content', sessionId, filePath],
    queryFn: async () => {
      if (!sessionId || !filePath) {
        throw new Error('Session ID and file path are required');
      }
      
      const response = await apiClient.get(
        `/api/files/content?path=${encodeURIComponent(filePath)}&sessionId=${encodeURIComponent(sessionId)}`,
        { responseType: 'text' }
      );
      return response.data || '';
    },
    enabled: !!(sessionId && filePath),
    staleTime: 10 * 60 * 1000, // 10 minutes - very long cache
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: cachedContent || '', // Use cache or empty string immediately
    networkMode: 'offlineFirst',
  });

  return {
    ...query,
    data: cachedContent !== undefined ? cachedContent : (query.data || ''),
    isLoading: cachedContent === undefined && query.isLoading,
    isSuccess: cachedContent !== undefined || query.isSuccess,
    isCached: cachedContent !== undefined,
  };
}

/**
 * Hook for code execution with TanStack Query
 */
export function useCodeExecution() {
  const executeCode = useCallback(async (language, code) => {
    try {
      const response = await apiClient.post(endpoints.execute, {
        language, 
        code 
      });

      const result = response.data;
      return result.output || 'No output';
    } catch (error) {
      console.error('Code execution error:', error);
      throw new Error(`Error executing code: ${error.message}`);
    }
  }, []);

  return { executeCode };
}

export default useCodeCollaboration;
