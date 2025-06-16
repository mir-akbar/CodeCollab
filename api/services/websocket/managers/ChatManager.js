/**
 * Chat Manager
 * Handles chat message broadcasting for collaborative sessions
 * Extracted from YjsWebSocketServer for better separation of concerns
 */

class ChatManager {
  constructor(roomManager) {
    this.roomManager = roomManager;
    this.chatHistory = new Map(); // Optional: store recent chat history per room
    this.maxHistoryPerRoom = 50; // Limit chat history to prevent memory issues
  }

  /**
   * Check if message type is chat-related
   */
  isChatMessage(type) {
    const chatMessageTypes = [
      'chat-message'
    ];
    return chatMessageTypes.includes(type);
  }

  /**
   * Handle chat-related messages
   */
  handleChatMessage(ws, data) {
    const { type } = data;
    
    switch (type) {
      case 'chat-message':
        this.broadcastChatMessage(ws, data);
        break;
      default:
        console.warn(`⚠️ Unknown chat message type: ${type}`);
    }
  }

  /**
   * Broadcast chat messages to all users in the room
   */
  broadcastChatMessage(ws, data) {
    const { room, sessionId, message, timestamp } = data;
    const roomName = room || sessionId;
    
    if (!roomName) {
      console.warn('⚠️ No room specified for chat message');
      return;
    }

    if (!message || message.trim() === '') {
      console.warn('⚠️ Empty chat message ignored');
      return;
    }

    console.log(`💬 Broadcasting chat message in room: ${roomName} from ${ws.userEmail}`);
    
    const chatData = {
      type: 'chat-message',
      room: roomName,
      sessionId: roomName,
      message: message.trim(),
      user: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName || ws.userEmail?.split('@')[0] || 'Anonymous'
      },
      timestamp: timestamp || new Date().toISOString()
    };

    // Store in chat history (optional feature)
    this.storeChatMessage(roomName, chatData);
    
    // Broadcast to all users in room except sender
    this.roomManager.broadcastToRoom(roomName, chatData, ws);
    
    console.log(`✅ Chat message broadcasted in room: ${roomName}`);
  }

  /**
   * Store chat message in history (optional feature for recent messages)
   */
  storeChatMessage(roomName, chatData) {
    if (!this.chatHistory.has(roomName)) {
      this.chatHistory.set(roomName, []);
    }
    
    const history = this.chatHistory.get(roomName);
    history.push({
      message: chatData.message,
      user: chatData.user,
      timestamp: chatData.timestamp
    });
    
    // Limit history size to prevent memory issues
    if (history.length > this.maxHistoryPerRoom) {
      history.splice(0, history.length - this.maxHistoryPerRoom);
    }
    
    console.log(`📝 Stored chat message in room ${roomName} history (${history.length} messages)`);
  }

  /**
   * Get recent chat history for a room (optional feature)
   */
  getChatHistory(roomName, limit = 20) {
    if (!this.chatHistory.has(roomName)) {
      return [];
    }
    
    const history = this.chatHistory.get(roomName);
    const requestedLimit = Math.min(limit, this.maxHistoryPerRoom);
    
    return history.slice(-requestedLimit);
  }

  /**
   * Send recent chat history to a new user joining a room
   */
  sendChatHistoryToUser(ws, roomName) {
    const history = this.getChatHistory(roomName, 10); // Send last 10 messages
    
    if (history.length > 0) {
      console.log(`📜 Sending ${history.length} recent chat messages to ${ws.userEmail} in room: ${roomName}`);
      
      // Send chat history as a special message type
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'chat-history',
          room: roomName,
          messages: history,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }

  /**
   * Handle user disconnection - clean up chat state
   */
  handleUserDisconnect(ws) {
    // Chat doesn't require special cleanup on disconnect
    // History is maintained for other users
    console.log(`👋 User ${ws.userEmail} disconnected - chat state maintained`);
  }

  /**
   * Clear chat history for a room (admin function)
   */
  clearChatHistory(roomName) {
    if (this.chatHistory.has(roomName)) {
      this.chatHistory.delete(roomName);
      console.log(`🗑️ Cleared chat history for room: ${roomName}`);
      return true;
    }
    return false;
  }

  /**
   * Get chat statistics
   */
  getChatStats() {
    const totalRoomsWithChat = this.chatHistory.size;
    const totalMessages = Array.from(this.chatHistory.values())
      .reduce((sum, history) => sum + history.length, 0);
    
    const roomStats = Array.from(this.chatHistory.entries()).map(([roomName, history]) => ({
      roomName,
      messageCount: history.length,
      lastMessage: history.length > 0 ? history[history.length - 1].timestamp : null
    }));

    return {
      totalRoomsWithChat,
      totalMessages,
      rooms: roomStats
    };
  }

  /**
   * Validate chat message content
   */
  validateChatMessage(data) {
    const { message, room, sessionId } = data;
    
    if (!message || typeof message !== 'string') {
      return { valid: false, error: 'Message is required and must be a string' };
    }
    
    if (message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }
    
    if (message.length > 1000) {
      return { valid: false, error: 'Message is too long (max 1000 characters)' };
    }
    
    if (!room && !sessionId) {
      return { valid: false, error: 'Room or sessionId is required' };
    }
    
    return { valid: true };
  }

  /**
   * Enhanced broadcast with validation
   */
  broadcastValidatedChatMessage(ws, data) {
    const validation = this.validateChatMessage(data);
    
    if (!validation.valid) {
      console.warn(`⚠️ Invalid chat message from ${ws.userEmail}: ${validation.error}`);
      
      // Send error back to sender
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'chat-error',
          error: validation.error,
          timestamp: new Date().toISOString()
        }));
      }
      return false;
    }
    
    // Proceed with broadcasting valid message
    this.broadcastChatMessage(ws, data);
    return true;
  }

  /**
   * Cleanup all chat state
   */
  cleanup() {
    console.log('🧹 Cleaning up chat manager...');
    this.chatHistory.clear();
  }
}

module.exports = ChatManager;
