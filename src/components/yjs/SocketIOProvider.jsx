import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';
import { injectUserCursorStyles, removeUserCursorStyles, cleanupAllCursorStyles } from '../../utils/cursorStyles';

export class SocketIOProvider {
  constructor(roomName, socket, doc, awareness) {
    this.doc = doc;
    this.room = roomName;
    this.socket = socket;    this.awareness = awareness || new Awareness(doc);
    this.synced = false;
    this.connecting = false;
    this.listeners = new Map(); // Simple event system
    this.destroyed = false; // Track if already destroyed
    
    // Store event handlers for proper cleanup
    this.yjsHandlers = new Map();
    this.socketHandlers = new Map();
    
    // Set up awareness event listeners for cursor styling
    this.setupAwarenessListeners();
    
    console.log('🔌 SocketIOProvider created for room:', roomName);

    this.connect();
  }
  // Simple event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  setupAwarenessListeners() {
    const awarenessUpdateHandler = ({ added, updated, removed }) => {
      // Update cursor styles for added/updated users
      [...added, ...updated].forEach(clientId => {
        const state = this.awareness.getStates().get(clientId);
        if (state && state.user) {
          injectUserCursorStyles(clientId, state.user);
        }
      });
      
      // Remove cursor styles for removed users
      removed.forEach(clientId => {
        removeUserCursorStyles(clientId);
      });
      
      console.log('👥 Awareness updated:', {
        added: added.length,
        updated: updated.length,
        removed: removed.length,
        total: this.awareness.getStates().size
      });
    };
    
    this.awareness.on('update', awarenessUpdateHandler);
    this.yjsHandlers.set('awareness-listener', awarenessUpdateHandler);
  }
  connect() {
    if (this.connecting || this.destroyed) return;
    this.connecting = true;

    // Join the YJS room
    this.socket.emit('yjs-join-room', { room: this.room });

    // Store socket event handlers for cleanup
    const yjsUpdateHandler = ({ update, origin }) => {
      if (origin !== this.socket.id) {
        try {
          Y.applyUpdate(this.doc, new Uint8Array(update));
        } catch (error) {
          console.error('Error applying YJS update:', error);
        }
      }
    };
    
    const awarenessUpdateHandler = ({ update, origin }) => {
      if (origin !== this.socket.id) {
        try {
          applyAwarenessUpdate(this.awareness, new Uint8Array(update), origin);
        } catch (error) {
          console.error('Error applying awareness update:', error);
        }
      }
    };
    
    const syncResponseHandler = ({ content }) => {
      if (content && !this.synced) {
        try {
          Y.applyUpdate(this.doc, new Uint8Array(content));
          this.synced = true;
          this.emit('synced');
        } catch (error) {
          console.error('Error applying sync response:', error);
          // Mark as synced anyway to prevent hanging
          this.synced = true;
          this.emit('synced');
        }
      } else if (!content && !this.synced) {
        // Empty document, mark as synced
        this.synced = true;
        this.emit('synced');
      }
    };
    
    // Attach socket event handlers
    this.socket.on('yjs-update', yjsUpdateHandler);
    this.socket.on('yjs-awareness-update', awarenessUpdateHandler);
    this.socket.on('yjs-sync-response', syncResponseHandler);
    
    // Store handlers for cleanup
    this.socketHandlers.set('yjs-update', yjsUpdateHandler);
    this.socketHandlers.set('yjs-awareness-update', awarenessUpdateHandler);
    this.socketHandlers.set('yjs-sync-response', syncResponseHandler);    // Store YJS event handlers for cleanup
    const docUpdateHandler = (update, origin) => {
      if (origin !== this && this.socket.connected && !this.destroyed) {
        try {
          this.socket.emit('yjs-update', {
            room: this.room,
            update: Array.from(update),
            origin: this.socket.id
          });
        } catch (error) {
          console.error('Error broadcasting YJS update:', error);
        }
      }
    };
    
    const awarenessChangeHandler = ({ added, updated, removed }, origin) => {
      if (origin !== this.socket.id && this.socket.connected && !this.destroyed) {
        const changedClients = added.concat(updated).concat(removed);
        if (changedClients.length > 0) {
          try {
            // Use the correct awareness API
            const update = encodeAwarenessUpdate(this.awareness, changedClients);
            this.socket.emit('yjs-awareness-update', {
              room: this.room,
              update: Array.from(update),
              origin: this.socket.id
            });
          } catch (error) {
            console.error('Error encoding awareness update:', error);
            // Fallback: send all awareness states
            try {
              const allClients = Array.from(this.awareness.getStates().keys());
              const fullUpdate = encodeAwarenessUpdate(this.awareness, allClients);
              this.socket.emit('yjs-awareness-update', {
                room: this.room,
                update: Array.from(fullUpdate),
                origin: this.socket.id
              });
            } catch (fallbackError) {
              console.error('Fallback awareness encoding also failed:', fallbackError);
            }
          }
        }
      }
    };

    // Attach YJS event handlers
    this.doc.on('update', docUpdateHandler);
    this.awareness.on('update', awarenessChangeHandler);
    
    // Store handlers for cleanup
    this.yjsHandlers.set('doc-update', docUpdateHandler);
    this.yjsHandlers.set('awareness-update', awarenessChangeHandler);

    // Request initial sync
    this.socket.emit('yjs-request-sync', { room: this.room });
    this.connecting = false;
  }  destroy() {
    if (this.destroyed) return; // Prevent double destruction
    this.destroyed = true;
    
    try {
      // Clean up socket event handlers
      for (const [event, handler] of this.socketHandlers) {
        this.socket.off(event, handler);
      }
      this.socketHandlers.clear();
      
      // Clean up YJS event handlers safely
      if (this.yjsHandlers.has('doc-update') && this.doc) {
        try {
          this.doc.off('update', this.yjsHandlers.get('doc-update'));
        } catch (error) {
          console.warn('Could not remove doc update handler:', error.message);
        }
      }
      
      if (this.yjsHandlers.has('awareness-update') && this.awareness) {
        try {
          this.awareness.off('update', this.yjsHandlers.get('awareness-update'));
        } catch (error) {
          console.warn('Could not remove awareness update handler:', error.message);
        }
      }
      this.yjsHandlers.clear();
      
      // Leave the room
      if (this.socket && this.socket.connected) {
        this.socket.emit('yjs-leave-room', { room: this.room });
      }
      
      // Clean up awareness
      if (this.awareness && typeof this.awareness.destroy === 'function') {
        try {
          this.awareness.destroy();
        } catch (error) {
          console.warn('Could not destroy awareness:', error.message);
        }
      }
      
      // Clear custom listeners
      this.listeners.clear();
      
      console.log('🔌 SocketIOProvider destroyed for room:', this.room);
    } catch (error) {
      console.error('Error during SocketIOProvider cleanup:', error);
    }
  }
}
