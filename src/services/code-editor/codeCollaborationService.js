/**
 * Code Collaboration Service
 * Handles real-time code collaboration using Y-WebSocket
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { injectUserCursorStyles, removeUserCursorStyles, updateCursorElements } from '@/utils/cursorStyles';

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

    // Ensure user presence is set BEFORE creating binding to prevent label flickering
    const userState = connection.awareness.getLocalState();
    if (userState?.user) {
      console.log('👤 Refreshing user presence before binding creation:', userState.user.name);
      // Force refresh of local awareness state
      connection.awareness.setLocalStateField('user', {
        ...userState.user,
        timestamp: Date.now()
      });
    }

    // Create new binding with enhanced awareness configuration
    const binding = new MonacoBinding(
      connection.ytext,
      editor.getModel(),
      new Set([editor]),
      connection.awareness
    );

    this.bindings.set(connectionKey, binding);

    // Immediately inject cursor styles for all existing users to prevent flickering
    const currentStates = connection.awareness.getStates();
    currentStates.forEach((state, clientId) => {
      if (state?.user) {
        console.log('🎨 Injecting immediate cursor style for client:', clientId, state.user.name);
        this.injectUserCursorStyle(clientId, state.user);
      }
    });

    // Also update cursor elements immediately
    requestAnimationFrame(() => {
      this.updateAllCursorElements(currentStates);
    });

    // Set up MutationObserver to catch new cursor elements and label them immediately
    const editorElement = editor.getDomNode();
    if (editorElement && !this.cursorObservers?.has(connectionKey)) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if this node or its children contain cursor elements
              const newCursorElements = node.classList?.contains('yRemoteSelectionHead') 
                ? [node] 
                : node.querySelectorAll?.('.yRemoteSelectionHead') || [];
              
              // Immediately set data attributes for new cursor elements
              [...newCursorElements].forEach(cursorElement => {
                const clientId = Array.from(cursorElement.classList)
                  .find(cls => cls.startsWith('yRemoteSelectionHead-'))
                  ?.replace('yRemoteSelectionHead-', '');
                
                if (clientId && !cursorElement.hasAttribute('data-user-name')) {
                  const userState = connection.awareness.getStates().get(parseInt(clientId));
                  const userName = userState?.user?.name || 'Anonymous';
                  cursorElement.setAttribute('data-user-name', userName);
                  console.log(`⚡ Immediately labeled new cursor for client ${clientId}: ${userName}`);
                }
              });
            }
          });
        });
      });
      
      observer.observe(editorElement, {
        childList: true,
        subtree: true
      });
      
      // Store observer for cleanup
      if (!this.cursorObservers) this.cursorObservers = new Map();
      this.cursorObservers.set(connectionKey, observer);
    }

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

    // Enhanced cursor tracking with user information
    const updateCursor = () => {
      if (connection.awareness && editor) {
        const selection = editor.getSelection();
        
        // Get current user info
        const userState = connection.awareness.getLocalState();
        const userName = userState?.user?.name || 'Anonymous';
        
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
        
        // Ensure user info is maintained
        if (userState?.user) {
          connection.awareness.setLocalStateField('user', {
            ...userState.user,
            name: userName
          });
        }
      }
    };

    editor.onDidChangeCursorPosition(updateCursor);
    editor.onDidChangeCursorSelection(updateCursor);

    // Set up awareness state monitoring for debugging and cursor styling
    connection.awareness.on('change', (changes) => {
      console.log('👥 Awareness state changed for', filePath, ':', {
        added: Array.from(changes.added),
        updated: Array.from(changes.updated), 
        removed: Array.from(changes.removed),
        states: Array.from(connection.awareness.getStates().entries()).map(([clientId, state]) => ({
          clientId,
          user: state.user,
          cursor: state.cursor
        }))
      });
      
      // Update cursor styles for all users
      const userStates = connection.awareness.getStates();
      
      // Inject styles for new/updated users
      changes.added.forEach(clientId => {
        const state = userStates.get(clientId);
        if (state?.user) {
          this.injectUserCursorStyle(clientId, state.user);
        }
      });
      
      changes.updated.forEach(clientId => {
        const state = userStates.get(clientId);
        if (state?.user) {
          this.injectUserCursorStyle(clientId, state.user);
        }
      });
      
      // Remove styles for disconnected users
      changes.removed.forEach(clientId => {
        this.removeUserCursorStyle(clientId);
      });
      
      // Update cursor DOM elements with user names using requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        this.updateAllCursorElements(userStates);
      });
    });

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
      const userName = user.name || user.email?.split('@')[0] || 'Anonymous';
      const userColor = this.stringToColor(user.email || user.name);
      
      const userInfo = {
        name: userName,
        email: user.email,
        color: userColor,
        colorLight: userColor + '33', // Add transparency for selections
        timestamp: Date.now()
      };
      
      connection.awareness.setLocalStateField('user', userInfo);
      
      console.log('👤 Set user presence for collaboration:', {
        connectionKey,
        user: userInfo
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

    // Clean up cursor observer
    if (this.cursorObservers?.has(connectionKey)) {
      const observer = this.cursorObservers.get(connectionKey);
      observer.disconnect();
      this.cursorObservers.delete(connectionKey);
      console.log('🧹 Cleaned up cursor observer for:', connectionKey);
    }

    // Clean up connection and cursor styles
    const connection = this.connections.get(connectionKey);
    if (connection) {
      try {
        // Clean up cursor styles for all users in this connection
        if (connection.awareness) {
          const userStates = connection.awareness.getStates();
          userStates.forEach((state, clientId) => {
            this.removeUserCursorStyle(clientId);
          });
        }
        
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
    
    // Clean up any remaining cursor observers
    if (this.cursorObservers) {
      this.cursorObservers.forEach(observer => observer.disconnect());
      this.cursorObservers.clear();
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

  /**
   * Inject user-specific cursor styles
   */
  injectUserCursorStyle(clientId, userInfo) {
    if (typeof injectUserCursorStyles !== 'undefined') {
      injectUserCursorStyles(clientId, userInfo);
    } else {
      // Fallback implementation
      this.injectUserCursorStyleFallback(clientId, userInfo);
    }
  }

  /**
   * Remove user cursor styles
   */
  removeUserCursorStyle(clientId) {
    if (typeof removeUserCursorStyles !== 'undefined') {
      removeUserCursorStyles(clientId);
    } else {
      // Fallback implementation
      this.removeUserCursorStyleFallback(clientId);
    }
  }

  /**
   * Update all cursor DOM elements
   */
  updateAllCursorElements(userStates) {
    if (typeof updateCursorElements !== 'undefined') {
      updateCursorElements(userStates);
    } else {
      // Fallback implementation
      this.updateCursorElementsFallback(userStates);
    }
  }

  /**
   * Fallback cursor style injection
   */
  injectUserCursorStyleFallback(clientId, userInfo) {
    const styleId = `yjs-cursor-style-${clientId}`;
    
    // Remove existing style
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    if (!userInfo?.color) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    
    const color = userInfo.color;
    const lightColor = userInfo.colorLight || (color + '33');
    const userName = userInfo.name || 'Anonymous';
    
    style.innerHTML = `
      .yRemoteSelection-${clientId} {
        background-color: ${lightColor} !important;
      }
      
      .yRemoteSelectionHead-${clientId} {
        background-color: ${color} !important;
        border-left-color: ${color} !important;
      }
      
      .yRemoteSelectionHead-${clientId}::after {
        /* Let CSS attr() handle the content - this prevents flickering */
        background-color: ${color};
        color: ${this.isLightColor(color) ? '#333' : 'white'};
        position: absolute;
        top: -1.3em;
        left: -2px;
        font-size: 0.7em;
        font-weight: 500;
        padding: 2px 6px;
        border-radius: 3px;
        white-space: nowrap;
        z-index: 1001;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    
    document.head.appendChild(style);
    console.log(`💅 Injected cursor styles for ${userName} (${clientId}):`, color);
  }

  /**
   * Fallback cursor style removal
   */
  removeUserCursorStyleFallback(clientId) {
    const styleId = `yjs-cursor-style-${clientId}`;
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
      console.log(`🗑️ Removed cursor styles for client ${clientId}`);
    }
  }

  /**
   * Fallback cursor element update
   */
  updateCursorElementsFallback(userStates) {
    // Find all cursor elements and update their data attributes
    const cursorElements = document.querySelectorAll('.yRemoteSelectionHead');
    
    cursorElements.forEach((element) => {
      const clientId = Array.from(element.classList)
        .find(cls => cls.startsWith('yRemoteSelectionHead-'))
        ?.replace('yRemoteSelectionHead-', '');
      
      if (clientId && userStates.has(parseInt(clientId))) {
        const userState = userStates.get(parseInt(clientId));
        const userName = userState?.user?.name || 'Anonymous';
        
        // Set data attribute for CSS immediately to prevent "User" fallback
        element.setAttribute('data-user-name', userName);
        console.log(`🏷️ Set cursor label for client ${clientId}: ${userName}`);
      }
    });
    
    // Also check for any cursor elements without data-user-name and fix them
    const unlabeledCursors = document.querySelectorAll('.yRemoteSelectionHead:not([data-user-name])');
    if (unlabeledCursors.length > 0) {
      console.log(`🔍 Found ${unlabeledCursors.length} unlabeled cursor elements, setting fallback`);
      unlabeledCursors.forEach(element => {
        // Set a temporary label to prevent flickering
        element.setAttribute('data-user-name', 'Anonymous');
      });
    }
  }

  /**
   * Check if color is light (for text contrast)
   */
  isLightColor(color) {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 155;
    }
    return false;
  }
}

// Export singleton instance
export const codeCollaborationService = new CodeCollaborationService();
export default codeCollaborationService;
