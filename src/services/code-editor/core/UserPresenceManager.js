/**
 * User Presence Manager
 * Handles user awareness, presence, and cursor management
 */

export class UserPresenceManager {
  constructor() {
    this.cursorObservers = new Map();
  }

  /**
   * Set user presence for collaboration
   */
  setUserPresence(connection, user) {
    if (!connection?.awareness) return;

    try {
      const userName = user.name || user.email?.split('@')[0] || 'Anonymous';
      const userColor = this._stringToColor(user.email || user.name);
      
      const userInfo = {
        name: userName,
        email: user.email,
        color: userColor,
        colorLight: userColor + '33', // Add transparency for selections
        timestamp: Date.now()
      };
      
      connection.awareness.setLocalStateField('user', userInfo);
      
      console.log('👤 Set user presence for collaboration:', {
        filePath: connection.filePath,
        user: userInfo
      });

      return userInfo;
    } catch (error) {
      console.error('Error setting user presence:', error);
      return null;
    }
  }

  /**
   * Get online users for a connection
   */
  getOnlineUsers(connection) {
    if (!connection?.awareness) return [];

    const users = [];
    const awarenessStates = connection.awareness.getStates();
    console.log('👥 [UserPresenceManager] Getting users for file:', connection.filePath);
    console.log('👥 [UserPresenceManager] Total awareness states for this file:', awarenessStates.size);
    
    awarenessStates.forEach((state, clientId) => {
      console.log('👤 [UserPresenceManager] Client', clientId, 'for file', connection.filePath, '- state:', state.user ? {
        email: state.user.email,
        name: state.user.name,
        timestamp: state.user.timestamp
      } : 'no user');
      
      if (state.user) {
        users.push(state.user);
      }
    });
    
    console.log('👥 [UserPresenceManager] Final user list for file', connection.filePath + ':', users.length, users.map(u => u.email || u.name));
    console.log('ℹ️  [NOTE] This count shows users actively viewing/editing THIS specific file, not the whole session');
    return users;
  }

  /**
   * Setup cursor tracking for editor
   */
  setupCursorTracking(connection, editor) {
    if (!connection?.awareness || !editor) return;

    // Enhanced cursor tracking with user information
    const updateCursor = () => {
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
    };

    editor.onDidChangeCursorPosition(updateCursor);
    editor.onDidChangeCursorSelection(updateCursor);

    return updateCursor;
  }

  /**
   * Setup awareness change monitoring
   */
  setupAwarenessMonitoring(connection, onAwarenessChange) {
    if (!connection?.awareness) return;

    const awarenessHandler = (changes) => {
      // Only log significant changes (added/removed users, not cursor movements)
      if (changes.added.size > 0 || changes.removed.size > 0) {
        console.log('👥 Awareness state changed for', connection.filePath, ':', {
          added: Array.from(changes.added),
          updated: Array.from(changes.updated), 
          removed: Array.from(changes.removed),
          states: Array.from(connection.awareness.getStates().entries()).map(([clientId, state]) => ({
            clientId,
            user: state.user,
            cursor: state.cursor
          }))
        });
      }
      
      const userStates = connection.awareness.getStates();
      
      // Emit awareness-changed event for UI updates
      if (onAwarenessChange) {
        onAwarenessChange({
          added: Array.from(changes.added),
          updated: Array.from(changes.updated),
          removed: Array.from(changes.removed),
          totalUsers: userStates.size,
          userStates
        });
      }
    };

    connection.awareness.on('change', awarenessHandler);

    return awarenessHandler;
  }

  /**
   * Setup cursor observation for immediate labeling
   */
  setupCursorObservation(connection, editor) {
    const connectionKey = `${connection.sessionId}-${connection.filePath}`;
    const editorElement = editor.getDomNode();
    
    if (!editorElement || this.cursorObservers.has(connectionKey)) {
      return;
    }

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
    
    this.cursorObservers.set(connectionKey, observer);
    console.log('👁️ Set up cursor observer for:', connectionKey);
  }

  /**
   * Update cursor elements with user names
   */
  updateCursorElements(userStates) {
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
        element.setAttribute('data-user-name', 'Anonymous');
      });
    }
  }

  /**
   * Cleanup cursor observer
   */
  cleanupCursorObserver(sessionId, filePath) {
    const connectionKey = `${sessionId}-${filePath}`;
    
    if (this.cursorObservers.has(connectionKey)) {
      const observer = this.cursorObservers.get(connectionKey);
      observer.disconnect();
      this.cursorObservers.delete(connectionKey);
      console.log('🧹 Cleaned up cursor observer for:', connectionKey);
    }
  }

  /**
   * Cleanup all cursor observers
   */
  cleanupAllCursorObservers() {
    this.cursorObservers.forEach(observer => observer.disconnect());
    this.cursorObservers.clear();
  }

  /**
   * Generate color from string
   */
  _stringToColor(str) {
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
