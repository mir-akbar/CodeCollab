/**
 * Y-WebSocket Server
 * WebSocket server compatible with y-websocket client
 * Acts as a message relay with custom feature support
 */

const WebSocketServer = require('ws').WebSocketServer;
const ChatManager = require('./websocket/managers/ChatManager');
const FileEventManager = require('./websocket/managers/FileEventManager');
const UserPresenceManager = require('./websocket/managers/UserPresenceManager');
const DocumentStateManager = require('./websocket/managers/DocumentStateManager');
const RoomManager = require('./websocket/managers/RoomManager');
const RoomManagerInterface = require('./websocket/managers/RoomManagerInterface');
const VideoSignalingManager = require('./websocket/managers/VideoSignalingManager');

class YjsWebSocketServer {
  constructor(server) {
    this.server = server;
    this.wss = null;
    
    // Initialize core managers
    this.roomManager = new RoomManager();
    this.roomManagerInterface = new RoomManagerInterface(this);
    this.documentStateManager = new DocumentStateManager(this.roomManagerInterface);
    
    // Initialize feature managers
    this.chatManager = new ChatManager(this.roomManagerInterface);
    this.fileEventManager = new FileEventManager(this.roomManagerInterface);
    
    // Initialize user presence manager
    this.userPresenceManager = new UserPresenceManager(this.roomManagerInterface);
    
    // Initialize video signaling manager
    this.videoSignalingManager = new VideoSignalingManager(this.roomManagerInterface);
  }

