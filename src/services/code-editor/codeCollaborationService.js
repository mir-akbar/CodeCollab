/**
 * Refactored Code Collaboration Service
 * Orchestrates collaboration using focused managers
 */

import { YjsConnectionManager } from './core/YjsConnectionManager.js';
import { MonacoBindingManager } from './core/MonacoBindingManager.js';
import { UserPresenceManager } from './core/UserPresenceManager.js';
import { CursorStyleManager } from './core/CursorStyleManager.js';

class CodeCollaborationService {
  constructor() {
    this.connectionManager = new YjsConnectionManager();
    this.bindingManager = new MonacoBindingManager();
    this.presenceManager = new UserPresenceManager();
    this.cursorStyleManager = new CursorStyleManager();
  }

  /**
   * Connect to collaborative editing for a specific file
   */
  async connect(sessionId, filePath, user) {
    try {
      const connection = await this.connectionManager.createConnection(sessionId, filePath, user);
      
      // Set user presence
      this.presenceManager.setUserPresence(connection, user);
      
      return connection;
    } catch (error) {
      console.error('Error initializing code collaboration:', error);
      
      // Return a mock connection to prevent UI crashes
      return {
        doc: null,
        provider: null,
        ytext: null,
        awareness: null,
        isConnected: false,
        filePath,
        sessionId,
        createdAt: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * Create Monaco binding for real-time collaboration
   */
  createMonacoBinding(sessionId, filePath, editor, onContentChange) {
    const connection = this.connectionManager.getConnection(sessionId, filePath);
    
    if (!connection || !editor) {
      console.warn('Cannot create Monaco binding: missing connection or editor');
      return null;
    }

    // Create the binding
    const binding = this.bindingManager.createBinding(connection, editor, onContentChange);
    if (!binding) {
      return null;
    }

    // Set up user presence refresh
    const userState = connection.awareness?.getLocalState();
    if (userState?.user) {
      console.log('👤 Refreshing user presence before binding creation:', userState.user.name);
      connection.awareness.setLocalStateField('user', {
        ...userState.user,
        timestamp: Date.now()
      });
    }

    // Inject cursor styles for existing users
    if (connection.awareness) {
      const currentStates = connection.awareness.getStates();
      this.cursorStyleManager.injectStylesForExistingUsers(currentStates);
    }

    // Set up cursor observation
    this.presenceManager.setupCursorObservation(connection, editor);

    // Set up cursor tracking
    this.presenceManager.setupCursorTracking(connection, editor);

    // Set up awareness monitoring
    this.presenceManager.setupAwarenessMonitoring(connection, (awarenessData) => {
      // Handle cursor style updates
      this.cursorStyleManager.handleAwarenessChange(awarenessData, awarenessData.userStates);
      
      // Emit event for UI updates
      this._emitEvent(connection, 'awareness-changed', awarenessData);
    });

    console.log('✅ Monaco binding created for:', filePath);
    return binding;
  }

  /**
   * Initialize content in YJS document
   */
  async initializeContent(sessionId, filePath, content) {
    const connection = this.connectionManager.getConnection(sessionId, filePath);
    if (!connection) {
      console.warn('No connection found for content initialization:', `${sessionId}-${filePath}`);
      return false;
    }

    return await this.bindingManager.initializeContent(connection, content);
  }

  /**
   * Get current document content
   */
  getContent(sessionId, filePath) {
    const connection = this.connectionManager.getConnection(sessionId, filePath);
    if (!connection) return '';
    
    return this.bindingManager.getContent(connection);
  }

  /**
   * Get online users for a file
   */
  getOnlineUsers(sessionId, filePath) {
    const connection = this.connectionManager.getConnection(sessionId, filePath);
    if (!connection) return [];

    return this.presenceManager.getOnlineUsers(connection);
  }

  /**
   * Event listener management
   */
  on(sessionId, filePath, event, callback) {
    this.connectionManager.on(sessionId, filePath, event, callback);
  }

  off(sessionId, filePath, event, callback) {
    this.connectionManager.off(sessionId, filePath, event, callback);
  }

  /**
   * Disconnect from collaboration
   */
  disconnect(sessionId, filePath) {
    console.log('🧹 Disconnecting collaboration for:', `${sessionId}-${filePath}`);
    
    // Get connection before cleanup
    const connection = this.connectionManager.getConnection(sessionId, filePath);
    
    // Clean up binding
    this.bindingManager.destroyBinding(sessionId, filePath, connection);

    // Clean up cursor observers
    this.presenceManager.cleanupCursorObserver(sessionId, filePath);

    // Clean up cursor styles
    if (connection?.awareness) {
      const userStates = connection.awareness.getStates();
      userStates.forEach((state, clientId) => {
        this.cursorStyleManager.removeUserCursorStyle(clientId);
      });
    }

    // Clean up connection
    this.connectionManager.destroyConnection(`${sessionId}-${filePath}`);

    console.log('✅ Collaboration disconnected for:', filePath);
  }

  /**
   * Disconnect all connections
   */
  disconnectAll() {
    // Clean up all managers
    this.bindingManager.destroyAll();
    this.presenceManager.cleanupAllCursorObservers();
    this.cursorStyleManager.cleanupAllStyles();
    this.connectionManager.destroyAll();
  }

  /**
   * Check connection status
   */
  isConnected(sessionId, filePath) {
    const connection = this.connectionManager.getConnection(sessionId, filePath);
    return connection ? connection.isConnected : false;
  }

  /**
   * Send user information to WebSocket server
   */
  sendUserInfo(sessionId, filePath, user) {
    const connection = this.connectionManager.getConnection(sessionId, filePath);
    if (connection) {
      this.connectionManager._sendUserInfo(connection, user);
    }
  }

  /**
   * Get all connections (for hooks that need direct access)
   */
  get connections() {
    return this.connectionManager.connections;
  }

  /**
   * Get all connections for a specific session
   */
  getSessionConnections(sessionId) {
    const sessionConnections = new Map();
    this.connectionManager.connections.forEach((connection, connectionKey) => {
      if (connection.sessionId === sessionId) {
        sessionConnections.set(connectionKey, connection);
      }
    });
    return sessionConnections;
  }

  /**
   * Emit events through connection manager
   */
  _emitEvent(connection, event, data) {
    this.connectionManager._emitEvent(connection, event, data);
  }
}

// Export singleton instance
export const codeCollaborationService = new CodeCollaborationService();
export default codeCollaborationService;
