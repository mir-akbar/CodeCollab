/**
 * Video Call Service
 * Manages video call state and coordinates with Y-WebSocket for signaling
 */

class VideoCallService {
  constructor() {
    this.activeCalls = new Map(); // sessionId -> callState
    this.userCallStates = new Map(); // userEmail -> { sessionId, isInCall, hasVideo, hasAudio }
  }

  /**
   * Start a video call in a session
   */
  startCall(sessionId, initiatorEmail) {
    if (this.activeCalls.has(sessionId)) {
      return {
        success: false,
        error: 'Call already active in this session'
      };
    }

    const callState = {
      sessionId,
      initiator: initiatorEmail,
      participants: new Set([initiatorEmail]),
      startedAt: new Date(),
      status: 'active'
    };

    this.activeCalls.set(sessionId, callState);
    this.userCallStates.set(initiatorEmail, {
      sessionId,
      isInCall: true,
      hasVideo: true,
      hasAudio: true
    });

    return {
      success: true,
      callState
    };
  }

  /**
   * Join an existing call
   */
  joinCall(sessionId, userEmail) {
    const callState = this.activeCalls.get(sessionId);
    if (!callState) {
      return {
        success: false,
        error: 'No active call in this session'
      };
    }

    callState.participants.add(userEmail);
    this.userCallStates.set(userEmail, {
      sessionId,
      isInCall: true,
      hasVideo: true,
      hasAudio: true
    });

    return {
      success: true,
      callState
    };
  }

  /**
   * Leave a call
   */
  leaveCall(sessionId, userEmail) {
    const callState = this.activeCalls.get(sessionId);
    if (!callState) {
      return { success: false, error: 'No active call' };
    }

    callState.participants.delete(userEmail);
    this.userCallStates.delete(userEmail);

    // End call if no participants left
    if (callState.participants.size === 0) {
      this.activeCalls.delete(sessionId);
    }

    return {
      success: true,
      callState: callState.participants.size > 0 ? callState : null
    };
  }

  /**
   * Update user media state (mute/unmute, video on/off)
   */
  updateMediaState(userEmail, { hasVideo, hasAudio }) {
    const userState = this.userCallStates.get(userEmail);
    if (!userState) {
      return { success: false, error: 'User not in call' };
    }

    userState.hasVideo = hasVideo;
    userState.hasAudio = hasAudio;

    return {
      success: true,
      userState
    };
  }

  /**
   * Get call state for a session
   */
  getCallState(sessionId) {
    return this.activeCalls.get(sessionId) || null;
  }

  /**
   * Get user's call state
   */
  getUserCallState(userEmail) {
    return this.userCallStates.get(userEmail) || null;
  }

  /**
   * Check if user is in any call
   */
  isUserInCall(userEmail) {
    return this.userCallStates.has(userEmail);
  }

  /**
   * Get all participants in a call with their states
   */
  getCallParticipants(sessionId) {
    const callState = this.activeCalls.get(sessionId);
    if (!callState) return [];

    return Array.from(callState.participants).map(userEmail => ({
      userEmail,
      ...this.userCallStates.get(userEmail)
    }));
  }
}

module.exports = new VideoCallService();
