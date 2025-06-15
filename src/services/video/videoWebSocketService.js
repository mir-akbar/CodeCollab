/**
 * Video WebSocket Service
 * Handles video call signaling through Y-WebSocket infrastructure
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

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
    const wsUrl = `ws://localhost:3001/yjs-websocket/video-${sessionId}`;
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
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.isConnected) {
      throw new Error('Video connection not ready');
    }

    // Set user presence for video
    this.setUserPresence(sessionId, userInfo);

    // Send start call signal
    this.sendSignal(sessionId, {
      type: 'video-call-start',
      sessionId
    });

    console.log('📹 Started video call in session:', sessionId);
  }

  /**
   * Join an existing video call
   */
  joinCall(sessionId, userInfo) {
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.isConnected) {
      throw new Error('Video connection not ready');
    }

    // Set user presence for video
    this.setUserPresence(sessionId, userInfo);

    // Send join call signal
    this.sendSignal(sessionId, {
      type: 'video-call-join',
      sessionId
    });

    console.log('📹 Joined video call in session:', sessionId);
  }

  /**
   * Leave video call
   */
  leaveCall(sessionId) {
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.isConnected) {
      return;
    }

    // Send leave call signal
    this.sendSignal(sessionId, {
      type: 'video-call-leave',
      sessionId
    });

    console.log('📹 Left video call in session:', sessionId);
  }

  /**
   * Send WebRTC offer
   */
  sendOffer(sessionId, targetUserId, offer) {
    this.sendSignal(sessionId, {
      type: 'video-offer',
      sessionId,
      targetUserId,
      offer
    });
  }

  /**
   * Send WebRTC answer
   */
  sendAnswer(sessionId, targetUserId, answer) {
    this.sendSignal(sessionId, {
      type: 'video-answer',
      sessionId,
      targetUserId,
      answer
    });
  }

  /**
   * Send ICE candidate
   */
  sendIceCandidate(sessionId, targetUserId, candidate) {
    this.sendSignal(sessionId, {
      type: 'video-ice-candidate',
      sessionId,
      targetUserId,
      candidate
    });
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
