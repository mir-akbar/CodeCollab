/**
 * Y-WebSocket Server
 * Simple Y.js WebSocket server compatible with y-websocket client
 * Acts as a simple message relay without server-side document processing
 */

const WebSocketServer = require('ws').WebSocketServer;
const VideoCallManager = require('./websocket/managers/VideoCallManager');
const ChatManager = require('./websocket/managers/ChatManager');
const FileEventManager = require('./websocket/managers/FileEventManager');
const UserPresenceManager = require('./websocket/managers/UserPresenceManager');
const DocumentStateManager = require('./websocket/managers/DocumentStateManager');
const RoomManager = require('./websocket/managers/RoomManager');
const RoomManagerInterface = require('./websocket/managers/RoomManagerInterface');

class YjsWebSocketServer {
  constructor(server) {
    this.server = server;
    this.wss = null;
    
    // Initialize core managers
    this.roomManager = new RoomManager();
    this.roomManagerInterface = new RoomManagerInterface(this);
    this.documentStateManager = new DocumentStateManager(this.roomManagerInterface);
    
    // Initialize feature managers first
    this.videoCallManager = new VideoCallManager(this.roomManagerInterface);
    this.chatManager = new ChatManager(this.roomManagerInterface);
    this.fileEventManager = new FileEventManager(this.roomManagerInterface);
    
    // Initialize user presence manager with video call manager reference
    this.userPresenceManager = new UserPresenceManager(this.roomManagerInterface, this.videoCallManager);
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
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      let docName = 'default';
      
      console.log(`🔍 [WEBSOCKET-CONNECT] New connection from ${clientIP}, URL: ${urlPath}`);
      
      // Y-WebSocket client sends room name as the second path segment
      // Example: /yjs-websocket/session123%2Fsrc-main-js or /yjs-websocket/session123/file.js
      if (urlPath.startsWith('/yjs-websocket/')) {
        const pathParts = urlPath.split('?')[0]; // Remove query parameters first
        const pathSegments = pathParts.split('/');
        
        console.log(`🔍 [WEBSOCKET-CONNECT] Path segments:`, pathSegments);
        
        if (pathSegments.length >= 4) {
          // Full path: /yjs-websocket/sessionId/fileName -> extract sessionId/fileName  
          const sessionId = decodeURIComponent(pathSegments[2]);
          const fileName = decodeURIComponent(pathSegments[3]);
          docName = `${sessionId}/${fileName}`;
          console.log(`📁 [WEBSOCKET-CONNECT] Extracted full room name: ${docName} (sessionId: ${sessionId}, fileName: ${fileName})`);
        } else if (pathSegments.length >= 3) {
          // Fallback: decode the single segment (might be URL-encoded full path)
          const encodedRoom = pathSegments[2];
          docName = decodeURIComponent(encodedRoom);
          console.log(`📁 [WEBSOCKET-CONNECT] Extracted room name from encoded segment: ${docName}`);
        }
      }
      
      // If no room name found, try extracting from query parameters
      if (docName === 'default' && urlPath.includes('?')) {
        const params = new URLSearchParams(urlPath.split('?')[1]);
        docName = params.get('room') || params.get('doc') || 'default';
        console.log(`📁 [WEBSOCKET-CONNECT] Room name from params: ${docName}`);
      }
      
      console.log(`🔗 [WEBSOCKET-CONNECT] Established connection for document: ${docName} from ${clientIP}`);
      
      // Store document name for our custom handling
      ws.docName = docName;
      ws.isAlive = true;
      ws.lastActivity = Date.now();
      ws.clientIP = clientIP;
      
      // Track this connection in room
      this.roomManager.addClientToRoom(docName, ws);
      console.log(`🏠 [WEBSOCKET-CONNECT] Added client to room ${docName}, total connections: ${this.roomManager.getConnectionCount(docName)}`);
      
      // Check if this is a video session and send call status
      const isVideoSession = docName.startsWith('video-');
      if (isVideoSession) {
        // Extract sessionId from video room name formats:
        // Format: "video-sessionId/video-sessionId" -> extract the sessionId part
        let sessionId = docName;
        
        // Remove the "video-" prefix
        sessionId = sessionId.replace(/^video-/, '');
        
        // If it contains a slash and duplicate video room name, extract just the sessionId
        if (sessionId.includes('/video-')) {
          sessionId = sessionId.split('/video-')[0];
        }
        
        console.log(`📹 [WEBSOCKET-CONNECT] Video session detected for sessionId: ${sessionId}, roomName: ${docName}`);
        setTimeout(() => {
          this.videoCallManager.sendCallStatusToUser(ws, sessionId);
        }, 100); // Small delay to ensure connection is fully established
      }
      
      // PRODUCTION FIX: Send existing document state to new connections
      // DISABLED: This causes content duplication in production due to WebSocket connection instability
      // Let Y.js clients handle their own document synchronization through standard y-websocket protocol
      setTimeout(() => {
        // this.documentStateManager.sendExistingDocumentState(ws, docName); // DISABLED
        console.log(`🔄 [WEBSOCKET-CONNECT] Y.js client will handle document synchronization for: ${docName}`);
      }, 50);
      
      // Set up additional initialization for new connections
      setTimeout(() => {
        // Send recent chat history to new user (this is safe)
        this.chatManager.sendChatHistoryToUser(ws, docName);
        
        // Send recent file event history to new user (this is safe)
        this.fileEventManager.sendFileHistoryToUser(ws, docName);
      }, 100); // Small delay to ensure client is ready
      
      // Set up heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastActivity = Date.now();
      });

      // Handle messages - simple Y.js message forwarding
      ws.on('message', (message) => {
        try {
          // PRODUCTION FIX: Properly detect JSON vs binary Y.js messages
          
          // Only try to parse as JSON if it's clearly a string message
          if (typeof message === 'string') {
            try {
              const data = JSON.parse(message);
              if (data.type && typeof data.type === 'string' && this.isCustomMessageType(data.type)) {
                this.handleCustomMessage(ws, data);
                return; // Don't pass to Y.js if it's our custom message
              }
            } catch {
              // Not valid JSON, treat as Y.js binary
            }
          } else if (Buffer.isBuffer(message) && message.length > 0) {
            // Check if it's a JSON string in buffer format
            try {
              const messageString = message.toString('utf8');
              if (messageString.startsWith('{') && messageString.endsWith('}')) {
                const data = JSON.parse(messageString);
                if (data.type && typeof data.type === 'string' && this.isCustomMessageType(data.type)) {
                  this.handleCustomMessage(ws, data);
                  return; // Don't pass to Y.js if it's our custom message
                }
              }
            } catch {
              // Not JSON, treat as Y.js binary - this is the most common case
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
    this.roomManager.startHeartbeat(this.wss);

    console.log('✅ Y-WebSocket server initialized with proper Y.js support');
  }

  /**
   * Check if message type is one of our custom types
   */
  isCustomMessageType(type) {
    // Check if it's a video message first
    if (this.videoCallManager.isVideoMessage(type)) {
      return true;
    }
    
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
    
    return false;
  }

  /**
   * Handle custom control messages (non-Y.js protocol)
   */
  handleCustomMessage(ws, data) {
    const { type } = data;
    
    // Delegate video messages to Video Call Manager
    if (this.videoCallManager.isVideoMessage(type)) {
      this.videoCallManager.handleVideoMessage(ws, data);
      return;
    }
    
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
    this.videoCallManager.handleUserDisconnect(ws);
    this.chatManager.handleUserDisconnect(ws);
    this.fileEventManager.handleUserDisconnect(ws);
    this.userPresenceManager.handleUserDisconnect(ws);
    
    // Remove from room
    if (ws.docName) {
      this.roomManager.removeClientFromRoom(ws.docName, ws);
    }
  }

  /**
   * Broadcast Y.js binary message to other clients in the same room
   * Enhanced with production-safe document state preservation
   */
  broadcastYjsMessage(ws, message) {
    // PRODUCTION FIX: Disable server-side Y.js processing to prevent content duplication
    // The server-side Y.js processing was causing corruption and content duplication errors
    // in production environments. It's safer to use Y.js as a simple message relay.
    
    const shouldProcessUpdate = false; // Always false for production safety
    
    console.log(`🔄 Broadcasting Y.js message as simple relay (no server-side processing)`);
    
    this.roomManager.broadcastYjsMessage(
      ws, 
      message, 
      shouldProcessUpdate, // Always false
      null // No callback needed
    );
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
    const videoCallStats = this.videoCallManager.getActiveCallsStats();
    const chatStats = this.chatManager.getChatStats();
    const fileEventStats = this.fileEventManager.getFileEventStats();
    const userPresenceStats = this.userPresenceManager.getUserPresenceStats();
    const documentStats = this.documentStateManager.getDocumentStats();
    
    return {
      ...roomStats,
      videoCalls: videoCallStats,
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
      console.log('🛑 Shutting down Y-WebSocket server...');
      
      // Cleanup managers
      this.roomManager.cleanup();
      this.documentStateManager.cleanup();
      this.userPresenceManager.cleanup();
      this.videoCallManager.cleanup();
      this.chatManager.cleanup();
      this.fileEventManager.cleanup();
      
      // Close all connections
      this.wss.clients.forEach(ws => {
        ws.terminate();
      });
      
      // Clear WebSocket server
      this.wss.close();
      
      console.log('✅ Y-WebSocket server shutdown complete');
    }
  }
}

module.exports = YjsWebSocketServer;
