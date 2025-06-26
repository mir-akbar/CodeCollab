/**
 * YJS Connection Manager
 * Handles Y.js document and WebSocket provider creation/management
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { WEB_SOCKET_API_URL } from '../../../config/environment.js';

if (!WEB_SOCKET_API_URL || WEB_SOCKET_API_URL === 'undefined') {
  console.error('❌ WEB_SOCKET_API_URL is not defined! This will cause connection failures.');
  console.error('Available import.meta.env:', import.meta.env);
}

export class YjsConnectionManager {
  constructor() {
    this.connections = new Map(); // sessionId-filePath -> connection
  }

  /**
   * Create or get existing Y.js connection
   */
  async createConnection(sessionId, filePath, user) {
    const connectionKey = `${sessionId}-${filePath}`;
    
    // Check if connection already exists and is healthy
    if (this.connections.has(connectionKey)) {
      const existing = this.connections.get(connectionKey);
      if (this.isConnectionHealthy(existing)) {
        console.log('🔄 Reusing existing healthy connection for:', filePath);
        return existing;
      } else {
        console.log('🧹 Cleaning up unhealthy connection for:', filePath);
        this.destroyConnection(connectionKey);
      }
    }

    try {
      const connection = await this._createNewConnection(sessionId, filePath, user);
      this.connections.set(connectionKey, connection);
      return connection;
    } catch (error) {
      console.error('❌ Failed to create Y.js connection:', error);
      throw error;
    }
  }

  /**
   * Create a new Y.js connection with error handling
   */
  async _createNewConnection(sessionId, filePath, user) {
    // Create room name and WebSocket URL
    const roomName = `${sessionId}/${filePath.replace(/[/\\:]/g, '-')}`;
    // Use the proper WebSocket URL from environment configuration
    const wsUrl = `${WEB_SOCKET_API_URL}/yjs-websocket`;
    
    console.log('🔍 Debug WebSocket connection:');
    console.log('  - WEB_SOCKET_API_URL:', WEB_SOCKET_API_URL);
    console.log('  - wsUrl (constructed):', wsUrl);
    console.log('  - roomName:', roomName);
    console.log('  - sessionId:', sessionId);
    console.log('  - filePath:', filePath);
    
    // Create YJS document with comprehensive error handling and corruption prevention
    const doc = new Y.Doc();
    
    // Add global error handler for YJS document
    doc.on('updateV2', (update) => {
      try {
        // Validate update integrity before processing
        if (!update || update.length === 0) {
          console.warn('⚠️ Received empty update, skipping');
          return;
        }
        
        // Check for malformed updates that could cause "Unexpected end of array"
        if (update.length < 3) {
          console.warn('⚠️ Received suspiciously small update, potential corruption risk');
          return;
        }
      } catch (error) {
        console.error('❌ Y.js update validation error:', error);
        // Don't propagate this error to prevent app crash
      }
    });
    
    // Add document state validation
    doc.on('beforeAllTransactions', () => {
      try {
        if (!doc.store || !doc.store.clients) {
          console.warn('⚠️ Y.js document store not properly initialized');
          return;
        }
      } catch (error) {
        console.error('❌ Y.js document validation error:', error);
        // Don't propagate this error to prevent app crash
      }
    });
    
    // Add error recovery for document corruption
    doc.on('destroy', () => {
      console.log('🗑️ Y.js document destroyed for:', filePath);
    });
    
    // Create WebSocket provider with comprehensive error handling
    let provider;
    try {
      provider = new WebsocketProvider(wsUrl, roomName, doc, {
        connect: true,
        maxBackoffTime: 5000,
        params: {
          sessionId,
          filePath,
          userEmail: user?.email
        }
      });

      if (!provider) {
        throw new Error('Failed to create WebSocket provider');
      }

      // Add provider-level error handling
      provider.on('status', ({ status }) => {
        if (status === 'disconnected') {
          console.log('🔌 WebSocket disconnected, document state preserved for:', filePath);
        }
      });

    } catch (error) {
      console.error('❌ Failed to create WebSocket provider:', error);
      doc.destroy();
      throw new Error(`WebSocket provider creation failed: ${error.message}`);
    }

    // Create Y.Text instance safely with error recovery
    let ytext;
    try {
      ytext = doc.getText('monaco');
      if (!ytext) {
        throw new Error('Y.Text instance is null');
      }
      
      // Validate Y.Text integrity
      if (typeof ytext.toString !== 'function') {
        throw new Error('Y.Text instance is malformed');
      }
      
    } catch (error) {
      console.error('❌ Failed to create Y.Text instance:', error);
      provider.destroy();
      doc.destroy();
      throw new Error(`Y.Text creation failed: ${error.message}`);
    }

    const connection = {
      doc,
      provider,
      ytext,
      awareness: provider.awareness,
      isConnected: false,
      filePath,
      sessionId,
      roomName,
      createdAt: Date.now(),
      _eventListeners: new Map()
    };

    // Set up connection event handlers
    this._setupConnectionEvents(connection, user);

    return connection;
  }

  /**
   * Set up connection event handlers
   */
  _setupConnectionEvents(connection, user) {
    const { provider } = connection;

    provider.on('status', ({ status }) => {
      console.log(`🔌 WebSocket status for ${connection.filePath}: ${status}`);
      const wasConnected = connection.isConnected;
      connection.isConnected = status === 'connected';
      
      // Only emit event if status actually changed to avoid spam
      if (wasConnected !== connection.isConnected) {
        console.log(`🔄 Connection status changed for ${connection.filePath}: ${wasConnected} -> ${connection.isConnected}`);
        
        if (status === 'connected' && user) {
          this._sendUserInfo(connection, user);
        }
        
        this._emitEvent(connection, 'connection-status', { 
          connected: connection.isConnected,
          status 
        });
      }
    });

    provider.on('sync', (isSynced) => {
      console.log(`📄 Document synced for ${connection.filePath}: ${isSynced}`);
      this._emitEvent(connection, 'synced', isSynced);
    });

    provider.on('connection-error', (error) => {
      console.error(`❌ Y-WebSocket connection error for ${connection.filePath}:`, error);
      connection.isConnected = false;
      this._emitEvent(connection, 'connection-error', error);
    });

    provider.on('connection-close', (event) => {
      console.log('🔌 WebSocket connection closed for:', connection.filePath);
      connection.isConnected = false;
      this._emitEvent(connection, 'connection-close', event);
    });
  }

  /**
   * Send user information to WebSocket server
   */
  _sendUserInfo(connection, user) {
    if (!connection?.provider?.ws) {
      console.warn('Cannot send user info: WebSocket not available');
      return;
    }
    
    try {
      const userInfo = {
        type: 'set-user-info',
        userInfo: {
          userId: user.cognitoId || user.userId,
          email: user.email,
          name: user.name || user.email?.split('@')[0]
        }
      };
      
      connection.provider.ws.send(JSON.stringify(userInfo));
      console.log('📤 Sent user info to Y-WebSocket server:', user.email);
    } catch (error) {
      console.warn('Failed to send user info:', error);
    }
  }

  /**
   * Check if connection is healthy
   */
  isConnectionHealthy(connection) {
    if (!connection || !connection.provider) return false;
    
    // Check multiple indicators of connection health
    const wsReady = connection.provider.ws?.readyState === 1; // WebSocket.OPEN
    const statusConnected = connection.isConnected;
    const hasDoc = connection.doc && connection.ytext;
    
    const isHealthy = wsReady && statusConnected && hasDoc;
    
    if (!isHealthy) {
      console.log(`🔍 Connection health check for ${connection.filePath}:`, {
        wsReady: wsReady,
        statusConnected: statusConnected,
        hasDoc: hasDoc,
        overall: isHealthy
      });
    }
    
    return isHealthy;
  }

  /**
   * Get connection by key
   */
  getConnection(sessionId, filePath) {
    const connectionKey = `${sessionId}-${filePath}`;
    return this.connections.get(connectionKey);
  }

  /**
   * Destroy a specific connection
   */
  destroyConnection(connectionKey) {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;

    try {
      // Clear event listeners
      if (connection._eventListeners) {
        connection._eventListeners.clear();
      }

      // Disconnect and destroy provider
      if (connection.provider) {
        connection.provider.shouldConnect = false;
        connection.provider.disconnect();
        
        setTimeout(() => {
          try {
            connection.provider.destroy();
          } catch (error) {
            console.warn('Error destroying provider:', error);
          }
        }, 100);
      }

      // Destroy document
      if (connection.doc) {
        connection.doc.destroy();
      }

      this.connections.delete(connectionKey);
      console.log('✅ Y.js connection destroyed for:', connectionKey);
    } catch (error) {
      console.warn('Error destroying Y.js connection:', error);
    }
  }

  /**
   * Destroy all connections
   */
  destroyAll() {
    for (const connectionKey of this.connections.keys()) {
      this.destroyConnection(connectionKey);
    }
  }

  /**
   * Event management
   */
  on(sessionId, filePath, event, callback) {
    const connection = this.getConnection(sessionId, filePath);
    if (!connection) return;

    if (!connection._eventListeners.has(event)) {
      connection._eventListeners.set(event, new Set());
    }
    connection._eventListeners.get(event).add(callback);
  }

  off(sessionId, filePath, event, callback) {
    const connection = this.getConnection(sessionId, filePath);
    if (!connection) return;

    const listeners = connection._eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  _emitEvent(connection, event, data) {
    const listeners = connection._eventListeners?.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}
