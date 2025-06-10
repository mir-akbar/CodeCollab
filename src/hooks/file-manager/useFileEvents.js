/**
 * Hook for Real-time File Events via Y-WebSocket
 * Manages WebSocket connections and real-time file updates
 */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fileWebSocketService } from '@/services/file-manager/fileWebSocket';
import { fileQueryKeys } from './useFileManager';
import { toast } from 'sonner';

export function useFileEvents(sessionId) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;

    console.log(`🔌 Connecting to file events for session: ${sessionId}`);

    // Connect to Y-WebSocket
    const provider = fileWebSocketService.connect(sessionId);

    // Monitor connection status
    const checkConnection = () => {
      const connected = fileWebSocketService.getConnectionStatus(sessionId);
      setIsConnected(connected);
    };

    // Check connection status periodically
    const connectionInterval = setInterval(checkConnection, 2000);
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

/**
 * Hook for upload progress tracking
 */
export function useUploadProgress() {
  const [uploadProgress, setUploadProgress] = useState({});

  const startUpload = (fileId, fileName) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: {
        fileName,
        progress: 0,
        status: 'uploading',
        startTime: Date.now()
      }
    }));
  };

  const updateProgress = (fileId, progress) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        progress
      }
    }));
  };

  const completeUpload = (fileId) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        progress: 100,
        status: 'completed',
        endTime: Date.now()
      }
    }));

    // Remove completed upload after a delay
    setTimeout(() => {
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
    }, 3000);
  };

  const failUpload = (fileId, error) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        status: 'failed',
        error,
        endTime: Date.now()
      }
    }));
  };

  const clearProgress = (fileId) => {
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  return {
    uploadProgress,
    startUpload,
    updateProgress,
    completeUpload,
    failUpload,
    clearProgress,
  };
}
