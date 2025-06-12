/**
 * Y-WebSocket Server
 * Simple WebSocket server for Y.js document synchronization
 */

const WebSocketServer = require('ws').WebSocketServer;

class YjsWebSocketServer {
  constructor(server) {
    this.server = server;
    this.wss = null;
    this.rooms = new Map(); // Track active rooms
    this.docs = new Map(); // Store Y.js documents
    this.connectionsByUser = new Map(); // Track connections by user to prevent duplicates
    this.heartbeatInterval = null; // Heartbeat to keep connections alive
  }

  /**
   * Initialize WebSocket server
   */
  initialize() {
    console.log('🔌 Setting up Y-WebSocket server...');
    
    // Create WebSocket server that handles session-specific paths
    this.wss = new WebSocketServer({
      server: this.server,
      verifyClient: (info) => {
        // Allow connections to /yjs-websocket or /yjs-websocket/<sessionId>
        const pathname = info.req.url;
        return pathname.startsWith('/yjs-websocket');
      }
    });

    // Handle WebSocket connections
    this.wss.on('connection', (ws, req) => {
      // Extract room name from URL path following Y.js conventions
      const urlPath = req.url;
      let roomName = null;
      let docType = 'default';
      
      // Y.js standard: /yjs-websocket should handle room names via WebSocket messages
      // But we can also extract from URL for compatibility
      if (urlPath.startsWith('/yjs-websocket/')) {
        const pathSegments = urlPath.split('/');
        if (pathSegments.length >= 3) {
          roomName = pathSegments.slice(2).join('/'); // Everything after /yjs-websocket/
          
          // Determine doc type from room name pattern
          if (roomName.includes('/chat-')) {
            docType = 'chat';
          } else if (roomName.includes('/')) {
            docType = 'file';
          } else {
            docType = 'session';
          }
        }
      }
      
      console.log(`🔗 New Y-WebSocket connection - Room: ${roomName || 'pending'}, Type: ${docType}`);
      
      // Store connection info
      ws.roomName = roomName;
      ws.docType = docType;
      ws.isAlive = true;
      ws.lastActivity = Date.now();
      
      // Set up heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastActivity = Date.now();
      });

      // Auto-join room if we have a room name
      if (roomName) {
        this.joinRoom(ws, roomName, docType);
      }

      ws.on('message', (message) => {
        try {
          // Check if it's a Y.js binary message first
          if (message instanceof Buffer || message instanceof Uint8Array) {
            // This is a Y.js update - broadcast to other clients in the same room
            this.broadcastYjsUpdate(ws, message);
            return;
          }

          // Try to parse as JSON for control messages
          const messageString = message.toString();
          if (messageString.startsWith('{') || messageString.startsWith('[')) {
            try {
              const data = JSON.parse(messageString);
              this.handleMessage(ws, data);
            } catch (jsonError) {
              console.warn('Failed to parse JSON message:', jsonError.message);
              // Still treat as Y.js binary message as fallback
              this.broadcastYjsUpdate(ws, message);
            }
          } else {
            // Non-JSON string message, treat as Y.js binary
            this.broadcastYjsUpdate(ws, message);
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`🔌 Y-WebSocket connection closed - Room: ${ws.roomName || 'unknown'}, User: ${ws.userEmail || 'unknown'}`);
        this.cleanup(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ Y-WebSocket error:', error);
        this.cleanup(ws);
      });
    });

    // Start heartbeat to detect dead connections
    this.startHeartbeat();

    console.log('✅ Y-WebSocket server initialized');
  }

  /**
   * Start heartbeat to detect dead connections
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          console.log('💀 Terminating dead connection');
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Check every 30 seconds
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
      case 'set-user-info':
        this.updateUserInfo(ws, data.userInfo);
        break;
      case 'file-upload-progress':
        this.broadcastUploadProgress(ws, data);
        break;
      case 'file-deleted':
        this.broadcastFileDeleted(ws, data);
        break;
      case 'file-uploaded':
        this.broadcastFileUploaded(ws, data);
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
    
    // Check for existing connections from the same user to prevent duplicates
    if (userInfo.email) {
      const userKey = `${userInfo.email}-${room}-${docName}`;
      const existingConnections = this.getConnectionsByUserKey(userKey);
      
      // Close existing connections to prevent duplicates
      existingConnections.forEach(existingWs => {
        if (existingWs !== ws && existingWs.readyState === existingWs.OPEN) {
          console.log(`🔄 Closing duplicate connection for user: ${userInfo.email}`);
          existingWs.terminate();
        }
      });
    }
    
    this.rooms.get(room).add(ws);
    ws.room = room;
    ws.docName = docName;
    ws.userId = userInfo.userId;
    ws.userEmail = userInfo.email;
    ws.joinedAt = new Date().toISOString();
    
    // Track user connections
    if (userInfo.email) {
      const userKey = `${userInfo.email}-${room}-${docName}`;
      if (!this.connectionsByUser.has(userKey)) {
        this.connectionsByUser.set(userKey, new Set());
      }
      this.connectionsByUser.get(userKey).add(ws);
    }
    
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
   * Update user information for an existing connection
   */
  updateUserInfo(ws, userInfo) {
    if (!userInfo) return;
    
    const oldEmail = ws.userEmail;
    const oldUserKey = oldEmail ? `${oldEmail}-${ws.room}-${ws.docName}` : null;
    
    ws.userId = userInfo.userId || userInfo.cognitoId;
    ws.userEmail = userInfo.email;
    ws.userName = userInfo.name || userInfo.email?.split('@')[0];
    
    // Update user tracking
    if (oldUserKey && this.connectionsByUser.has(oldUserKey)) {
      this.connectionsByUser.get(oldUserKey).delete(ws);
      if (this.connectionsByUser.get(oldUserKey).size === 0) {
        this.connectionsByUser.delete(oldUserKey);
      }
    }
    
    if (userInfo.email) {
      const newUserKey = `${userInfo.email}-${ws.room}-${ws.docName}`;
      if (!this.connectionsByUser.has(newUserKey)) {
        this.connectionsByUser.set(newUserKey, new Set());
      }
      this.connectionsByUser.get(newUserKey).add(ws);
    }
    
    console.log(`👤 Updated user info for ${ws.room}: ${oldEmail || 'unknown'} → ${ws.userEmail}`);
    
    // Notify other users in room about updated user info
    if (ws.room) {
      this.broadcastToRoom(ws.room, {
        type: 'user-info-updated',
        room: ws.room,
        user: {
          userId: ws.userId,
          email: ws.userEmail,
          name: ws.userName,
          joinedAt: ws.joinedAt
        },
        totalUsers: this.rooms.get(ws.room)?.size || 0
      }, ws);
    }
  }

