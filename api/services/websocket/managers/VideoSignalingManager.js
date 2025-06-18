/**
 * Video Signaling Manager
 * Handles WebRTC signaling for simple mesh network video chat
 * Supports 3-5 users in peer-to-peer video sessions
 */

class VideoSignalingManager {
  constructor(roomManagerInterface) {
    this.roomManagerInterface = roomManagerInterface;
    
    // Track active video participants per session
    // Format: { sessionId: Set([userId1, userId2, ...]) }
    this.activeVideoSessions = new Map();
    
    // Track user info for video participants
    // Format: { sessionId: Map(userId -> {userEmail, userId}) }
    this.videoParticipantInfo = new Map();
  }

  /**
   * Check if message type is video signaling related
   */
  isVideoSignalingMessage(type) {
    const videoMessageTypes = [
      // User management
      'user-info',
      
      // Core WebRTC signaling
      'offer',
      'answer', 
      'ice-candidate',
      
      // Simple call management
      'join-video-call',
      'leave-video-call'
    ];
    return videoMessageTypes.includes(type);
  }

  /**
   * Handle video signaling messages
   */
  handleVideoSignalingMessage(ws, data) {
    const { type } = data;
    
    console.log(`🎥 [VIDEO-SIGNALING] Handling ${type} from ${ws.userEmail || 'unknown'} in session ${data.sessionId || 'unknown'}`);
    
    // Handle user-info message first (doesn't require existing user info)
    if (type === 'user-info') {
      this.handleUserInfo(ws, data);
      return;
    }
    
    // Validate required fields for other message types
    if (!data.sessionId) {
      console.warn(`⚠️ Missing sessionId in video signaling message type: ${type}`);
      return;
    }
    
    // Ensure user info is available for other message types
    if (!ws.userId || !ws.userEmail) {
      console.warn(`⚠️ Missing user info for video signaling from ${ws.clientIP}`);
      return;
    }
    
    switch (type) {
      case 'offer':
        this.handleOffer(ws, data);
        break;
      case 'answer':
        this.handleAnswer(ws, data);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(ws, data);
        break;
      case 'join-video-call':
        this.handleJoinVideoCall(ws, data);
        break;
      case 'leave-video-call':
        this.handleLeaveVideoCall(ws, data);
        break;
      default:
        console.warn(`⚠️ Unknown video signaling message type: ${type}`);
    }
  }

  /**
   * Handle user info message - set user information on WebSocket connection
   */
  handleUserInfo(ws, data) {
    const { userId, userEmail, sessionId } = data;
    
    if (!userId || !userEmail) {
      console.warn(`⚠️ Invalid user-info message: missing userId or userEmail`);
      return;
    }
    
    // Set user information on the WebSocket connection
    ws.userId = userId;
    ws.userEmail = userEmail;
    ws.sessionId = sessionId; // Update sessionId if provided
    
    console.log(`🎥 [VIDEO-SIGNALING] User info set: ${userEmail} (${userId}) in session ${sessionId}`);
  }

  /**
   * Handle WebRTC offer - forward to target user
   */
  handleOffer(ws, data) {
    const { sessionId, targetUserId, offer } = data;
    
    if (!targetUserId || !offer) {
      console.warn(`⚠️ Invalid offer message: missing targetUserId or offer`);
      return;
    }
    
    console.log(`🎥 [OFFER] From ${ws.userEmail} to user ${targetUserId} in session ${sessionId}`);
    
    // Forward offer to target user
    this.roomManagerInterface.sendToUser(sessionId, targetUserId, {
      type: 'offer',
      fromUserId: ws.userId,
      fromUserEmail: ws.userEmail,
      offer: offer,
      sessionId: sessionId
    });
  }

  /**
   * Handle WebRTC answer - forward to target user
   */
  handleAnswer(ws, data) {
    const { sessionId, targetUserId, answer } = data;
    
    if (!targetUserId || !answer) {
      console.warn(`⚠️ Invalid answer message: missing targetUserId or answer`);
      return;
    }
    
    console.log(`🎥 [ANSWER] From ${ws.userEmail} to user ${targetUserId} in session ${sessionId}`);
    
    // Forward answer to target user
    this.roomManagerInterface.sendToUser(sessionId, targetUserId, {
      type: 'answer',
      fromUserId: ws.userId,
      fromUserEmail: ws.userEmail,
      answer: answer,
      sessionId: sessionId
    });
  }

  /**
   * Handle ICE candidate - forward to target user
   */
  handleIceCandidate(ws, data) {
    const { sessionId, targetUserId, candidate } = data;
    
    if (!targetUserId || !candidate) {
      console.warn(`⚠️ Invalid ICE candidate message: missing targetUserId or candidate`);
      return;
    }
    
    console.log(`🎥 [ICE-CANDIDATE] From ${ws.userEmail} to user ${targetUserId} in session ${sessionId}`);
    
    // Forward ICE candidate to target user
    this.roomManagerInterface.sendToUser(sessionId, targetUserId, {
      type: 'ice-candidate',
      fromUserId: ws.userId,
      fromUserEmail: ws.userEmail,
      candidate: candidate,
      sessionId: sessionId
    });
  }

