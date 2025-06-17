/**
 * User Presence Manager
 * Handles user information, presence updates, and connection tracking
 */

class UserPresenceManager {
  constructor(roomManagerInterface, videoCallManager = null) {
    this.roomManagerInterface = roomManagerInterface;
    this.videoCallManager = videoCallManager;
    this.connectionsByUser = new Map(); // Track connections by user
  }

  /**
   * Check if message type is user presence related
   */
  isUserPresenceMessage(type) {
    return ['set-user-info', 'user-presence'].includes(type);
  }

  /**
   * Handle user presence messages
   */
  handleUserPresenceMessage(ws, data) {
    const { type } = data;
    
    switch (type) {
      case 'set-user-info':
        this.updateUserInfo(ws, data.userInfo);
        break;
      case 'user-presence':
        this.broadcastUserPresence(ws, data);
        break;
      default:
        console.warn(`⚠️ Unknown user presence message type: ${type}`);
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
    
    // Check if this is a video session and send call status
    if (docName && docName.startsWith('video-')) {
      // Extract sessionId from video room name formats:
      // Format: "video-sessionId/video-sessionId" -> extract the sessionId part
      let sessionId = docName.replace(/^video-/, '');
      
      // If it contains a slash and duplicate video room name, extract just the sessionId
      if (sessionId.includes('/video-')) {
        sessionId = sessionId.split('/video-')[0];
      }
      
      console.log(`📹 [USER-PRESENCE] Video session detected for user ${ws.userEmail}, sessionId: ${sessionId}, roomName: ${docName}`);
      
      // Get the video call manager from the server and send call status
      if (this.videoCallManager) {
        this.videoCallManager.sendCallStatusToUser(ws, sessionId);
      }
    }
    
    // Notify other users in room about updated user info
    this.roomManagerInterface.broadcastToRoom(docName, {
      type: 'user-info-updated',
      room: docName,
      user: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName,
        joinedAt: ws.joinedAt
      },
      totalUsers: this.roomManagerInterface.getRoomSize(docName)
    }, ws);
  }

  /**
   * Broadcast user presence updates
   */
  broadcastUserPresence(ws, data) {
    const { room, sessionId } = data;
    const roomName = room || sessionId;
    console.log(`👤 Broadcasting user presence in room: ${roomName}`);
    
    this.roomManagerInterface.broadcastToRoom(roomName, {
      ...data,
      type: 'user-presence',
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Handle user disconnect - cleanup user tracking
   */
  handleUserDisconnect(ws) {
    // Remove from user tracking
    if (ws.userEmail && ws.docName) {
      const userKey = `${ws.userEmail}-${ws.docName}`;
      if (this.connectionsByUser.has(userKey)) {
        this.connectionsByUser.get(userKey).delete(ws);
        if (this.connectionsByUser.get(userKey).size === 0) {
          this.connectionsByUser.delete(userKey);
        }
      }
    }
    
    // Notify other users about departure
    if (ws.userEmail && ws.docName) {
      this.roomManagerInterface.broadcastToRoom(ws.docName, {
        type: 'user-left',
        room: ws.docName,
        user: {
          userId: ws.userId,
          email: ws.userEmail
        },
        totalUsers: this.roomManagerInterface.getRoomSize(ws.docName)
      });
    }
  }

  /**
   * Get connections by user key to prevent duplicates
   */
  getConnectionsByUserKey(userKey) {
    return this.connectionsByUser.get(userKey) || new Set();
  }

  /**
   * Get user presence statistics
   */
  getUserPresenceStats() {
    return {
      totalUserConnections: this.connectionsByUser.size,
      userConnections: Array.from(this.connectionsByUser.entries()).map(([userKey, connections]) => ({
        userKey,
        connectionCount: connections.size
      }))
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.connectionsByUser.clear();
    console.log('🧹 User Presence Manager cleaned up');
  }
}

module.exports = UserPresenceManager;