  /**
   * Initialize WebSocket server with Y.js support
   */
  initialize() {
    console.log('🔌 Setting up WebSocket server...');
    
    // Create WebSocket server that handles Y.js and video connections
    this.wss = new WebSocketServer({
      server: this.server,
      verifyClient: (info) => {
        const pathname = info.req.url;
        return pathname.startsWith('/yjs-websocket') || pathname.startsWith('/video-signaling');
      }
    });

    // Handle WebSocket connections 
    this.wss.on('connection', (ws, req) => {
      // Extract document name from URL - Y-WebSocket sends room name in the URL path
      const urlPath = req.url;
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      let docName = 'default';
      
      console.log(`🔍 [WEBSOCKET-CONNECT] New connection from ${clientIP}, URL: ${urlPath}`);
      
      // Y-WebSocket client sends room name as the second path segment
      // Example: /yjs-websocket/session123%2Fsrc-main-js or /yjs-websocket/session123/file.js
      // Video clients send: /video-signaling/session123
      if (urlPath.startsWith('/yjs-websocket/')) {
        const pathParts = urlPath.split('?')[0]; // Remove query parameters first
        const pathSegments = pathParts.split('/');
        
        console.log(`🔍 [WEBSOCKET-CONNECT] Y.js path segments:`, pathSegments);
        
        if (pathSegments.length >= 4) {
          // Full path: /yjs-websocket/sessionId/fileName -> extract sessionId/fileName  
          const sessionIdPart = decodeURIComponent(pathSegments[2]);
          const fileName = decodeURIComponent(pathSegments[3]);
          docName = `${sessionIdPart}/${fileName}`;
          console.log(`📁 [WEBSOCKET-CONNECT] Extracted full room name: ${docName} (sessionId: ${sessionIdPart}, fileName: ${fileName})`);
        } else if (pathSegments.length >= 3) {
          // Fallback: decode the single segment (might be URL-encoded full path)
          const encodedRoom = pathSegments[2];
          docName = decodeURIComponent(encodedRoom);
          console.log(`📁 [WEBSOCKET-CONNECT] Extracted room name from encoded segment: ${docName}`);
        }
      } else if (urlPath.startsWith('/video-signaling/')) {
        const pathParts = urlPath.split('?')[0]; // Remove query parameters first
        const pathSegments = pathParts.split('/');
        
        console.log(`🔍 [WEBSOCKET-CONNECT] Video signaling path segments:`, pathSegments);
        
        if (pathSegments.length >= 3) {
          // Video signaling path: /video-signaling/sessionId
          const sessionIdPart = decodeURIComponent(pathSegments[2]);
          docName = sessionIdPart; // For video, docName = sessionId
          console.log(`🎥 [WEBSOCKET-CONNECT] Video signaling for session: ${sessionIdPart}`);
        }
      }
      
      // If no room name found, try extracting from query parameters
      if (docName === 'default' && urlPath.includes('?')) {
        const params = new URLSearchParams(urlPath.split('?')[1]);
        docName = params.get('room') || params.get('doc') || 'default';
        console.log(`📁 [WEBSOCKET-CONNECT] Room name from params: ${docName}`);
      }
      
      console.log(`🔗 [WEBSOCKET-CONNECT] Established connection for document: ${docName} from ${clientIP}`);
      
      // Extract sessionId from docName for dual room support
      let sessionId = 'default';
      if (docName && docName.includes('/')) {
        sessionId = docName.split('/')[0]; // Extract sessionId from "sessionId/fileName"
      } else if (docName && docName !== 'default') {
        sessionId = docName; // If no slash, treat entire docName as sessionId
      }
      
      // Store both document and session context for dual room support
      ws.docName = docName;           // For Y.js document sync, chat, file events
      ws.sessionId = sessionId;       // For video chat, session-wide features
      ws.isAlive = true;
      ws.lastActivity = Date.now();
      ws.clientIP = clientIP;
      
      console.log(`🏠 [WEBSOCKET-CONNECT] Room context - Document: ${docName}, Session: ${sessionId}`);
      
      // Add to document room (existing functionality)
      this.roomManager.addClientToRoom(docName, ws);
      console.log(`📄 [WEBSOCKET-CONNECT] Added to document room ${docName}, total connections: ${this.roomManager.getConnectionCount(docName)}`);
      
      // Add to session room (new functionality for video chat)
      if (sessionId !== docName) { // Avoid duplicate if docName = sessionId
        this.roomManager.addClientToRoom(sessionId, ws);
        console.log(`🎥 [WEBSOCKET-CONNECT] Added to session room ${sessionId}, total connections: ${this.roomManager.getConnectionCount(sessionId)}`);
      }
      
      // Let Y.js clients handle their own document synchronization
      console.log(`🔄 [WEBSOCKET-CONNECT] Y.js client will handle document synchronization for: ${docName}`);
      
      // Set up additional initialization for new connections
      setTimeout(() => {
        // Only send history if connection is still alive
        if (ws.readyState === ws.OPEN) {
          // Send recent chat history to new user (this is safe)
          this.chatManager.sendChatHistoryToUser(ws, docName);
          
          // Send recent file event history to new user (this is safe)
          this.fileEventManager.sendFileHistoryToUser(ws, docName);
        }
      }, 100); // Small delay to ensure client is ready
      
      // Set up heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastActivity = Date.now();
      });

      // Handle messages - Y.js message forwarding with proper validation
      ws.on('message', (message) => {
        try {
          // Update activity timestamp
          ws.lastActivity = Date.now();
          
          // Handle different message formats more robustly
          if (typeof message === 'string') {
            // String messages - likely JSON
            try {
              const data = JSON.parse(message);
              if (data.type && typeof data.type === 'string' && this.isCustomMessageType(data.type)) {
                this.handleCustomMessage(ws, data);
                return;
              }
            } catch (jsonError) {
              // Not valid JSON, could be malformed - log and ignore
              console.warn(`⚠️ Invalid JSON message from ${ws.clientIP}:`, jsonError.message);
              return;
            }
          } else if (Buffer.isBuffer(message)) {
            // Buffer messages - could be Y.js binary or JSON in buffer
            if (message.length === 0) {
              console.warn(`⚠️ Empty buffer message from ${ws.clientIP}`);
              return;
            }
            
            // Try to detect if it's a JSON message in buffer format
            try {
              const messageString = message.toString('utf8');
              if (messageString.startsWith('{') && messageString.endsWith('}')) {
                const data = JSON.parse(messageString);
                if (data.type && typeof data.type === 'string' && this.isCustomMessageType(data.type)) {
                  this.handleCustomMessage(ws, data);
                  return;
                }
              }
            } catch {
              // Not JSON in buffer format, treat as Y.js binary
            }
            
            // Validate Y.js binary message
            if (!this.isValidYjsMessage(message)) {
              console.warn(`⚠️ Invalid Y.js message from ${ws.clientIP}, length: ${message.length}`);
              return;
            }
          } else {
            console.warn(`⚠️ Unknown message type from ${ws.clientIP}:`, typeof message);
            return;
          }
          
          // Forward validated Y.js messages to other clients
          this.broadcastYjsMessage(ws, message);
          
        } catch (error) {
          console.error(`❌ Error handling WebSocket message from ${ws.clientIP}:`, error);
        }
      });

      ws.on('close', () => {
        console.log(`🔌 Connection closed for document: ${docName}`);
        this.cleanup(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.cleanup(ws);
      });
      
      // Note: Acting as a simple relay for Y.js protocol
      // Each client handles their own document state
    });

    // Start heartbeat
    this.roomManager.startHeartbeat(this.wss);

