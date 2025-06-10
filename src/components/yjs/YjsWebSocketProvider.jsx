/**
 * Y-WebSocket Provider Wrapper
 * Drop-in replacement for SocketIOProvider using official y-websocket
 */

import { WebsocketProvider } from 'y-websocket';
import { injectUserCursorStyles, removeUserCursorStyles } from '../../utils/cursorStyles';

export class YjsWebSocketProvider {
  constructor(roomName, socket, doc, awareness) {
    this.doc = doc;
    this.room = roomName;
    this.awareness = awareness;
    this.synced = false;
    this.connecting = false;
    this.listeners = new Map(); // Simple event system
    this.destroyed = false;
    
    // Get WebSocket URL from environment or default to localhost
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/yjs-websocket';
    
    // Create y-websocket provider
    this.provider = new WebsocketProvider(wsUrl, roomName, doc, {
      awareness: awareness,
      maxBackoffTime: 5000,
      connectTimeout: 30000
    });
    
    // Set up awareness event listeners for cursor styling
    this.setupAwarenessListeners();
    
    // Set up provider event listeners
    this.setupProviderListeners();
    
    console.log('🔌 YjsWebSocketProvider created for room:', roomName);
  }

  // Simple event system (compatibility with SocketIOProvider)
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
  }

  setupProviderListeners() {
    // Handle connection status
    this.provider.on('status', ({ status }) => {
      console.log(`🔌 WebSocket status: ${status}`);
      
      if (status === 'connected') {
        this.connecting = false;
        this.emit('status', { status: 'connected' });
      } else if (status === 'connecting') {
        this.connecting = true;
        this.emit('status', { status: 'connecting' });
      } else if (status === 'disconnected') {
        this.connecting = false;
        this.emit('status', { status: 'disconnected' });
      }
    });

    // Handle sync status
    this.provider.on('synced', () => {
      console.log('✅ Document synced');
      this.synced = true;
      this.emit('synced');
    });

    // Handle connection events
    this.provider.on('connection-close', () => {
      console.log('🔌 WebSocket connection closed');
      this.emit('connection-close');
    });

    this.provider.on('connection-error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.emit('connection-error', error);
    });
  }

  // Compatibility methods
  connect() {
    // y-websocket handles connection automatically
    if (this.provider && !this.destroyed) {
      this.provider.connect();
    }
  }

  disconnect() {
    if (this.provider && !this.destroyed) {
      this.provider.disconnect();
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    
    try {
      // Destroy the provider
      if (this.provider) {
        this.provider.destroy();
      }
      
      // Clear listeners
      this.listeners.clear();
      
      console.log('🔌 YjsWebSocketProvider destroyed for room:', this.room);
    } catch (error) {
      console.error('Error during YjsWebSocketProvider cleanup:', error);
    }
  }

  // Getter for backward compatibility
  get socket() {
    return this.provider?.ws;
  }
}
