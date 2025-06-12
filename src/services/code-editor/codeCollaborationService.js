/**
 * Code Collaboration Service
 * Handles real-time code collaboration using Y-WebSocket
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

class CodeCollaborationService {
  constructor() {
    this.connections = new Map(); // sessionId -> connection
    this.bindings = new Map(); // sessionId -> binding
  }

  /**
   * Connect to collaborative editing for a specific file
   */
  connect(sessionId, filePath, user) {
    const connectionKey = `${sessionId}-${filePath}`;
    
    try {
      // Check if connection already exists and is healthy
      if (this.connections.has(connectionKey)) {
        const existing = this.connections.get(connectionKey);
        if (existing.provider && existing.provider.ws && existing.provider.ws.readyState === 1) { // OPEN state
          console.log('🔄 Reusing existing healthy connection for:', filePath);
          return existing;
        } else {
          // Clean up unhealthy connection
          console.log('🧹 Cleaning up unhealthy connection for:', filePath);
          this.disconnect(sessionId, filePath);
        }
      }

      // Create YJS document for this file
      const doc = new Y.Doc();
      
      // Create proper room name as recommended by Y.js docs
      const roomName = `${sessionId}/${filePath.replace(/[/\\:]/g, '-')}`;
      
      // Create Y-WebSocket provider with consistent base URL
      const wsUrl = `ws://localhost:3001/yjs-websocket`;
      const provider = new WebsocketProvider(wsUrl, roomName, doc, {
        connect: true, // Connect automatically
        maxBackoffTime: 5000, // Recommended by docs
        params: {
          sessionId,
          filePath,
          userEmail: user?.email
        }
      });

      // Validate provider was created successfully
      if (!provider) {
        throw new Error('Failed to create WebSocket provider');
      }

      const connection = {
        doc,
        provider,
        ytext: doc.getText('monaco'),
        awareness: provider.awareness, // Use provider's awareness
        isConnected: false,
        listeners: new Map(),
        filePath,
        sessionId,
        roomName,
        createdAt: Date.now()
      };

      this.connections.set(connectionKey, connection);

      // Set up connection status tracking with error handling
      try {
        // Use Y.js documented event names
        provider.on('status', ({ status }) => {
          console.log(`🔌 WebSocket status for ${filePath}: ${status}`);
          connection.isConnected = status === 'connected';
          this.emit(connectionKey, 'connection-status', { 
            connected: connection.isConnected,
            status 
          });
          
          // Send user info when connected
          if (status === 'connected' && user) {
            this.sendUserInfo(connection, user);
          }
        });

        // Handle sync events as documented
        provider.on('sync', (isSynced) => {
          console.log(`📄 Document synced for ${filePath}: ${isSynced}`);
          this.emit(connectionKey, 'synced', isSynced);
        });

        // Handle connection events as documented
        provider.on('connection-close', (event) => {
          console.log('🔌 WebSocket connection closed for:', filePath);
          connection.isConnected = false;
          this.emit(connectionKey, 'connection-close', event);
          this.emit(connectionKey, 'connection-status', { 
            connected: false,
            status: 'disconnected' 
          });
        });

        provider.on('connection-error', (error) => {
          console.error('❌ WebSocket connection error for', filePath, ':', error);
          this.emit(connectionKey, 'connection-error', error);
          this.emit(connectionKey, 'error', error);
        });
      } catch (error) {
        console.error('Error setting up provider listeners:', error);
      }

      // Set user presence
      this.setUserPresence(connectionKey, user);

      return connection;
    } catch (error) {
      console.error('Error initializing code collaboration:', error);
      
      // Clean up any partial connection
      if (this.connections.has(connectionKey)) {
        this.disconnect(sessionId, filePath);
      }
      
      // Return a mock connection to prevent UI crashes
      return {
        doc: new Y.Doc(),
        provider: null,
        ytext: new Y.Doc().getText('monaco'),
        awareness: null,
        isConnected: false,
        listeners: new Map(),
        filePath,
        sessionId,
        createdAt: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * Send user information to the WebSocket server
   */
  sendUserInfo(connection, user) {
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
   * Create Monaco binding for real-time collaboration
   */
  createMonacoBinding(sessionId, filePath, editor, onContentChange) {
    const connectionKey = `${sessionId}-${filePath}`;
    const connection = this.connections.get(connectionKey);
    
    if (!connection || !editor) {
      console.warn('Cannot create Monaco binding: missing connection or editor');
      return null;
    }

    // Clean up existing binding
    if (this.bindings.has(connectionKey)) {
      const existingBinding = this.bindings.get(connectionKey);
      try {
        // Remove content observer if it exists
        if (existingBinding._contentObserver && connection.ytext) {
          connection.ytext.unobserve(existingBinding._contentObserver);
          delete existingBinding._contentObserver;
        }
        existingBinding.destroy();
      } catch (error) {
        console.warn('Error cleaning up existing binding:', error);
      }
    }

    // Create new binding
    const binding = new MonacoBinding(
      connection.ytext,
      editor.getModel(),
      new Set([editor]),
      connection.awareness
    );

    this.bindings.set(connectionKey, binding);

    // Set up content change listener
    if (onContentChange) {
      const contentObserver = (event, transaction) => {
        if (transaction.local) {
          const newContent = connection.ytext.toString();
          onContentChange(newContent);
        }
      };

      connection.ytext.observe(contentObserver);
      
      // Store observer for cleanup
      binding._contentObserver = contentObserver;
    }

    // Set up cursor tracking
    const updateCursor = () => {
      if (connection.awareness && editor) {
        const selection = editor.getSelection();
        connection.awareness.setLocalStateField('cursor', {
          anchor: {
            lineNumber: selection.startLineNumber,
            column: selection.startColumn
          },
          head: {
            lineNumber: selection.endLineNumber,
            column: selection.endColumn
          }
        });
      }
    };

    editor.onDidChangeCursorPosition(updateCursor);
    editor.onDidChangeCursorSelection(updateCursor);

    console.log('✅ Monaco binding created for:', filePath);
    return binding;
  }

  /**
   * Initialize content in YJS document (only if empty)
   */
  initializeContent(sessionId, filePath, content) {
    const connectionKey = `${sessionId}-${filePath}`;
    const connection = this.connections.get(connectionKey);
    
    if (!connection) return false;

    // Only initialize if document is empty
    if (connection.ytext.length === 0 && content && content.trim()) {
      console.log('📝 Initializing document content for:', filePath);
      connection.ytext.insert(0, content);
      return true;
    }
    
    return false;
  }

  /**
   * Get current document content
   */
  getContent(sessionId, filePath) {
    const connectionKey = `${sessionId}-${filePath}`;
    const connection = this.connections.get(connectionKey);
    
    if (!connection) return '';
    return connection.ytext.toString();
  }

  /**
   * Set user presence for collaboration
   */
  setUserPresence(connectionKey, user) {
    const connection = this.connections.get(connectionKey);
    if (!connection || !connection.awareness) return;

    try {
      connection.awareness.setLocalStateField('user', {
        name: user.name || user.email?.split('@')[0] || 'Anonymous',
        email: user.email,
        color: this.stringToColor(user.email || user.name),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error setting user presence:', error);
    }
  }

  /**
   * Get online users for a file
   */
  getOnlineUsers(sessionId, filePath) {
    const connectionKey = `${sessionId}-${filePath}`;
    const connection = this.connections.get(connectionKey);
    
    if (!connection || !connection.awareness) return [];

    const users = [];
    connection.awareness.getStates().forEach((state) => {
      if (state.user) {
        users.push(state.user);
      }
    });
    
    return users;
  }

  /**
   * Event listener management
   */
  on(connectionKey, event, callback) {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;

    if (!connection.listeners.has(event)) {
      connection.listeners.set(event, new Set());
    }
    connection.listeners.get(event).add(callback);
  }

  off(connectionKey, event, callback) {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;

    const listeners = connection.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  emit(connectionKey, event, data) {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;

    const listeners = connection.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Disconnect from collaboration
   */
  disconnect(sessionId, filePath) {
    const connectionKey = `${sessionId}-${filePath}`;
    
    console.log('🧹 Disconnecting collaboration for:', connectionKey);
    
    // Clean up binding first
    if (this.bindings.has(connectionKey)) {
      const binding = this.bindings.get(connectionKey);
      
      try {
        // Clean up content observer
        if (binding._contentObserver) {
          const connection = this.connections.get(connectionKey);
          if (connection && connection.ytext) {
            try {
              connection.ytext.unobserve(binding._contentObserver);
            } catch (error) {
              console.warn('Error removing ytext observer:', error);
            }
          }
          delete binding._contentObserver;
        }
        
        // Destroy the binding
        binding.destroy();
      } catch (error) {
        console.warn('Error destroying Monaco binding:', error);
      }
      
      this.bindings.delete(connectionKey);
    }

    // Clean up connection
    const connection = this.connections.get(connectionKey);
    if (connection) {
      try {
        // Clear all event listeners
        if (connection.listeners) {
          connection.listeners.clear();
        }
        
        // Properly disconnect and destroy provider following Y.js docs
        if (connection.provider) {
          try {
            // Set shouldConnect to false to prevent reconnection attempts
            connection.provider.shouldConnect = false;
            
            // Disconnect first
            connection.provider.disconnect();
            
            // Give it a moment to disconnect gracefully
            setTimeout(() => {
              try {
                // Then destroy the provider completely
                connection.provider.destroy();
              } catch (error) {
                console.warn('Error destroying provider:', error);
              }
            }, 100);
          } catch (error) {
            console.warn('Error disconnecting provider:', error);
          }
        }
        
        // Destroy document
        if (connection.doc) {
          try {
            connection.doc.destroy();
          } catch (error) {
            console.warn('Error destroying Y.Doc:', error);
          }
        }
      } catch (error) {
        console.warn('Error destroying collaboration connection:', error);
      }
      
      this.connections.delete(connectionKey);
      console.log('✅ Collaboration disconnected for:', filePath);
    }
  }

  /**
   * Disconnect all connections
   */
  disconnectAll() {
    for (const connectionKey of this.connections.keys()) {
      const [sessionId, filePath] = connectionKey.split('-', 2);
      this.disconnect(sessionId, filePath);
    }
  }

  /**
   * Check connection status
   */
  isConnected(sessionId, filePath) {
    const connectionKey = `${sessionId}-${filePath}`;
    const connection = this.connections.get(connectionKey);
    return connection ? connection.isConnected : false;
  }

  /**
   * Utility: Generate color from string
   */
  stringToColor(str) {
    if (!str) return '#888888';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = "#";
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += ("00" + value.toString(16)).slice(-2);
    }
    return color;
  }
}

// Export singleton instance
export const codeCollaborationService = new CodeCollaborationService();
export default codeCollaborationService;
