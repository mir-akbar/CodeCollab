/**
 * Video WebSocket Service
 * Handles video call signaling through Y-WebSocket infrastructure
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { WEB_SOCKET_API_URL } from '../../config/environment.js';

class VideoWebSocketService {
  constructor() {
    this.connections = new Map(); // sessionId -> connection
    this.isInitialized = false;
  }

  /**
   * Connect to video signaling for a session
   */
  connect(sessionId) {
    if (this.connections.has(sessionId)) {
      return this.connections.get(sessionId);
    }

    // Create YJS document for video signaling
    const doc = new Y.Doc();
    const roomName = `video-${sessionId}`;
    
    // Create Y-WebSocket provider
    const wsUrl = `${WEB_SOCKET_API_URL}/yjs-websocket/video-${sessionId}`;
    const provider = new WebsocketProvider(wsUrl, roomName, doc);
    
    const connection = {
      doc,
      provider,
      awareness: provider.awareness,
      isConnected: false,
      listeners: new Map(),
      sessionId
    };

    this.connections.set(sessionId, connection);

    // Set up connection status
    provider.on('status', ({ status }) => {
      connection.isConnected = status === 'connected';
      this.emit(sessionId, 'connected', connection.isConnected);
      
      if (status === 'connected') {
        this.sendUserInfoToServer(connection);
      }
    });

    provider.on('synced', () => {
      connection.isConnected = true;
      this.emit(sessionId, 'connected', true);
    });

    provider.on('connection-close', () => {
      connection.isConnected = false;
      this.emit(sessionId, 'connected', false);
    });

    return connection;
  }

  /**
   * Send user information to the WebSocket server
   */
  sendUserInfoToServer(connection) {
    if (!connection.provider.ws) return;
    
    try {
      // Get user info from awareness if available
      const awarenessState = connection.awareness.getLocalState();
      const user = awarenessState?.user;
      
      if (user) {
        const userInfo = {
          type: 'set-user-info',
          userInfo: {
            userId: user.cognitoId || user.userId,
            email: user.email,
            name: user.name
          }
        };
        
        connection.provider.ws.send(JSON.stringify(userInfo));
        console.log('📤 Sent video user info to Y-WebSocket server:', user.email);
      }
    } catch (error) {
      console.warn('Failed to send video user info:', error);
    }
  }

  /**
   * Start a video call
   */
  startCall(sessionId, userInfo) {
    console.log(`🎬 [VIDEO-START] Starting call in session ${sessionId}`);
    console.log(`🎬 [VIDEO-START] User info:`, userInfo);
    
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.isConnected) {
      console.log(`❌ [VIDEO-START] Connection not ready for session ${sessionId}`);
      throw new Error('Video connection not ready');
    }

    console.log(`🎬 [VIDEO-START] Connection status - Connected: ${connection.isConnected}, Session: ${connection.sessionId}`);

    // Set user presence for video
    this.setUserPresence(sessionId, userInfo);

    // Send start call signal
    const startMessage = {
      type: 'video-call-start',
      sessionId
    };
    
    console.log(`🎬 [VIDEO-START] Sending start signal:`, startMessage);
    this.sendSignal(sessionId, startMessage);

    console.log(`✅ [VIDEO-START] Successfully started video call in session: ${sessionId}`);
  }

  /**
   * Join an existing video call
   */
  joinCall(sessionId, userInfo) {
    console.log(`🚪 [VIDEO-JOIN] Joining call in session ${sessionId}`);
    console.log(`🚪 [VIDEO-JOIN] User info:`, userInfo);
    
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.isConnected) {
      console.log(`❌ [VIDEO-JOIN] Connection not ready for session ${sessionId}`);
      throw new Error('Video connection not ready');
    }

    console.log(`🚪 [VIDEO-JOIN] Connection status - Connected: ${connection.isConnected}, Session: ${connection.sessionId}`);

    // Set user presence for video
    this.setUserPresence(sessionId, userInfo);

    // Send join call signal
    const joinMessage = {
      type: 'video-call-join',
      sessionId
    };
    
    console.log(`🚪 [VIDEO-JOIN] Sending join signal:`, joinMessage);
    this.sendSignal(sessionId, joinMessage);

    console.log(`✅ [VIDEO-JOIN] Successfully joined video call in session: ${sessionId}`);
  }

  /**
   * Leave video call
   */
  leaveCall(sessionId) {
    console.log(`🚪 [VIDEO-LEAVE] Leaving call in session ${sessionId}`);
    
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.isConnected) {
      console.log(`⚠️ [VIDEO-LEAVE] Connection not available for session ${sessionId}, cannot send leave signal`);
      return;
    }

    console.log(`🚪 [VIDEO-LEAVE] Connection status - Connected: ${connection.isConnected}, Session: ${connection.sessionId}`);

    // Send leave call signal
    const leaveMessage = {
      type: 'video-call-leave',
      sessionId
    };
    
    console.log(`🚪 [VIDEO-LEAVE] Sending leave signal:`, leaveMessage);
    this.sendSignal(sessionId, leaveMessage);

    console.log(`✅ [VIDEO-LEAVE] Successfully left video call in session: ${sessionId}`);
  }

  /**
   * Send WebRTC offer
   */
  sendOffer(sessionId, targetUserId, offer) {
    console.log(`🤝 [VIDEO-OFFER-SEND] Sending offer to ${targetUserId} in session ${sessionId}`);
    console.log(`🤝 [VIDEO-OFFER-SEND] Offer type: ${offer?.type}, SDP length: ${offer?.sdp?.length || 0}`);
    
    const offerMessage = {
      type: 'video-offer',
      sessionId,
      targetUserId,
      offer
    };
    
    this.sendSignal(sessionId, offerMessage);
    console.log(`✅ [VIDEO-OFFER-SEND] Successfully sent offer to ${targetUserId}`);
  }

  /**
   * Send WebRTC answer
   */
  sendAnswer(sessionId, targetUserId, answer) {
    console.log(`🤝 [VIDEO-ANSWER-SEND] Sending answer to ${targetUserId} in session ${sessionId}`);
    console.log(`🤝 [VIDEO-ANSWER-SEND] Answer type: ${answer?.type}, SDP length: ${answer?.sdp?.length || 0}`);
    
    const answerMessage = {
      type: 'video-answer',
      sessionId,
      targetUserId,
      answer
    };
    
    this.sendSignal(sessionId, answerMessage);
    console.log(`✅ [VIDEO-ANSWER-SEND] Successfully sent answer to ${targetUserId}`);
  }

  /**
   * Send ICE candidate
   */
  sendIceCandidate(sessionId, targetUserId, candidate) {
    console.log(`🧊 [VIDEO-ICE-SEND] Sending ICE candidate to ${targetUserId} in session ${sessionId}`);
    console.log(`🧊 [VIDEO-ICE-SEND] Candidate type: ${candidate?.candidate?.split(' ')[7] || 'unknown'}, component: ${candidate?.component || 'unknown'}`);
    
    const iceMessage = {
      type: 'video-ice-candidate',
      sessionId,
      targetUserId,
      candidate
    };
    
    this.sendSignal(sessionId, iceMessage);
    console.log(`✅ [VIDEO-ICE-SEND] Successfully sent ICE candidate to ${targetUserId}`);
  }

  /**
   * Update media state (mute/unmute, video on/off)
   */
  updateMediaState(sessionId, { hasVideo, hasAudio }) {
    this.sendSignal(sessionId, {
      type: 'video-media-state',
      sessionId,
      hasVideo,
      hasAudio
    });
  }

  /**
   * Set user presence for video
   */
  setUserPresence(sessionId, user) {
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.awareness) return;

    try {
      connection.awareness.setLocalStateField('user', {
        name: user.name || user.email?.split('@')[0] || 'Anonymous',
        email: user.email,
        color: this.stringToColor(user.email || user.name),
        isInVideoCall: true,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error setting video user presence:', error);
    }
  }

  /**
   * Send signaling message
   */
  sendSignal(sessionId, message) {
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.provider.ws) {
      console.warn('Cannot send video signal: connection not ready');
      return;
    }

    try {
      connection.provider.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending video signal:', error);
    }
  }

  /**
   * Disconnect from video signaling
   */
  disconnect(sessionId) {
    const connection = this.connections.get(sessionId);
    if (connection) {
      try {
        connection.provider.destroy();
        connection.doc.destroy();
      } catch (error) {
        console.warn('Error destroying video connection:', error);
      }
      this.connections.delete(sessionId);
    }
  }

  // Event listener management
  on(sessionId, event, callback) {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    if (!connection.listeners.has(event)) {
      connection.listeners.set(event, new Set());
    }
    connection.listeners.get(event).add(callback);
  }

  off(sessionId, event, callback) {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    const listeners = connection.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  emit(sessionId, event, data) {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    const listeners = connection.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Utility function to generate color from string
   */
  stringToColor(str) {
    if (!str) return '#666666';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  /**
   * Check connection status
   */
  isConnected(sessionId) {
    const connection = this.connections.get(sessionId);
    return connection ? connection.isConnected : false;
  }
}

// Export singleton instance
export const videoWebSocketService = new VideoWebSocketService();
export default videoWebSocketService;
