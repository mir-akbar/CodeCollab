/**
 * Video Signaling Manager
 * Handles WebRTC signaling for video chat functionality
 * Manages offer/answer/ICE candidate exchange between peers
 */

class VideoSignalingManager {
  constructor(roomManagerInterface) {
    this.roomManagerInterface = roomManagerInterface;
    this.activeVideoCalls = new Map(); // Track active video calls per session
  }

  /**
   * Check if message type is video signaling related
   */
  isVideoSignalingMessage(type) {
    const videoMessageTypes = [
      'video-offer',
      'video-answer', 
      'video-ice-candidate',
      'video-call-start',
      'video-call-end',
      'video-call-join',
      'video-call-leave',
      'video-mute-toggle',
      'video-camera-toggle'
    ];
    return videoMessageTypes.includes(type);
  }

  /**
   * Handle video signaling messages
   */
  handleVideoSignalingMessage(ws, data) {
    const { type } = data;
    
    console.log(`🎥 [VIDEO-SIGNALING] Handling ${type} from ${ws.userEmail || 'unknown'}`);
    
    switch (type) {
      case 'video-offer':
        this.handleVideoOffer(ws, data);
        break;
      case 'video-answer':
        this.handleVideoAnswer(ws, data);
        break;
      case 'video-ice-candidate':
        this.handleIceCandidate(ws, data);
        break;
      case 'video-call-start':
        this.handleCallStart(ws, data);
        break;
      case 'video-call-end':
        this.handleCallEnd(ws, data);
        break;
      case 'video-call-join':
        this.handleCallJoin(ws, data);
        break;
      case 'video-call-leave':
        this.handleCallLeave(ws, data);
        break;
      case 'video-mute-toggle':
        this.handleMuteToggle(ws, data);
        break;
      case 'video-camera-toggle':
        this.handleCameraToggle(ws, data);
        break;
      default:
        console.warn(`⚠️ Unknown video signaling message type: ${type}`);
    }
  }

  /**
   * Handle WebRTC offer
   */
  handleVideoOffer(ws, data) {
    const { sessionId, targetUserId, offer } = data;
    
    console.log(`🎥 [VIDEO-OFFER] From ${ws.userEmail} to ${targetUserId} in session ${sessionId}`);
    
    // Forward offer to target user
    this.roomManagerInterface.sendToUser(sessionId, targetUserId, {
      type: 'video-offer',
      fromUserId: ws.userId,
      fromUserEmail: ws.userEmail,
      offer: offer,
      sessionId: sessionId
    });
  }

  /**
   * Handle WebRTC answer
   */
  handleVideoAnswer(ws, data) {
    const { sessionId, targetUserId, answer } = data;
    
    console.log(`🎥 [VIDEO-ANSWER] From ${ws.userEmail} to ${targetUserId} in session ${sessionId}`);
    
    // Forward answer to target user
    this.roomManagerInterface.sendToUser(sessionId, targetUserId, {
      type: 'video-answer',
      fromUserId: ws.userId,
      fromUserEmail: ws.userEmail,
      answer: answer,
      sessionId: sessionId
    });
  }

  /**
   * Handle ICE candidate
   */
  handleIceCandidate(ws, data) {
    const { sessionId, targetUserId, candidate } = data;
    
    console.log(`🎥 [ICE-CANDIDATE] From ${ws.userEmail} to ${targetUserId}`);
    
    // Forward ICE candidate to target user
    this.roomManagerInterface.sendToUser(sessionId, targetUserId, {
      type: 'video-ice-candidate',
      fromUserId: ws.userId,
      fromUserEmail: ws.userEmail,
      candidate: candidate,
      sessionId: sessionId
    });
  }

  /**
   * Handle call start
   */
  handleCallStart(ws, data) {
    const { sessionId } = data;
    
    console.log(`🎥 [CALL-START] ${ws.userEmail} starting call in session ${sessionId}`);
    
    // Notify all users in session about call start
    this.roomManagerInterface.broadcastToRoom(sessionId, {
      type: 'video-call-started',
      userId: ws.userId,
      userEmail: ws.userEmail,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Handle call end
   */
  handleCallEnd(ws, data) {
    const { sessionId } = data;
    
    console.log(`🎥 [CALL-END] ${ws.userEmail} ending call in session ${sessionId}`);
    
    // Notify all users in session about call end
    this.roomManagerInterface.broadcastToRoom(sessionId, {
      type: 'video-call-ended',
      userId: ws.userId,
      userEmail: ws.userEmail,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Handle call join
   */
  handleCallJoin(ws, data) {
    const { sessionId } = data;
    
    console.log(`🎥 [CALL-JOIN] ${ws.userEmail} joining call in session ${sessionId}`);
    
    // Notify all users in session about user joining
    this.roomManagerInterface.broadcastToRoom(sessionId, {
      type: 'video-call-user-joined',
      userId: ws.userId,
      userEmail: ws.userEmail,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Handle call leave
   */
  handleCallLeave(ws, data) {
    const { sessionId } = data;
    
    console.log(`🎥 [CALL-LEAVE] ${ws.userEmail} leaving call in session ${sessionId}`);
    
    // Notify all users in session about user leaving
    this.roomManagerInterface.broadcastToRoom(sessionId, {
      type: 'video-call-user-left',
      userId: ws.userId,
      userEmail: ws.userEmail,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Handle mute toggle
   */
  handleMuteToggle(ws, data) {
    const { sessionId, isMuted } = data;
    
    console.log(`🎥 [MUTE-TOGGLE] ${ws.userEmail} ${isMuted ? 'muted' : 'unmuted'} in session ${sessionId}`);
    
    // Notify all users in session about mute status change
    this.roomManagerInterface.broadcastToRoom(sessionId, {
      type: 'video-user-mute-changed',
      userId: ws.userId,
      userEmail: ws.userEmail,
      isMuted: isMuted,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Handle camera toggle
   */
  handleCameraToggle(ws, data) {
    const { sessionId, cameraEnabled } = data;
    
    console.log(`🎥 [CAMERA-TOGGLE] ${ws.userEmail} ${cameraEnabled ? 'enabled' : 'disabled'} camera in session ${sessionId}`);
    
    // Notify all users in session about camera status change
    this.roomManagerInterface.broadcastToRoom(sessionId, {
      type: 'video-user-camera-changed',
      userId: ws.userId,
      userEmail: ws.userEmail,
      cameraEnabled: cameraEnabled,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    }, ws);
  }

  /**
   * Handle user disconnect
   */
  handleUserDisconnect(ws) {
    if (ws.sessionId && ws.userId) {
      console.log(`🎥 [USER-DISCONNECT] ${ws.userEmail} disconnected, cleaning up video call state`);
      
      // Notify session about user leaving any active calls
      this.roomManagerInterface.broadcastToRoom(ws.sessionId, {
        type: 'video-call-user-disconnected',
        userId: ws.userId,
        userEmail: ws.userEmail,
        sessionId: ws.sessionId,
        timestamp: new Date().toISOString()
      }, ws);
    }
  }

  /**
   * Get video call statistics
   */
  getVideoCallStats() {
    return {
      activeCallsCount: this.activeVideoCalls.size,
      activeCalls: Array.from(this.activeVideoCalls.keys())
    };
  }

  /**
   * Cleanup manager resources
   */
  cleanup() {
    this.activeVideoCalls.clear();
    console.log('🎥 Video Signaling Manager cleaned up');
  }
}

module.exports = VideoSignalingManager;
