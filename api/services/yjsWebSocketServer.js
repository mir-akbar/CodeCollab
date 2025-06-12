/**
 * Y-WebSocket Server
 * Simple Y.js WebSocket server compatible with y-websocket client
 * Acts as a simple message relay without server-side document processing
 */

const WebSocketServer = require('ws').WebSocketServer;

class YjsWebSocketServer {
  constructor(server) {
    this.server = server;
    this.wss = null;
    this.rooms = new Map(); // Track active rooms for our custom messaging
    this.docs = new Map(); // Store Y.js documents for persistence
    this.connectionsByUser = new Map(); // Track connections by user
    this.heartbeatInterval = null;
  }

  /**
   * Initialize WebSocket server with proper Y.js support
   */
  initialize() {
    console.log('🔌 Setting up Y-WebSocket server...');
    
    // Create WebSocket server that handles Y.js connections
    this.wss = new WebSocketServer({
      server: this.server,
      verifyClient: (info) => {
        const pathname = info.req.url;
        return pathname.startsWith('/yjs-websocket');
      }
    });

    // Handle WebSocket connections 
    this.wss.on('connection', (ws, req) => {
      // Extract document name from URL - Y-WebSocket sends room name in the URL path
      const urlPath = req.url;
      let docName = 'default';
      
      console.log(`🔍 Parsing WebSocket URL: ${urlPath}`);
      
      // Y-WebSocket client sends room name as the second path segment
      // Example: /yjs-websocket/session123%2Fsrc-main-js or /yjs-websocket/session123/file.js
      if (urlPath.startsWith('/yjs-websocket/')) {
        const pathParts = urlPath.split('?')[0]; // Remove query parameters first
        const pathSegments = pathParts.split('/');
        
        if (pathSegments.length >= 4) {
          // Full path: /yjs-websocket/sessionId/fileName -> extract sessionId/fileName  
          const sessionId = decodeURIComponent(pathSegments[2]);
          const fileName = decodeURIComponent(pathSegments[3]);
          docName = `${sessionId}/${fileName}`;
          console.log(`📁 Extracted full room name: ${docName}`);
        } else if (pathSegments.length >= 3) {
          // Fallback: decode the single segment (might be URL-encoded full path)
          const encodedRoom = pathSegments[2];
          docName = decodeURIComponent(encodedRoom);
          console.log(`📁 Extracted room name from encoded segment: ${docName}`);
        }
      }
      
      // If no room name found, try extracting from query parameters
      if (docName === 'default' && urlPath.includes('?')) {
        const params = new URLSearchParams(urlPath.split('?')[1]);
        docName = params.get('room') || params.get('doc') || 'default';
        console.log(`📁 Room name from params: ${docName}`);
      }
      
      console.log(`🔗 New Y-WebSocket connection for document: ${docName}`);
      
      // Store document name for our custom handling
      ws.docName = docName;
      ws.isAlive = true;
      ws.lastActivity = Date.now();
      
      // Track this connection
      if (!this.rooms.has(docName)) {
        this.rooms.set(docName, new Set());
      }
      this.rooms.get(docName).add(ws);
      
      // Set up heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastActivity = Date.now();
      });

      // Handle messages - simple Y.js message forwarding
      ws.on('message', (message) => {
        try {
          // Try to parse as JSON for our custom control messages
          if (typeof message === 'string' || Buffer.isBuffer(message)) {
            const messageString = message.toString();
            if (messageString.startsWith('{')) {
              try {
                const data = JSON.parse(messageString);
                // Handle our custom message types
                if (data.type && typeof data.type === 'string' && this.isCustomMessageType(data.type)) {
                  this.handleCustomMessage(ws, data);
                  return; // Don't pass to Y.js if it's our custom message
                }
              } catch {
                // Not JSON or not our custom message, treat as Y.js binary
              }
            }
          }
          
          // Forward Y.js binary messages to other clients
          this.broadcastYjsMessage(ws, message);
          
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`🔌 Y-WebSocket connection closed for document: ${docName}`);
        this.cleanup(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ Y-WebSocket error:', error);
        this.cleanup(ws);
      });
      
      // Note: We don't send sync messages since we're acting as a simple relay
      // Each client will handle their own Y.js document state
    });

    // Start heartbeat
    this.startHeartbeat();

