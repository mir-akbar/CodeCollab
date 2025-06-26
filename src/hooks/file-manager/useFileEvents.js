/**
 * Hook for Real-time File Events via Y-WebSocket
 * Manages WebSocket connections and real-time file updates
 */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fileWebSocketService } from '@/services/file-manager/fileWebSocket';
import { fileQueryKeys } from './useFileQueries';
import { toast } from 'sonner';

export function useFileEvents(sessionId) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const cleanupRef = useRef(null);
  const previousConnectionStateRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    console.log(`🔌 Connecting to file events for session: ${sessionId}`);

    // Connect to Y-WebSocket
    fileWebSocketService.connect(sessionId);

    // Monitor connection status with more frequent checks
    const checkConnection = () => {
      const connected = fileWebSocketService.getConnectionStatus(sessionId);
      const wasConnected = previousConnectionStateRef.current;
      setIsConnected(connected);
      previousConnectionStateRef.current = connected;
      
      // Log connection state changes for debugging
      if (connected !== wasConnected) {
        console.log(`🔌 File events connection state changed for session ${sessionId}: ${connected ? 'connected' : 'disconnected'}`);
      }
    };

    // Check connection status more frequently for better responsiveness
    const connectionInterval = setInterval(checkConnection, 1000);
    checkConnection(); // Initial check

    // Subscribe to file events
    const cleanup = fileWebSocketService.subscribeToFileEvents(sessionId, (event) => {
      console.log(`📡 Received file event:`, event);
      setLastEvent(event);

      switch (event.type) {
        case 'upload-started':
          toast.info(`Upload started: ${event.data.fileName}`, {
            description: event.data.message,
          });
          break;

        case 'file-uploaded':
          // Invalidate queries to refresh file list
          queryClient.invalidateQueries({ queryKey: fileQueryKeys.session(sessionId) });
          queryClient.invalidateQueries({ queryKey: fileQueryKeys.hierarchy(sessionId) });
          
          toast.success('File uploaded successfully', {
            description: `${event.data.files?.length || 1} file(s) added`,
          });
          break;

        case 'file-deleted': {
          // Invalidate queries to refresh file list after deletion
          queryClient.invalidateQueries({ queryKey: fileQueryKeys.session(sessionId) });
          queryClient.invalidateQueries({ queryKey: fileQueryKeys.hierarchy(sessionId) });
          queryClient.invalidateQueries({ queryKey: fileQueryKeys.stats(sessionId) });
          
          // Remove the deleted file's content from cache
          const deletedFilePath = event.data.file?.path;
          if (deletedFilePath) {
            queryClient.removeQueries({ 
              queryKey: fileQueryKeys.content(sessionId, deletedFilePath),
              exact: true 
            });
            console.log(`🗑️ Removed cached content for deleted file: ${deletedFilePath}`);
            
            // Also remove any related queries for the deleted file
            queryClient.removeQueries({ 
              predicate: (query) => {
                return query.queryKey[0] === 'fileContent' && 
                       query.queryKey[2] === deletedFilePath;
              }
            });
          }
          
          // Show notification with better context
          const deletedBy = event.data.deletedBy;
          const fileName = event.data.file?.name || 'Unknown file';
          
          toast.info('File deleted', {
            description: `"${fileName}" was deleted${deletedBy ? ` by ${deletedBy}` : ''}`,
            duration: 4000,
          });
          break;
        }

        case 'upload-complete':
          // Invalidate all file-related queries
          queryClient.invalidateQueries({ queryKey: fileQueryKeys.session(sessionId) });
          queryClient.invalidateQueries({ queryKey: fileQueryKeys.hierarchy(sessionId) });
          queryClient.invalidateQueries({ queryKey: fileQueryKeys.stats(sessionId) });
          
          toast.success('Upload completed', {
            description: event.data.message,
          });
          break;

        case 'collaboration-ready':
          toast.success('File ready for collaboration', {
            description: event.data.message,
          });
          break;

        default:
          console.log('Unhandled file event:', event.type);
      }
    });

    cleanupRef.current = cleanup;

    // Cleanup function
    return () => {
      clearInterval(connectionInterval);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      fileWebSocketService.disconnect(sessionId);
      setIsConnected(false);
    };
  }, [sessionId, queryClient]);

  return {
    isConnected,
    lastEvent,
    disconnect: () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      fileWebSocketService.disconnect(sessionId);
      setIsConnected(false);
    },
  };
}
