/**
 * Y-WebSocket Server
 * Simple WebSocket server for Y.js document synchronization
 */

const WebSocketServer = require('ws').WebSocketServer;
const Y = require('yjs');

class YjsWebSocketServer {
  constructor(server) {
    this.server = server;
    this.wss = null;
    this.rooms = new Map(); // Track active rooms
    this.docs = new Map(); // Store Y.js documents
  }

  /**
   * Initialize WebSocket server
   */
  initialize() {
    console.log('🔌 Setting up Y-WebSocket server...');
    
    // Create WebSocket server
    this.wss = new WebSocketServer({
      server: this.server,
      path: '/yjs-websocket'
    });

    // Handle WebSocket connections
    this.wss.on('connection', (ws, req) => {
      console.log(`🔗 New Y-WebSocket connection`);
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Y-WebSocket connection closed');
        this.cleanup(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ Y-WebSocket error:', error);
      });
    });

    console.log('✅ Y-WebSocket server initialized');
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(ws, data) {
    const { type, room, docName } = data;
    
    switch (type) {
      case 'join-room':
        this.joinRoom(ws, room, docName);
        break;
      case 'file-upload-progress':
        this.broadcastUploadProgress(ws, data);
        break;
      case 'code-edit':
        this.broadcastCodeEdit(ws, data);
        break;
      case 'chat-message':
        this.broadcastChatMessage(ws, data);
        break;
      case 'video-signal':
        this.broadcastVideoSignal(ws, data);
        break;
      case 'user-presence':
        this.broadcastUserPresence(ws, data);
        break;
      default:
        console.warn(`⚠️ Unknown message type: ${type}`);
    }
  }

  /**
   * Join a Y.js room
   */
  joinRoom(ws, room, docName, userInfo = {}) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    
    this.rooms.get(room).add(ws);
    ws.room = room;
    ws.docName = docName;
    ws.userId = userInfo.userId;
    ws.userEmail = userInfo.email;
    ws.joinedAt = new Date().toISOString();
    
    console.log(`👥 Client joined room: ${room}, doc: ${docName}, user: ${userInfo.email || 'unknown'}`);
    
    // Notify other users in room about new participant
    this.broadcastToRoom(room, {
      type: 'user-joined',
      room,
      user: {
        userId: ws.userId,
        email: ws.userEmail,
        joinedAt: ws.joinedAt
      },
      totalUsers: this.rooms.get(room).size
    }, ws);
  }

  /**
   * Broadcast file upload progress
   */
  broadcastUploadProgress(ws, data) {
    const { room } = data;
    this.broadcastToRoom(room, data, ws);
  }

  /**
   * Broadcast code editing changes (Y.js integration)
   */
  broadcastCodeEdit(ws, data) {
    const { room } = data;
    console.log(`🔧 Broadcasting code edit in room: ${room}`);
    this.broadcastToRoom(room, {
      ...data,
      type: 'code-edit',
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Broadcast chat messages
   */
  broadcastChatMessage(ws, data) {
    const { room } = data;
    console.log(`💬 Broadcasting chat message in room: ${room}`);
    this.broadcastToRoom(room, {
      ...data,
      type: 'chat-message',
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Broadcast video signaling (WebRTC)
   */
  broadcastVideoSignal(ws, data) {
    const { room, targetUser } = data;
    console.log(`📹 Broadcasting video signal in room: ${room}`);
    
    if (targetUser) {
      // Direct message to specific user
      this.sendToUser(room, targetUser, data);
    } else {
      // Broadcast to all users in room
      this.broadcastToRoom(room, {
        ...data,
        type: 'video-signal',
        timestamp: new Date().toISOString()
      }, ws);
    }
  }

  /**
   * Broadcast user presence updates
   */
  broadcastUserPresence(ws, data) {
    const { room } = data;
    console.log(`👤 Broadcasting user presence in room: ${room}`);
    this.broadcastToRoom(room, {
      ...data,
      type: 'user-presence',
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Broadcast message to all clients in room except sender
   */
  broadcastToRoom(room, message, excludeWs = null) {
    const clients = this.rooms.get(room);
    if (clients) {
      clients.forEach(ws => {
        if (ws !== excludeWs && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  /**
   * Send message to specific user in room
   */
  sendToUser(room, targetUserId, message) {
    const clients = this.rooms.get(room);
    if (clients) {
      clients.forEach(ws => {
        if (ws.userId === targetUserId && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  /**
   * Get all users in a room
   */
  getRoomUsers(room) {
    const clients = this.rooms.get(room);
    if (!clients) return [];
    
    return Array.from(clients)
      .filter(ws => ws.readyState === ws.OPEN)
      .map(ws => ({
        userId: ws.userId,
        email: ws.userEmail,
        joinedAt: ws.joinedAt,
        docName: ws.docName
      }));
  }

  /**
   * Cleanup when client disconnects
   */
  cleanup(ws) {
    if (ws.room && this.rooms.has(ws.room)) {
      const room = ws.room;
      this.rooms.get(room).delete(ws);
      
      // Notify other users about departure
      if (ws.userEmail) {
        this.broadcastToRoom(room, {
          type: 'user-left',
          room,
          user: {
            userId: ws.userId,
            email: ws.userEmail
          },
          totalUsers: this.rooms.get(room).size
        });
      }
      
      // Remove empty rooms
      if (this.rooms.get(room).size === 0) {
        this.rooms.delete(room);
        console.log(`🗑️  Removed empty room: ${room}`);
      }
    }
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      totalRooms: this.rooms.size,
      rooms: Array.from(this.rooms.entries()).map(([name, clients]) => ({
        name,
        clientCount: clients.size
      }))
    };
  }

  /**
   * Shutdown the server
   */
  shutdown() {
    if (this.wss) {
      console.log('🛑 Shutting down Y-WebSocket server...');
      this.wss.close();
      this.rooms.clear();
      console.log('✅ Y-WebSocket server shutdown complete');
    }
  }

  /**
   * Check if a room exists
   */
  hasRoom(room) {
    return this.rooms.has(room);
  }

  /**
   * Create a new room if it doesn't exist
   */
  createRoom(room) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
      console.log(`🏠 Created new Y-WebSocket room: ${room}`);
      return true;
    }
    return false;
  }
}

module.exports = YjsWebSocketServer;
