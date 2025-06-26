/**
 * Y-WebSocket Service for File Management
 * Handles real-time file upload events via Y-WebSocket
 */

import { WebsocketProvider } from 'y-websocket';
import { Doc } from 'yjs';
import { WEB_SOCKET_API_URL } from '../../config/environment.js';

class FileWebSocketService {
  constructor() {
    this.providers = new Map();
    this.docs = new Map();
    this.eventListeners = new Map();
    this.isConnected = false;
  }

  /**
   * Connect to Y-WebSocket server for a session
   */
  connect(sessionId, wsUrl) {
    if (this.providers.has(sessionId)) {
      return this.providers.get(sessionId);
    }

    const doc = new Doc();
    // Fix URL construction - Y.js WebSocket expects room name as the URL path
    // Backend expects: /yjs-websocket/{roomName} where roomName should be just the sessionId
    // The backend will parse this as the document name for file events
    const roomName = sessionId; // Use sessionId directly as room name
    const finalWsUrl = wsUrl || `${WEB_SOCKET_API_URL}/yjs-websocket`;
    
    console.log(`🔌 Attempting Y-WebSocket connection to: ${finalWsUrl} with room: ${roomName}`);
    
    try {
      const provider = new WebsocketProvider(finalWsUrl, roomName, doc, {
        // Add connection options for better error handling
        connect: true,
        awareness: undefined, // Let it create its own awareness
        params: {}, // Empty params to avoid issues
        resyncInterval: 10000, // 10 second resync
        maxBackoffTime: 30000, // Max 30 second backoff
      });

      this.docs.set(sessionId, doc);
      this.providers.set(sessionId, provider);

      // Enhanced connection event handlers
      provider.on('status', (event) => {
        this.isConnected = event.status === 'connected';
        console.log(`🔌 Y-WebSocket ${event.status} for session ${sessionId}`);
        
        if (event.status === 'connected') {
          console.log('✅ Y-WebSocket connection established successfully');
        } else if (event.status === 'disconnected') {
          console.warn('⚠️ Y-WebSocket disconnected, will attempt to reconnect');
        }
      });

      provider.on('connection-error', (error) => {
        console.error('🚨 Y-WebSocket connection error:', error);
        console.error('🔍 Connection details:', {
          url: finalWsUrl,
          sessionId,
          error: error.message || error
        });
        this.isConnected = false;
      });

      // Add connection-close handler
      provider.on('connection-close', (event) => {
        console.warn('🔌 Y-WebSocket connection closed:', event);
        this.isConnected = false;
      });

      return provider;
    } catch (error) {
      console.error('❌ Failed to create Y-WebSocket provider:', error);
      console.error('🔍 Error details:', {
        url: finalWsUrl,
        sessionId,
        error: error.message || error
      });
      throw error;
    }
  }

  /**
   * Subscribe to file upload events
   */
  subscribeToFileEvents(sessionId, callback) {
    const provider = this.providers.get(sessionId);
    if (!provider) {
      console.warn('No provider found for session:', sessionId);
      return () => {};
    }

    // Listen for direct WebSocket messages from the server
    const messageHandler = (event) => {
      try {
        let data;
        
        // Handle different message formats
        if (typeof event.data === 'string') {
          try {
            data = JSON.parse(event.data);
          } catch {
            // Not JSON, ignore
            return;
          }
        } else {
          // Not a string message, ignore for file events
          return;
        }
        
        // Only process file-related events from the server
        if (data && typeof data === 'object' && data.type) {
          switch (data.type) {
            case 'zipUploadStarted':
              callback({
                type: 'upload-started',
                data: {
                  sessionId: data.sessionID,
                  fileName: data.fileName,
                  fileSize: data.fileSize,
                  message: data.message
                }
              });
              break;

            case 'fileUploaded':
              callback({
                type: 'file-uploaded',
                data: {
                  sessionId: data.sessionId,
                  files: data.files,
                  action: data.action
                }
              });
              break;

            case 'file-deleted':
              console.log('🗑️ Received file deletion event:', data);
              callback({
                type: 'file-deleted',
                data: {
                  sessionId: data.sessionId,
                  file: data.file,
                  deletedBy: data.deletedBy,
                  message: data.message
                }
              });
              break;

            case 'zipUploadComplete':
              callback({
                type: 'upload-complete',
                data: {
                  sessionId: data.sessionID,
                  files: data.files,
                  totalFiles: data.totalFiles,
                  message: data.message
                }
              });
              break;

            case 'file-ready-for-collaboration':
              callback({
                type: 'collaboration-ready',
                data: data
              });
              break;

            default:
              // Forward any other file-related events
              if (data.type && data.type.includes('file')) {
                callback({
                  type: data.type,
                  data: data
                });
              }
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message for file events:', error);
      }
    };

    // Store the handler for cleanup
    this.eventListeners.set(sessionId, messageHandler);

    // Add event listener to the WebSocket connection directly
    if (provider.ws && provider.ws.addEventListener) {
      provider.ws.addEventListener('message', messageHandler);
      console.log('📡 Subscribed to direct WebSocket messages for file events:', sessionId);
    } else {
      console.warn('WebSocket not available for direct message listening:', sessionId);
    }

    // Return cleanup function
    return () => {
      if (provider.ws && provider.ws.removeEventListener) {
        provider.ws.removeEventListener('message', messageHandler);
      }
      this.eventListeners.delete(sessionId);
    };
  }

  /**
   * Disconnect from Y-WebSocket server
   */
  disconnect(sessionId) {
    const provider = this.providers.get(sessionId);
    if (provider) {
      provider.destroy();
      this.providers.delete(sessionId);
    }

    const doc = this.docs.get(sessionId);
    if (doc) {
      doc.destroy();
      this.docs.delete(sessionId);
    }

    this.eventListeners.delete(sessionId);
  }

  /**
   * Disconnect all sessions
   */
  disconnectAll() {
    for (const sessionId of this.providers.keys()) {
      this.disconnect(sessionId);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(sessionId) {
    const provider = this.providers.get(sessionId);
    return provider ? provider.wsconnected : false;
  }
}

// Export singleton instance
export const fileWebSocketService = new FileWebSocketService();
export default fileWebSocketService;
