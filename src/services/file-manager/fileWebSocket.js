/**
 * Y-WebSocket Service for File Management
 * Handles real-time file upload events via Y-WebSocket
 */

import { WebsocketProvider } from 'y-websocket';
import { Doc } from 'yjs';

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
  connect(sessionId, wsUrl = 'ws://localhost:3001') {
    if (this.providers.has(sessionId)) {
      return this.providers.get(sessionId);
    }

    const doc = new Doc();
    const provider = new WebsocketProvider(wsUrl, sessionId, doc);

    this.docs.set(sessionId, doc);
    this.providers.set(sessionId, provider);

    // Connection event handlers
    provider.on('status', (event) => {
      this.isConnected = event.status === 'connected';
      console.log(`🔌 Y-WebSocket ${event.status} for session ${sessionId}`);
    });

    provider.on('connection-error', (error) => {
      console.error('🚨 Y-WebSocket connection error:', error);
      this.isConnected = false;
    });

    return provider;
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

    // Listen for broadcast messages from the server
    const messageHandler = (data, origin) => {
      // Only process messages from the server (not other clients)
      if (origin === 'server' && data && typeof data === 'object') {
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
    };

    // Store the handler for cleanup
    this.eventListeners.set(sessionId, messageHandler);

    // Note: Y-WebSocket doesn't have a direct message event
    // We need to implement custom message handling through the document
    const doc = this.docs.get(sessionId);
    const messagesArray = doc.getArray('fileEvents');
    
    const arrayObserver = (events) => {
      events.forEach(event => {
        if (event.type === 'insert') {
          event.values.forEach(value => {
            if (value && typeof value === 'object') {
              messageHandler(value, 'server');
            }
          });
        }
      });
    };

    messagesArray.observe(arrayObserver);

    // Return cleanup function
    return () => {
      messagesArray.unobserve(arrayObserver);
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
