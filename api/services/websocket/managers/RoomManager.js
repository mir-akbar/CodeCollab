/**
 * Room Manager
 * Handles room creation, management, and cleanup operations
 */

class RoomManager {
  constructor() {
    this.rooms = new Map(); // Track active rooms for our custom messaging
    this.heartbeatInterval = null;
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
   * Add client to room
   */
  addClientToRoom(room, ws) {
    if (!this.rooms.has(room)) {
      this.createRoom(room);
    }
    this.rooms.get(room).add(ws);
  }

  /**
   * Remove client from room
   */
  removeClientFromRoom(room, ws) {
    if (this.rooms.has(room)) {
      this.rooms.get(room).delete(ws);
      
      // Remove empty rooms
      if (this.rooms.get(room).size === 0) {
        this.rooms.delete(room);
        console.log(`🗑️  Removed empty room: ${room}`);
        return true; // Room was deleted
      }
    }
    return false; // Room still exists
  }

  /**
   * Get room size
   */
  getRoomSize(room) {
    return this.rooms.get(room)?.size || 0;
  }

  /**
   * Get all clients in a room
   */
  getRoomClients(room) {
    return this.rooms.get(room) || new Set();
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
            // Note: cleanup should be handled by the main server
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
            // Note: cleanup should be handled by the main server
          }
        }
      });
    }
  }

  /**
   * Broadcast Y.js binary message to other clients in the same room
   */
  broadcastYjsMessage(ws, message, shouldProcessUpdate, processYjsUpdateCallback) {
    const room = ws.docName;
    if (!room) {
      console.warn('⚠️ No room name for WebSocket, cannot broadcast');
      return;
    }
    
    // PRODUCTION FIX: Only process Y.js updates for document editing rooms
    // Skip processing for chat rooms to prevent Y.js parsing errors
    if (shouldProcessUpdate) {
      try {
        // Additional validation before processing Y.js updates
        if (Buffer.isBuffer(message) || message instanceof Uint8Array) {
          // Validate that the message looks like valid Y.js binary data
          if (message.length > 0) {
            // This is a Y.js binary update for document editing - process it to maintain server state
            processYjsUpdateCallback(room, message);
          } else {
            console.warn(`⚠️ Received empty Y.js message for room ${room}`);
          }
        } else {
          console.warn(`⚠️ Received non-binary Y.js message for room ${room}: ${typeof message}`);
        }
      } catch (error) {
        console.warn(`Error processing Y.js update for room ${room}:`, error.message);
        // Continue with broadcast even if processing fails
      }
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
            // Note: cleanup should be handled by the main server
          }
        }
      });
      
      console.log(`✅ Y.js message broadcasted to ${broadcastCount} clients in room "${room}"`);
    } else {
      console.warn(`⚠️ No clients found in room "${room}" for Y.js broadcast`);
    }
  }

  /**
   * Start heartbeat to detect dead connections
   */
  startHeartbeat(wss) {
    this.heartbeatInterval = setInterval(() => {
      wss.clients.forEach((ws) => {
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
   * Get room statistics
   */
  getRoomStats() {
    return {
      totalRooms: this.rooms.size,
      rooms: Array.from(this.rooms.entries()).map(([name, clients]) => ({
        name,
        clientCount: clients.size
      }))
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopHeartbeat();
    this.rooms.clear();
    console.log('🧹 Room Manager cleaned up');
  }
}

module.exports = RoomManager;