  /**
   * Broadcast file upload progress
   */
  broadcastUploadProgress(ws, data) {
    const { room } = data;
    this.broadcastToRoom(room, data, ws);
  }

  /**
   * Broadcast file deletion notification
   */
  broadcastFileDeleted(ws, data) {
    const { room, sessionId } = data;
    console.log(`🗑️  Broadcasting file deletion in room: ${room || sessionId}`);
    this.broadcastToRoom(room || sessionId, {
      ...data,
      type: 'file-deleted',
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Broadcast file upload notification
   */
  broadcastFileUploaded(ws, data) {
    const { room, sessionId } = data;
    console.log(`📁 Broadcasting file upload in room: ${room || sessionId}`);
    this.broadcastToRoom(room || sessionId, {
      ...data,
      type: 'file-uploaded',
      timestamp: new Date().toISOString()
    }, ws);
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
   * Broadcast Y.js binary updates to other clients in the same room
   */
  broadcastYjsUpdate(ws, message) {
    const room = ws.roomName;
    if (!room) return;
    
    const clients = this.rooms.get(room);
    if (clients) {
      clients.forEach(client => {
        if (client !== ws && client.readyState === client.OPEN && client.docType === ws.docType) {
          try {
            client.send(message);
          } catch (error) {
            console.error('Error broadcasting Y.js update:', error);
            // Remove failed client
            this.cleanup(client);
          }
        }
      });
    }
  }

  /**
   * Broadcast message to all clients in room except sender
   */
  broadcastToRoom(room, message, excludeWs = null) {
    const clients = this.rooms.get(room);
    
    if (message.type === 'file-ready-for-collaboration' || message.type === 'collaboration-ready') {
      console.log(`📢 [Y-WEBSOCKET] Broadcasting collaboration event:`, {
        room,
        messageType: message.type,
        clientCount: clients?.size || 0,
        hasFile: !!message.file,
        filePath: message.filePath || message.file?.path,
        timestamp: message.timestamp
      });
    }
    
    if (clients) {
      let sentCount = 0;
      clients.forEach(ws => {
        if (ws !== excludeWs && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(message));
          sentCount++;
        }
      });
      
      if (message.type === 'file-ready-for-collaboration' || message.type === 'collaboration-ready') {
        console.log(`✅ [Y-WEBSOCKET] Collaboration event sent to ${sentCount} clients in room: ${room}`);
      }
    } else {
      if (message.type === 'file-ready-for-collaboration' || message.type === 'collaboration-ready') {
        console.log(`⚠️ [Y-WEBSOCKET] No clients found in room: ${room} for collaboration event`);
      }
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
      
      // Remove from user tracking
      if (ws.userEmail) {
        const userKey = `${ws.userEmail}-${ws.room}-${ws.docName}`;
        if (this.connectionsByUser.has(userKey)) {
          this.connectionsByUser.get(userKey).delete(ws);
          if (this.connectionsByUser.get(userKey).size === 0) {
            this.connectionsByUser.delete(userKey);
          }
        }
      }
      
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
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Close all connections
      this.wss.clients.forEach(ws => {
        ws.terminate();
      });
      
      // Clear data structures
      this.wss.close();
      this.rooms.clear();
      this.connectionsByUser.clear();
      
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

  /**
   * Get connections by user key to prevent duplicates
   */
  getConnectionsByUserKey(userKey) {
    return this.connectionsByUser.get(userKey) || new Set();
  }

  /**
   * Start heartbeat to detect dead connections
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) {
          console.log(`💔 Terminating dead connection for user: ${ws.userEmail || 'unknown'}`);
          ws.terminate();
          return;
        }

        // Check for inactive connections (no activity for 5 minutes)
        const now = Date.now();
        if (now - ws.lastActivity > 300000) { // 5 minutes
          console.log(`⏰ Terminating inactive connection for user: ${ws.userEmail || 'unknown'}`);
          ws.terminate();
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Check every 30 seconds

    console.log('💓 Heartbeat started for Y-WebSocket connections');
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💔 Heartbeat stopped');
    }
  }
}

module.exports = YjsWebSocketServer;
