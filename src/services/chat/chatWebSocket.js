/**
 * Chat WebSocket Service
 * Handles real-time chat communication using Y-WebSocket
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

class ChatWebSocketService {
  constructor() {
    this.connections = new Map();
  }

  connect(sessionId) {
    if (this.connections.has(sessionId)) {
      return this.connections.get(sessionId);
    }

    // Create YJS document for chat
    const doc = new Y.Doc();
    const roomName = `chat-${sessionId}`;
    
    // Create Y-WebSocket provider with session-specific chat URL
    const wsUrl = `ws://localhost:3001/yjs-websocket/chat-${sessionId}`;
    const provider = new WebsocketProvider(wsUrl, roomName, doc);
    
    const connection = {
      doc,
      provider,
      messagesArray: doc.getArray('messages'),
      awareness: provider.awareness,
      isConnected: false,
      listeners: new Map()
    };

    this.connections.set(sessionId, connection);

    // Set up connection status
    const handleSynced = () => {
      connection.isConnected = true;
      this.emit(sessionId, 'connected', true);
    };

    const handleDisconnected = () => {
      connection.isConnected = false;
      this.emit(sessionId, 'connected', false);
    };

    // Listen for provider events
    provider.on('status', ({ status }) => {
      connection.isConnected = status === 'connected';
      this.emit(sessionId, 'connected', connection.isConnected);
      
      // Send user info when connected
      if (status === 'connected') {
        this.sendUserInfoToServer(connection);
      }
    });

    provider.on('synced', handleSynced);
    provider.on('connection-close', handleDisconnected);

    return connection;
  }

  /**
   * Send user information to the WebSocket server
   */
  sendUserInfoToServer(connection) {
    if (!connection.provider.ws) return;
    
    try {
      // Get user info from awareness if available
      const awarenessState = connection.awareness.getLocalState();
      const user = awarenessState?.user;
      
      if (user) {
        const userInfo = {
          type: 'set-user-info',
          userInfo: {
            userId: user.cognitoId || user.userId,
            email: user.email,
            name: user.name
          }
        };
        
        connection.provider.ws.send(JSON.stringify(userInfo));
        console.log('📤 Sent chat user info to Y-WebSocket server:', user.email);
      }
    } catch (error) {
      console.warn('Failed to send chat user info:', error);
    }
  }

  disconnect(sessionId) {
    const connection = this.connections.get(sessionId);
    if (connection) {
      try {
        connection.provider.destroy();
        connection.doc.destroy();
      } catch (error) {
        console.warn('Error destroying chat connection:', error);
      }
      this.connections.delete(sessionId);
    }
  }

  // Send a message
  sendMessage(sessionId, message) {
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.isConnected) {
      throw new Error('Chat not connected');
    }

    const messageData = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: message.content,
      sender: message.sender,
      senderEmail: message.senderEmail,
      timestamp: new Date().toISOString(),
      type: message.type || 'message'
    };

    connection.messagesArray.push([messageData]);
    return messageData;
  }

  // Set user presence
  setUserPresence(sessionId, user) {
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.awareness) return;

    try {
      connection.awareness.setLocalStateField('user', {
        name: user.name || user.email?.split('@')[0] || 'Anonymous',
        email: user.email,
        color: this.stringToColor(user.email || user.name),
        isInChat: true,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error setting user presence:', error);
    }
  }

  // Get all messages
  getMessages(sessionId) {
    const connection = this.connections.get(sessionId);
    if (!connection) return [];
    return connection.messagesArray.toArray();
  }

  // Get online users
  getOnlineUsers(sessionId) {
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.awareness) return [];

    const users = [];
    connection.awareness.getStates().forEach((state) => {
      if (state.user && state.user.isInChat) {
        users.push(state.user);
      }
    });
    return users;
  }

  // Event listener management
  on(sessionId, event, callback) {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    if (!connection.listeners.has(event)) {
      connection.listeners.set(event, new Set());
    }
    connection.listeners.get(event).add(callback);

    // Set up YJS observers based on event type
    if (event === 'messages') {
      const observer = () => {
        const messages = connection.messagesArray.toArray();
        callback(messages);
      };
      connection.messagesArray.observe(observer);
      // Store observer for cleanup
      callback._observer = observer;
    } else if (event === 'users') {
      const observer = () => {
        const users = this.getOnlineUsers(sessionId);
        callback(users);
      };
      if (connection.awareness) {
        connection.awareness.on('change', observer);
        callback._observer = observer;
      }
    }
  }

  off(sessionId, event, callback) {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    const listeners = connection.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      
      // Clean up YJS observers
      if (callback._observer) {
        if (event === 'messages') {
          connection.messagesArray.unobserve(callback._observer);
        } else if (event === 'users' && connection.awareness) {
          connection.awareness.off('change', callback._observer);
        }
      }
    }
  }

  // Internal event emitter
  emit(sessionId, event, data) {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    const listeners = connection.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Utility function to generate color from string
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

  // Check connection status
  isConnected(sessionId) {
    const connection = this.connections.get(sessionId);
    return connection ? connection.isConnected : false;
  }
}

// Export singleton instance
export const chatWebSocketService = new ChatWebSocketService();
export default chatWebSocketService;
