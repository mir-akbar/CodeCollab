/**
 * Video Call Manager
 * Handles WebRTC signaling and video call coordination for collaborative sessions
 * Extracted from YjsWebSocketServer for better separation of concerns
 */

class VideoCallManager {
  constructor(roomManager) {
    this.roomManager = roomManager;
    this.activeVideoCalls = new Map(); // Track active video calls per room
    this.callParticipants = new Map(); // Track participants in each call
  }

  /**
   * Check if message type is video-related
   */
  isVideoMessage(type) {
    const videoMessageTypes = [
      'video-call-start',
      'video-call-join', 
      'video-call-leave',
      'video-offer',
      'video-answer',
      'video-ice-candidate',
      'video-media-state',
      'video-signal'
    ];
    return videoMessageTypes.includes(type);
  }

  /**
   * Handle video-related messages
   */
  handleVideoMessage(ws, data) {
    const { type } = data;
    
    switch (type) {
      case 'video-call-start':
        this.handleVideoCallStart(ws, data);
        break;
      case 'video-call-join':
        this.handleVideoCallJoin(ws, data);
        break;
      case 'video-call-leave':
        this.handleVideoCallLeave(ws, data);
        break;
      case 'video-offer':
        this.handleVideoOffer(ws, data);
        break;
      case 'video-answer':
        this.handleVideoAnswer(ws, data);
        break;
      case 'video-ice-candidate':
        this.handleVideoIceCandidate(ws, data);
        break;
      case 'video-media-state':
        this.handleVideoMediaState(ws, data);
        break;
      case 'video-signal':
        this.handleVideoSignal(ws, data);
        break;
      default:
        console.warn(`⚠️ Unknown video message type: ${type}`);
    }
  }

  /**
   * Handle video call start
   */
  handleVideoCallStart(ws, data) {
    const { sessionId } = data;
    console.log(`📹 Video call started in session: ${sessionId} by ${ws.userEmail}`);
    
    // Track the active video call
    this.activeVideoCalls.set(sessionId, {
      initiator: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName
      },
      startedAt: new Date().toISOString(),
      participants: new Set([ws.userId])
    });
    
    this.callParticipants.set(sessionId, new Set([ws.userId]));
    