    console.log('✅ WebSocket server initialized with Y.js support');
  }

  /**
   * Check if message type is one of our custom types
   */
  isCustomMessageType(type) {
    // Check if it's a chat message
    if (this.chatManager.isChatMessage(type)) {
      return true;
    }
    
    // Check if it's a file event message
    if (this.fileEventManager.isFileMessage(type)) {
      return true;
    }
    
    // Check if it's a user presence message
    if (this.userPresenceManager.isUserPresenceMessage(type)) {
      return true;
    }
    
    // Check if it's a video signaling message
    if (this.videoSignalingManager.isVideoSignalingMessage(type)) {
      return true;
    }
    
    return false;
  }

  /**
   * Handle custom control messages (non-Y.js protocol)
   */
  handleCustomMessage(ws, data) {
    const { type } = data;
    
    // Delegate chat messages to Chat Manager
    if (this.chatManager.isChatMessage(type)) {
      this.chatManager.handleChatMessage(ws, data);
      return;
    }
    
    // Delegate file event messages to File Event Manager
    if (this.fileEventManager.isFileMessage(type)) {
      this.fileEventManager.handleFileMessage(ws, data);
      return;
    }
    
    // Delegate user presence messages to User Presence Manager
    if (this.userPresenceManager.isUserPresenceMessage(type)) {
      this.userPresenceManager.handleUserPresenceMessage(ws, data);
      return;
    }
    
    // Delegate video signaling messages to Video Signaling Manager
    if (this.videoSignalingManager.isVideoSignalingMessage(type)) {
      this.videoSignalingManager.handleVideoSignalingMessage(ws, data);
      return;
    }
    
    // Handle any remaining unknown custom messages
    console.warn(`⚠️ Unknown custom message type: ${type}`);
  }

  /**
   * Broadcast message to all clients in room except sender
   */
  broadcastToRoom(room, message, excludeWs = null) {
    return this.roomManager.broadcastToRoom(room, message, excludeWs);
  }

  /**
   * Send message to specific user in room
   */
  sendToUser(room, targetUserId, message) {
    return this.roomManager.sendToUser(room, targetUserId, message);
  }

  /**
   * Get all users in a room
   */
  getRoomUsers(room) {
    return this.roomManager.getRoomUsers(room);
  }

  /**
   * Cleanup when client disconnects
   */
  cleanup(ws) {
    // Notify managers about disconnection
    this.chatManager.handleUserDisconnect(ws);
    this.fileEventManager.handleUserDisconnect(ws);
    this.userPresenceManager.handleUserDisconnect(ws);
    
    // Remove from room
    if (ws.docName) {
      this.roomManager.removeClientFromRoom(ws.docName, ws);
    }
  }

  /**
   * Broadcast Y.js message to other clients in the same room
   */
  broadcastYjsMessage(ws, message) {
    try {
      console.log(`🔄 Broadcasting Y.js message as relay`);
      
      this.roomManager.broadcastYjsMessage(
        ws, 
        message, 
        false, // No server-side processing
        null // No callback needed
      );
    } catch (error) {
      console.error(`❌ Error broadcasting Y.js message:`, error);
      // Don't crash the server, just log the error
    }
  }

  /**
   * Get connections by user key to prevent duplicates
   */
  getConnectionsByUserKey(userKey) {
    return this.userPresenceManager.getConnectionsByUserKey(userKey);
  }

  /**
   * Get server statistics
   */
  getStats() {
    const roomStats = this.roomManager.getRoomStats();
    const chatStats = this.chatManager.getChatStats();
    const fileEventStats = this.fileEventManager.getFileEventStats();
    const userPresenceStats = this.userPresenceManager.getUserPresenceStats();
    const documentStats = this.documentStateManager.getDocumentStats();
    
    return {
      ...roomStats,
      chat: chatStats,
      fileEvents: fileEventStats,
      userPresence: userPresenceStats,
      documents: documentStats
    };
  }

  /**
   * Check if a room exists
   */
  hasRoom(room) {
    return this.roomManager.hasRoom(room);
  }

  /**
   * Create a new room if it doesn't exist
   */
  createRoom(room) {
    return this.roomManager.createRoom(room);
  }

  /**
   * Shutdown the server
   */
  shutdown() {
    if (this.wss) {
      console.log('🛑 Shutting down WebSocket server...');
      
      // Cleanup managers
      this.roomManager.cleanup();
      this.documentStateManager.cleanup();
      this.userPresenceManager.cleanup();
      this.chatManager.cleanup();
      this.fileEventManager.cleanup();
      
      // Close all connections
      this.wss.clients.forEach(ws => {
        ws.terminate();
      });
      
      // Clear WebSocket server
      this.wss.close();
      
      console.log('✅ WebSocket server shutdown complete');
    }
  }
  
  /**
   * Validate Y.js binary message format
   */
  isValidYjsMessage(message) {
    if (!Buffer.isBuffer(message) || message.length === 0) {
      return false;
    }
    
    try {
      // Basic Y.js message validation
      // Y.js messages typically start with specific byte patterns
      const firstByte = message[0];
      
      // Y.js sync messages start with messageType (0, 1, 2)
      // 0 = sync step 1, 1 = sync step 2, 2 = update
      if (firstByte >= 0 && firstByte <= 2) {
        // For sync messages, check minimum length
        if (message.length < 2) {
          return false;
        }
        return true;
      }
      
      // Allow other message types but with basic length check
      if (message.length >= 1 && message.length <= 1024 * 1024) { // Max 1MB
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn(`⚠️ Error validating Y.js message:`, error.message);
      return false;
    }
  }
}

module.exports = YjsWebSocketServer;
