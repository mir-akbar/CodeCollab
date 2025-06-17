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
      'video-call-end',
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
      case 'video-call-end':
        this.handleVideoCallEnd(ws, data);
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
    console.log(`🎬 [VIDEO-CALL] Call start requested in session: ${sessionId} by ${ws.userEmail}`);
    console.log(`🎬 [VIDEO-CALL] User details: userId=${ws.userId}, name=${ws.userName}`);
    
    // CHECK: If call already exists, join it instead of starting new one
    if (this.hasActiveCall(sessionId)) {
      console.log(`⚠️ [VIDEO-CALL] Call already exists in session ${sessionId}, converting to join request`);
      this.handleVideoCallJoin(ws, data);
      return;
    }
    
    console.log(`🎬 [VIDEO-CALL] Creating new call in session: ${sessionId}`);
    
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
    
    console.log(`🎬 [VIDEO-CALL] Active calls after start: ${this.activeVideoCalls.size}`);
    console.log(`🎬 [VIDEO-CALL] Participants in ${sessionId}: ${this.callParticipants.get(sessionId)?.size || 0}`);
    
    // Broadcast to main session room
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
    
    // CRITICAL FIX: Also broadcast to video room for users who are only on video tab
    const videoRoomName = `video-${sessionId}`;
    this.roomManager.broadcastToRoom(videoRoomName, {
      type: 'video-call-started',
      sessionId,
      initiator: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName
      },
      timestamp: new Date().toISOString()
    }, ws);
    
    console.log(`🎬 [VIDEO-CALL] Broadcasted call-started event to session room: ${sessionId}`);
    console.log(`🎬 [VIDEO-CALL] Broadcasted call-started event to video room: ${videoRoomName}`);
  }

  /**
   * Handle user joining video call
   */
  handleVideoCallJoin(ws, data) {
    const { sessionId } = data;
    console.log(`� [VIDEO-CALL-JOIN] User ${ws.userEmail} (${ws.userId}) joining call in session: ${sessionId}`);
    
    // Check if there's an active call to join
    if (!this.hasActiveCall(sessionId)) {
      console.log(`❌ [VIDEO-CALL-JOIN] No active call in session ${sessionId} for ${ws.userEmail} to join`);
      this.roomManager.sendToUser(sessionId, ws.userId, {
        type: 'video-call-error',
        sessionId,
        error: 'No active call to join',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Add participant to call tracking
    if (this.callParticipants.has(sessionId)) {
      this.callParticipants.get(sessionId).add(ws.userId);
      console.log(`🚪 [VIDEO-CALL-JOIN] Added ${ws.userEmail} to existing participant list. New count: ${this.callParticipants.get(sessionId).size}`);
    } else {
      this.callParticipants.set(sessionId, new Set([ws.userId]));
      console.log(`🚪 [VIDEO-CALL-JOIN] Created new participant list for ${sessionId} with ${ws.userEmail}`);
    }
    
    // Update active call info
    if (this.activeVideoCalls.has(sessionId)) {
      this.activeVideoCalls.get(sessionId).participants.add(ws.userId);
      console.log(`🚪 [VIDEO-CALL-JOIN] Updated active call participants for ${sessionId}`);
    }
    
    const participantCount = this.callParticipants.get(sessionId)?.size || 1;
    console.log(`🚪 [VIDEO-CALL-JOIN] Broadcasting user-joined event to room ${sessionId}, participant count: ${participantCount}`);
    
    const userJoinedMessage = {
      type: 'video-call-user-joined',
      sessionId,
      user: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName
      },
      participantCount,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to both session room and video room
    this.roomManager.broadcastToRoom(sessionId, userJoinedMessage, ws);
    
    const videoRoomName = `video-${sessionId}`;
    this.roomManager.broadcastToRoom(videoRoomName, userJoinedMessage, ws);
    
    console.log(`✅ [VIDEO-CALL-JOIN] Successfully processed join for ${ws.userEmail} in session ${sessionId}`);
  }

  /**
   * Handle user leaving video call
   */
  handleVideoCallLeave(ws, data) {
    const { sessionId } = data;
    console.log(`� [VIDEO-CALL-LEAVE] User ${ws.userEmail} (${ws.userId}) leaving call in session: ${sessionId}`);
    
    // Remove participant from call tracking
    if (this.callParticipants.has(sessionId)) {
      const hadParticipant = this.callParticipants.get(sessionId).has(ws.userId);
      this.callParticipants.get(sessionId).delete(ws.userId);
      console.log(`🚪 [VIDEO-CALL-LEAVE] Removed ${ws.userEmail} from participants (was present: ${hadParticipant}). Remaining: ${this.callParticipants.get(sessionId).size}`);
      
      // CRITICAL FIX: Only clean up calls when explicitly requested, not on disconnect
      // Check if this is an explicit leave (user clicked leave) vs disconnect
      const isExplicitLeave = data.explicit === true;
      
      if (this.callParticipants.get(sessionId).size === 0 && isExplicitLeave) {
        this.callParticipants.delete(sessionId);
        this.activeVideoCalls.delete(sessionId);
        console.log(`� [VIDEO-CALL-LEAVE] Call ended in session: ${sessionId} (explicitly ended by last participant)`);
      } else if (this.callParticipants.get(sessionId).size === 0) {
        console.log(`⏸️ [VIDEO-CALL-LEAVE] Call paused in session: ${sessionId} (all participants disconnected but call remains active)`);
      }
    } else {
      console.log(`⚠️ [VIDEO-CALL-LEAVE] No participant list found for session ${sessionId}`);
    }
    
    // Update active call info
    if (this.activeVideoCalls.has(sessionId)) {
      this.activeVideoCalls.get(sessionId).participants.delete(ws.userId);
      console.log(`🚪 [VIDEO-CALL-LEAVE] Updated active call participants for ${sessionId}`);
    }
    
    const remainingCount = this.callParticipants.get(sessionId)?.size || 0;
    console.log(`🚪 [VIDEO-CALL-LEAVE] Broadcasting user-left event to room ${sessionId}, remaining count: ${remainingCount}`);
    
    const userLeftMessage = {
      type: 'video-call-user-left',
      sessionId,
      user: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName
      },
      participantCount: remainingCount,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to both session room and video room
    this.roomManager.broadcastToRoom(sessionId, userLeftMessage, ws);
    
    const videoRoomName = `video-${sessionId}`;
    this.roomManager.broadcastToRoom(videoRoomName, userLeftMessage, ws);
    
    console.log(`✅ [VIDEO-CALL-LEAVE] Successfully processed leave for ${ws.userEmail} in session ${sessionId}`);
  }

  /**
   * Handle WebRTC offer
   */
  handleVideoOffer(ws, data) {
    const { sessionId, targetUserId, offer } = data;
    console.log(`🤝 [VIDEO-OFFER] From ${ws.userEmail} (${ws.userId}) to ${targetUserId} in session ${sessionId}`);
    console.log(`🤝 [VIDEO-OFFER] Offer type: ${offer?.type}, SDP length: ${offer?.sdp?.length || 0}`);
    
    // Verify both users are in the call
    const isOfferrerInCall = this.callParticipants.get(sessionId)?.has(ws.userId);
    const isTargetInCall = this.callParticipants.get(sessionId)?.has(targetUserId);
    
    console.log(`🤝 [VIDEO-OFFER] Offerrer in call: ${isOfferrerInCall}, Target in call: ${isTargetInCall}`);
    
    if (!isOfferrerInCall || !isTargetInCall) {
      console.log(`❌ [VIDEO-OFFER] Rejecting offer - one or both users not in call`);
      return;
    }
    
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
    
    console.log(`✅ [VIDEO-OFFER] Successfully forwarded offer from ${ws.userEmail} to ${targetUserId}`);
  }

  /**
   * Handle WebRTC answer
   */
  handleVideoAnswer(ws, data) {
    const { sessionId, targetUserId, answer } = data;
    console.log(`🤝 [VIDEO-ANSWER] From ${ws.userEmail} (${ws.userId}) to ${targetUserId} in session ${sessionId}`);
    console.log(`🤝 [VIDEO-ANSWER] Answer type: ${answer?.type}, SDP length: ${answer?.sdp?.length || 0}`);
    
    // Verify both users are in the call
    const isAnswererInCall = this.callParticipants.get(sessionId)?.has(ws.userId);
    const isTargetInCall = this.callParticipants.get(sessionId)?.has(targetUserId);
    
    console.log(`🤝 [VIDEO-ANSWER] Answerer in call: ${isAnswererInCall}, Target in call: ${isTargetInCall}`);
    
    if (!isAnswererInCall || !isTargetInCall) {
      console.log(`❌ [VIDEO-ANSWER] Rejecting answer - one or both users not in call`);
      return;
    }
    
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
    
    console.log(`✅ [VIDEO-ANSWER] Successfully forwarded answer from ${ws.userEmail} to ${targetUserId}`);
  }

  /**
   * Handle ICE candidate exchange
   */
  handleVideoIceCandidate(ws, data) {
    const { sessionId, targetUserId, candidate } = data;
    console.log(`🧊 [VIDEO-ICE] From ${ws.userEmail} (${ws.userId}) to ${targetUserId} in session ${sessionId}`);
    console.log(`🧊 [VIDEO-ICE] Candidate type: ${candidate?.candidate?.split(' ')[7] || 'unknown'}, component: ${candidate?.component || 'unknown'}`);
    
    // Verify both users are in the call
    const isSenderInCall = this.callParticipants.get(sessionId)?.has(ws.userId);
    const isTargetInCall = this.callParticipants.get(sessionId)?.has(targetUserId);
    
    console.log(`🧊 [VIDEO-ICE] Sender in call: ${isSenderInCall}, Target in call: ${isTargetInCall}`);
    
    if (!isSenderInCall || !isTargetInCall) {
      console.log(`❌ [VIDEO-ICE] Rejecting ICE candidate - one or both users not in call`);
      return;
    }
    
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
    
    console.log(`✅ [VIDEO-ICE] Successfully forwarded ICE candidate from ${ws.userEmail} to ${targetUserId}`);
  }

  /**
   * Handle media state changes (mute/unmute, video on/off)
   */
  handleVideoMediaState(ws, data) {
    const { sessionId, hasVideo, hasAudio } = data;
    console.log(`🎤 [VIDEO-MEDIA] State change from ${ws.userEmail} (${ws.userId}) in session ${sessionId}`);
    console.log(`🎤 [VIDEO-MEDIA] New state - Video: ${hasVideo}, Audio: ${hasAudio}`);
    
    // Verify user is in the call
    const isUserInCall = this.callParticipants.get(sessionId)?.has(ws.userId);
    console.log(`🎤 [VIDEO-MEDIA] User in call: ${isUserInCall}`);
    
    if (!isUserInCall) {
      console.log(`❌ [VIDEO-MEDIA] Rejecting media state change - user not in call`);
      return;
    }
    
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
    
    console.log(`✅ [VIDEO-MEDIA] Successfully broadcasted media state change from ${ws.userEmail}`);
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
   * Send current call status to a user (for when they connect)
   */
  sendCallStatusToUser(ws, sessionId) {
    console.log(`📊 [VIDEO-STATUS] Checking call status for ${ws.userEmail} (${ws.userId}) in session ${sessionId}`);
    
    if (this.hasActiveCall(sessionId)) {
      const callInfo = this.activeVideoCalls.get(sessionId);
      const participantCount = this.callParticipants.get(sessionId)?.size || 0;
      
      console.log(`📊 [VIDEO-STATUS] Found active call in ${sessionId}:`);
      console.log(`📊 [VIDEO-STATUS] - Participant count: ${participantCount}`);
      console.log(`📊 [VIDEO-STATUS] - Initiator: ${callInfo.initiator.email} (${callInfo.initiator.userId})`);
      console.log(`📊 [VIDEO-STATUS] - Started at: ${callInfo.startedAt}`);
      
      // Send call status directly to the WebSocket connection
      const statusMessage = {
        type: 'video-call-status',
        sessionId,
        hasActiveCall: true,
        participantCount,
        initiator: callInfo.initiator,
        startedAt: callInfo.startedAt,
        timestamp: new Date().toISOString()
      };
      
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(statusMessage));
        console.log(`✅ [VIDEO-STATUS] Sent active call status directly to ${ws.userEmail}: ${participantCount} participants`);
      } else {
        console.log(`⚠️ [VIDEO-STATUS] WebSocket not open for ${ws.userEmail}, cannot send status`);
      }
    } else {
      console.log(`📊 [VIDEO-STATUS] No active call in session ${sessionId} for ${ws.userEmail}`);
      
      // Send "no active call" status to clear any stale state
      const statusMessage = {
        type: 'video-call-status',
        sessionId,
        hasActiveCall: false,
        participantCount: 0,
        timestamp: new Date().toISOString()
      };
      
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(statusMessage));
        console.log(`✅ [VIDEO-STATUS] Sent 'no active call' status to ${ws.userEmail}`);
      }
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
      
      const endedMessage = {
        type: 'video-call-ended',
        sessionId,
        reason,
        timestamp: new Date().toISOString()
      };
      
      this.roomManager.broadcastToRoom(sessionId, endedMessage);
      
      const videoRoomName = `video-${sessionId}`;
      this.roomManager.broadcastToRoom(videoRoomName, endedMessage);
      
      this.callParticipants.delete(sessionId);
      this.activeVideoCalls.delete(sessionId);
      
      return true;
    }
    return false;
  }

  /**
   * Handle explicit video call ending (not just disconnection)
   */
  handleVideoCallEnd(ws, data) {
    const { sessionId } = data;
    console.log(`🛑 [VIDEO-CALL-END] User ${ws.userEmail} (${ws.userId}) ending call in session: ${sessionId}`);
    
    // Remove participant and clean up call completely
    if (this.callParticipants.has(sessionId)) {
      this.callParticipants.get(sessionId).delete(ws.userId);
      console.log(`🛑 [VIDEO-CALL-END] Removed ${ws.userEmail} from participants. Remaining: ${this.callParticipants.get(sessionId).size}`);
    }
    
    // Always clean up call when explicitly ended
    this.callParticipants.delete(sessionId);
    this.activeVideoCalls.delete(sessionId);
    console.log(`🛑 [VIDEO-CALL-END] Call completely ended in session: ${sessionId}`);
    
    // Broadcast call ended event to both rooms
    const endedMessage = {
      type: 'video-call-ended',
      sessionId,
      endedBy: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName
      },
      timestamp: new Date().toISOString()
    };
    
    this.roomManager.broadcastToRoom(sessionId, endedMessage);
    
    const videoRoomName = `video-${sessionId}`;
    this.roomManager.broadcastToRoom(videoRoomName, endedMessage);
    
    console.log(`✅ [VIDEO-CALL-END] Successfully ended call for ${ws.userEmail} in session ${sessionId}`);
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
