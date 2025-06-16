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
    this.userPresenceManager = new UserPresenceManager(this.roomManagerInterface);
    
    // Initialize feature managers
    this.videoCallManager = new VideoCallManager(this.roomManagerInterface);
    this.chatManager = new ChatManager(this.roomManagerInterface);
    this.fileEventManager = new FileEventManager(this.roomManagerInterface);
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
      
      // Track this connection in room
      this.roomManager.addClientToRoom(docName, ws);
      
      // PRODUCTION FIX: Send existing document state to new connections
      // This prevents content duplication when users join existing collaborative sessions
      setTimeout(() => {
        this.documentStateManager.sendExistingDocumentState(ws, docName);
        
        // Send recent chat history to new user
        this.chatManager.sendChatHistoryToUser(ws, docName);
        
        // Send recent file event history to new user
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
    // PRODUCTION FIX: Only process Y.js updates for document editing rooms
    const shouldProcessUpdate = this.documentStateManager.shouldProcessYjsUpdate(ws.docName);
    
    this.roomManager.broadcastYjsMessage(
      ws, 
      message, 
      shouldProcessUpdate, 
      (room, updateBuffer) => this.documentStateManager.processYjsUpdate(room, updateBuffer)
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
