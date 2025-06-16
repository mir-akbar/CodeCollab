/**
 * Room Manager Interface
 * Provides room management functionality for other managers
 * This is a simple interface that delegates to the main YjsWebSocketServer
 */

class RoomManagerInterface {
  constructor(yjsWebSocketServer) {
    this.server = yjsWebSocketServer;
  }

  /**
   * Broadcast message to all clients in room except sender
   */
  broadcastToRoom(room, message, excludeWs = null) {
    return this.server.broadcastToRoom(room, message, excludeWs);
  }

  /**
   * Send message to specific user in room
   */
  sendToUser(room, targetUserId, message) {
    return this.server.sendToUser(room, targetUserId, message);
  }

  /**
   * Get all users in a room
   */
  getRoomUsers(room) {
    return this.server.getRoomUsers(room);
  }

  /**
   * Check if a room exists
   */
  hasRoom(room) {
    return this.server.hasRoom(room);
  }

  /**
   * Get room size
   */
  getRoomSize(room) {
    return this.server.roomManager.getRoomSize(room);
  }

  /**
   * Get room statistics
   */
  getRoomStats() {
    return this.server.getStats();
  }
}

module.exports = RoomManagerInterface;