    console.log('✅ Y-WebSocket server initialized with proper Y.js support');
  }

  /**
   * Check if message type is one of our custom types
   */
  isCustomMessageType(type) {
    const customTypes = [
      'set-user-info',
      'file-upload-progress', 
      'file-deleted',
      'file-uploaded',
      'chat-message',
      'video-signal',
      'user-presence'
    ];
    return customTypes.includes(type);
  }

  /**
   * Handle custom control messages (non-Y.js protocol)
   */
  handleCustomMessage(ws, data) {
    const { type } = data;
    
    switch (type) {
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
        console.warn(`⚠️ Unknown custom message type: ${type}`);
    }
  }

  /**
   * Update user information for an existing connection
   */
  updateUserInfo(ws, userInfo) {
    if (!userInfo) return;
    
    const oldEmail = ws.userEmail;
    const docName = ws.docName;
    const oldUserKey = oldEmail ? `${oldEmail}-${docName}` : null;
    
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
      const newUserKey = `${userInfo.email}-${docName}`;
      if (!this.connectionsByUser.has(newUserKey)) {
        this.connectionsByUser.set(newUserKey, new Set());
      }
      this.connectionsByUser.get(newUserKey).add(ws);
    }
    
    console.log(`👤 Updated user info for ${docName}: ${oldEmail || 'unknown'} → ${ws.userEmail}`);
    
    // Notify other users in room about updated user info
    this.broadcastToRoom(docName, {
      type: 'user-info-updated',
      room: docName,
      user: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName,
        joinedAt: ws.joinedAt
      },
      totalUsers: this.rooms.get(docName)?.size || 0
    }, ws);
  }

  /**
   * Broadcast file upload progress
   */
  broadcastUploadProgress(ws, data) {
    const { room, sessionId } = data;
    const roomName = room || sessionId;
    this.broadcastToRoom(roomName, data, ws);
  }

  /**
   * Broadcast file deletion notification
   */
  broadcastFileDeleted(ws, data) {
    const { room, sessionId } = data;
    const roomName = room || sessionId;
    console.log(`🗑️  Broadcasting file deletion in room: ${roomName}`);
    this.broadcastToRoom(roomName, {
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
    const roomName = room || sessionId;
    console.log(`📁 Broadcasting file upload in room: ${roomName}`);
    this.broadcastToRoom(roomName, {
      ...data,
      type: 'file-uploaded',
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Broadcast chat messages
   */
  broadcastChatMessage(ws, data) {
    const { room, sessionId } = data;
    const roomName = room || sessionId;
    console.log(`💬 Broadcasting chat message in room: ${roomName}`);
    this.broadcastToRoom(roomName, {
      ...data,
      type: 'chat-message',
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Broadcast video signaling (WebRTC)
   */
  broadcastVideoSignal(ws, data) {
    const { room, sessionId, targetUser } = data;
    const roomName = room || sessionId;
    console.log(`📹 Broadcasting video signal in room: ${roomName}`);
    
    if (targetUser) {
      // Direct message to specific user
      this.sendToUser(roomName, targetUser, data);
    } else {
      // Broadcast to all users in room
      this.broadcastToRoom(roomName, {
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
    const { room, sessionId } = data;
    const roomName = room || sessionId;
    console.log(`👤 Broadcasting user presence in room: ${roomName}`);
    this.broadcastToRoom(roomName, {
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
          try {
            ws.send(JSON.stringify(message));
            sentCount++;
          } catch (error) {
            console.error('Error sending message to client:', error);
            this.cleanup(ws);
          }
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
          try {
            ws.send(JSON.stringify(message));
          } catch (error) {
            console.error('Error sending message to user:', error);
            this.cleanup(ws);
          }
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
    if (ws.docName && this.rooms.has(ws.docName)) {
      const room = ws.docName;
      this.rooms.get(room).delete(ws);
      
      // Remove from user tracking
      if (ws.userEmail) {
        const userKey = `${ws.userEmail}-${ws.docName}`;
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
   * Start heartbeat to detect dead connections
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          console.log(`💀 Terminating dead connection for document: ${ws.docName || 'unknown'}`);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Broadcast Y.js binary message to other clients in the same room
   * Simple relay without server-side document manipulation
   */
  broadcastYjsMessage(ws, message) {
    const room = ws.docName;
    if (!room) {
      console.warn('⚠️ No room name for WebSocket, cannot broadcast');
      return;
    }
    
    const clients = this.rooms.get(room);
    if (clients) {
      let broadcastCount = 0;
      console.log(`📡 Broadcasting Y.js message in room "${room}" to ${clients.size - 1} other clients`);
      
      // Simply relay the message to other clients without server-side processing
      // This avoids Y.js document corruption issues
      clients.forEach(client => {
        if (client !== ws && client.readyState === client.OPEN) {
          try {
            client.send(message);
            broadcastCount++;
          } catch (error) {
            console.error('Error broadcasting Y.js message:', error);
            this.cleanup(client);
          }
        }
      });
      
      console.log(`✅ Y.js message broadcasted to ${broadcastCount} clients in room "${room}"`);
    } else {
      console.warn(`⚠️ No clients found in room "${room}" for Y.js broadcast`);
    }
  }

  /**
   * Get connections by user key to prevent duplicates
   */
  getConnectionsByUserKey(userKey) {
    return this.connectionsByUser.get(userKey) || new Set();
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
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💔 Heartbeat stopped');
    }
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
}

module.exports = YjsWebSocketServer;
