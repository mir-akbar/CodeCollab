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
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // Get WebSocket URL from environment or default to localhost
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/yjs-websocket';
    
    // Create y-websocket provider with better error handling
    this.provider = new WebsocketProvider(wsUrl, roomName, doc, {
      awareness: awareness,
      maxBackoffTime: 5000,
      connectTimeout: 30000,
      params: {
        room: roomName,
        timestamp: Date.now()
      }
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
      console.log(`🔌 WebSocket status: ${status} for room: ${this.room}`);
      
      if (status === 'connected') {
        this.connecting = false;
        this.reconnectAttempts = 0; // Reset on successful connection
        this.emit('status', { status: 'connected' });
      } else if (status === 'connecting') {
        this.connecting = true;
        this.emit('status', { status: 'connecting' });
      } else if (status === 'disconnected') {
        this.connecting = false;
        this.handleDisconnection();
        this.emit('status', { status: 'disconnected' });
      }
    });

    // Handle sync status
    this.provider.on('synced', () => {
      console.log('✅ Document synced for room:', this.room);
      this.synced = true;
      this.emit('synced');
    });

    // Handle connection events
    this.provider.on('connection-close', (event) => {
      console.log('🔌 WebSocket connection closed for room:', this.room, event);
      this.handleConnectionClose(event);
      this.emit('connection-close');
    });

    this.provider.on('connection-error', (error) => {
      console.error('❌ WebSocket connection error for room:', this.room, error);
      this.handleConnectionError(error);
      this.emit('connection-error', error);
    });
  }

  handleDisconnection() {
    if (this.destroyed) return;
    
    this.reconnectAttempts++;
    console.log(`🔄 Handling disconnection (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) for room:`, this.room);
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
      console.log(`⏰ Scheduling reconnection in ${delay}ms for room:`, this.room);
      
      setTimeout(() => {
        if (!this.destroyed && this.provider) {
          try {
            this.provider.connect();
          } catch (error) {
            console.error('❌ Error during reconnection attempt:', error);
          }
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached for room:', this.room);
      this.emit('max-reconnect-attempts');
    }
  }

  handleConnectionClose(event) {
    if (this.destroyed) return;
    
    // Only attempt reconnection for abnormal closures
    if (event && event.code !== 1000) { // 1000 = normal closure
      console.log('🔄 Abnormal connection close, attempting reconnection for room:', this.room);
      this.handleDisconnection();
    }
  }

  handleConnectionError(error) {
    if (this.destroyed) return;
    
    console.error('💥 Connection error for room:', this.room, error);
    
    // Emit error but don't auto-reconnect for certain errors
    const isRetryableError = !error.message?.includes('401') && !error.message?.includes('403');
    
    if (isRetryableError) {
      this.handleDisconnection();
    } else {
      console.error('❌ Non-retryable error, not attempting reconnection:', error.message);
      this.emit('fatal-error', error);
    }
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