    this.roomManager.broadcastToRoom(sessionId, {
      type: 'video-call-started',
      sessionId,
      initiator: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName
      },
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Handle user joining video call
   */
  handleVideoCallJoin(ws, data) {
    const { sessionId } = data;
    console.log(`📹 User ${ws.userEmail} joining video call in session: ${sessionId}`);
    
    // Add participant to call tracking
    if (this.callParticipants.has(sessionId)) {
      this.callParticipants.get(sessionId).add(ws.userId);
    } else {
      this.callParticipants.set(sessionId, new Set([ws.userId]));
    }
    
    // Update active call info
    if (this.activeVideoCalls.has(sessionId)) {
      this.activeVideoCalls.get(sessionId).participants.add(ws.userId);
    }
    
    this.roomManager.broadcastToRoom(sessionId, {
      type: 'video-call-user-joined',
      sessionId,
      user: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName
      },
      participantCount: this.callParticipants.get(sessionId)?.size || 1,
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Handle user leaving video call
   */
  handleVideoCallLeave(ws, data) {
    const { sessionId } = data;
    console.log(`📹 User ${ws.userEmail} leaving video call in session: ${sessionId}`);
    
    // Remove participant from call tracking
    if (this.callParticipants.has(sessionId)) {
      this.callParticipants.get(sessionId).delete(ws.userId);
      
      // Clean up empty calls
      if (this.callParticipants.get(sessionId).size === 0) {
        this.callParticipants.delete(sessionId);
        this.activeVideoCalls.delete(sessionId);
        console.log(`📹 Video call ended in session: ${sessionId} (no participants left)`);
      }
    }
    
    // Update active call info
    if (this.activeVideoCalls.has(sessionId)) {
      this.activeVideoCalls.get(sessionId).participants.delete(ws.userId);
    }
    
    this.roomManager.broadcastToRoom(sessionId, {
      type: 'video-call-user-left',
      sessionId,
      user: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName
      },
      participantCount: this.callParticipants.get(sessionId)?.size || 0,
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Handle WebRTC offer
   */
  handleVideoOffer(ws, data) {
    const { sessionId, targetUserId, offer } = data;
    console.log(`📹 WebRTC offer from ${ws.userEmail} to ${targetUserId}`);
    
    this.roomManager.sendToUser(sessionId, targetUserId, {
      type: 'video-offer',
      sessionId,
      offer,
      from: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle WebRTC answer
   */
  handleVideoAnswer(ws, data) {
    const { sessionId, targetUserId, answer } = data;
    console.log(`📹 WebRTC answer from ${ws.userEmail} to ${targetUserId}`);
    
    this.roomManager.sendToUser(sessionId, targetUserId, {
      type: 'video-answer',
      sessionId,
      answer,
      from: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle ICE candidate exchange
   */
  handleVideoIceCandidate(ws, data) {
    const { sessionId, targetUserId, candidate } = data;
    console.log(`📹 ICE candidate from ${ws.userEmail} to ${targetUserId}`);
    
    this.roomManager.sendToUser(sessionId, targetUserId, {
      type: 'video-ice-candidate',
      sessionId,
      candidate,
      from: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle media state changes (mute/unmute, video on/off)
   */
  handleVideoMediaState(ws, data) {
    const { sessionId, hasVideo, hasAudio } = data;
    console.log(`📹 Media state change from ${ws.userEmail}: video=${hasVideo}, audio=${hasAudio}`);
    
    this.roomManager.broadcastToRoom(sessionId, {
      type: 'video-media-state-changed',
      sessionId,
      user: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName
      },
      hasVideo,
      hasAudio,
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Handle generic video signaling (backwards compatibility)
   */
  handleVideoSignal(ws, data) {
    const { room, sessionId, targetUser } = data;
    const roomName = room || sessionId;
    console.log(`📹 Broadcasting video signal in room: ${roomName}`);
    
    if (targetUser) {
      // Direct message to specific user
      this.roomManager.sendToUser(roomName, targetUser, data);
    } else {
      // Broadcast to all users in room
      this.roomManager.broadcastToRoom(roomName, {
        ...data,
        type: 'video-signal',
        timestamp: new Date().toISOString()
      }, ws);
    }
  }

  /**
   * Handle user disconnection - clean up video call state
   */
  handleUserDisconnect(ws) {
    const { userId, docName } = ws;
    if (!userId || !docName) return;
    
    // Extract session ID from docName (format: sessionId/fileName)
    const sessionId = docName.includes('/') ? docName.split('/')[0] : docName;
    
    // Remove user from any active calls
    if (this.callParticipants.has(sessionId)) {
      this.callParticipants.get(sessionId).delete(userId);
      
      // Clean up empty calls
      if (this.callParticipants.get(sessionId).size === 0) {
        this.callParticipants.delete(sessionId);
        this.activeVideoCalls.delete(sessionId);
        console.log(`📹 Video call ended in session: ${sessionId} (last participant disconnected)`);
      } else {
        // Notify remaining participants
        this.roomManager.broadcastToRoom(sessionId, {
          type: 'video-call-user-left',
          sessionId,
          user: {
            userId: ws.userId,
            email: ws.userEmail,
            name: ws.userName
          },
          participantCount: this.callParticipants.get(sessionId).size,
          reason: 'disconnected',
          timestamp: new Date().toISOString()
        }, ws);
      }
    }
    
    // Update active call info
    if (this.activeVideoCalls.has(sessionId)) {
      this.activeVideoCalls.get(sessionId).participants.delete(userId);
    }
  }

  /**
   * Get active video calls statistics
   */
  getActiveCallsStats() {
    return {
      totalActiveCalls: this.activeVideoCalls.size,
      calls: Array.from(this.activeVideoCalls.entries()).map(([sessionId, callInfo]) => ({
        sessionId,
        participantCount: this.callParticipants.get(sessionId)?.size || 0,
        startedAt: callInfo.startedAt,
        initiator: callInfo.initiator
      }))
    };
  }

  /**
   * Check if a session has an active video call
   */
  hasActiveCall(sessionId) {
    return this.activeVideoCalls.has(sessionId) && 
           this.callParticipants.has(sessionId) && 
           this.callParticipants.get(sessionId).size > 0;
  }

  /**
   * Get participants in a video call
   */
  getCallParticipants(sessionId) {
    return this.callParticipants.get(sessionId) || new Set();
  }

  /**
   * Force end a video call (for admin purposes)
   */
  endCall(sessionId, reason = 'admin') {
    if (this.activeVideoCalls.has(sessionId)) {
      console.log(`📹 Force ending video call in session: ${sessionId} (reason: ${reason})`);
      
      this.roomManager.broadcastToRoom(sessionId, {
        type: 'video-call-ended',
        sessionId,
        reason,
        timestamp: new Date().toISOString()
      });
      
      this.callParticipants.delete(sessionId);
      this.activeVideoCalls.delete(sessionId);
      
      return true;
    }
    return false;
  }

  /**
   * Cleanup all video call state
   */
  cleanup() {
    console.log('🧹 Cleaning up video call manager...');
    this.activeVideoCalls.clear();
    this.callParticipants.clear();
  }
}

module.exports = VideoCallManager;