  /**
   * Handle user joining video call - mesh network approach
   */
  handleJoinVideoCall(ws, data) {
    const { sessionId } = data;
    const userId = ws.userId;
    const userEmail = ws.userEmail;
    
    console.log(`🎥 [JOIN-VIDEO-CALL] ${userEmail} joining video call in session ${sessionId}`);
    
    // Get or create participant set for this session
    if (!this.activeVideoSessions.has(sessionId)) {
      this.activeVideoSessions.set(sessionId, new Set());
    }
    
    // Get or create participant info map for this session
    if (!this.videoParticipantInfo.has(sessionId)) {
      this.videoParticipantInfo.set(sessionId, new Map());
    }
    
    const participants = this.activeVideoSessions.get(sessionId);
    const participantInfo = this.videoParticipantInfo.get(sessionId);
    
    // Get current participants WITH user info (before adding new user)
    const currentParticipants = Array.from(participants).map(participantId => {
      const info = participantInfo.get(participantId);
      return {
        userId: participantId,
        userEmail: info ? info.userEmail : 'Unknown User'
      };
    });
    
    // Add user to participants and store user info
    participants.add(userId);
    participantInfo.set(userId, { userId, userEmail });
    
    console.log(`🎥 [JOIN-VIDEO-CALL] Session ${sessionId} now has ${participants.size} participants`);
    
    // Send current participants list to the joining user
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'video-call-participants',
        participants: currentParticipants,
        sessionId: sessionId
      }));
    }
    
    // Notify existing participants about new user
    this.roomManagerInterface.broadcastToRoom(sessionId, {
      type: 'video-call-user-joined',
      userId: userId,
      userEmail: userEmail,
      sessionId: sessionId,
      totalParticipants: participants.size
    }, ws);
  }

  /**
   * Handle user leaving video call
   */
  handleLeaveVideoCall(ws, data) {
    const { sessionId } = data;
    const userId = ws.userId;
    const userEmail = ws.userEmail;
    
    console.log(`🎥 [LEAVE-VIDEO-CALL] ${userEmail} leaving video call in session ${sessionId}`);
    
    // Remove user from participants
    if (this.activeVideoSessions.has(sessionId)) {
      const participants = this.activeVideoSessions.get(sessionId);
      participants.delete(userId);
      
      // Remove user info
      if (this.videoParticipantInfo.has(sessionId)) {
        this.videoParticipantInfo.get(sessionId).delete(userId);
      }
      
      console.log(`🎥 [LEAVE-VIDEO-CALL] Session ${sessionId} now has ${participants.size} participants`);
      
      // Clean up empty sessions
      if (participants.size === 0) {
        this.activeVideoSessions.delete(sessionId);
        this.videoParticipantInfo.delete(sessionId);
        console.log(`🎥 [LEAVE-VIDEO-CALL] Cleaned up empty video session ${sessionId}`);
      }
      
      // Notify remaining participants
      this.roomManagerInterface.broadcastToRoom(sessionId, {
        type: 'video-call-user-left',
        userId: userId,
        userEmail: userEmail,
        sessionId: sessionId,
        totalParticipants: participants.size
      }, ws);
    }
  }

  /**
   * Handle user disconnect - automatic cleanup
   */
  handleUserDisconnect(ws) {
    if (ws.sessionId && ws.userId) {
      console.log(`🎥 [USER-DISCONNECT] ${ws.userEmail} disconnected, cleaning up video call state`);
      
      // Auto-leave any video calls
      this.handleLeaveVideoCall(ws, { sessionId: ws.sessionId });
    }
  }

  /**
   * Get active video sessions
   */
  getActiveVideoSessions() {
    const sessions = {};
    this.activeVideoSessions.forEach((participants, sessionId) => {
      sessions[sessionId] = {
        participantCount: participants.size,
        participants: Array.from(participants)
      };
    });
    return sessions;
  }

  /**
   * Get video call statistics
   */
  getVideoCallStats() {
    return {
      activeSessionsCount: this.activeVideoSessions.size,
      totalParticipants: Array.from(this.activeVideoSessions.values())
        .reduce((total, participants) => total + participants.size, 0),
      sessions: this.getActiveVideoSessions()
    };
  }

  /**
   * Cleanup manager resources
   */
  cleanup() {
    this.activeVideoSessions.clear();
    this.videoParticipantInfo.clear();
    console.log('🎥 Video Signaling Manager cleaned up');
  }
}

module.exports = VideoSignalingManager;
