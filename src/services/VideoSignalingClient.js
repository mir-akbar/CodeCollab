/**
 * Video Signaling Client
 * Handles WebSocket communication for video chat signaling
 */
import { WEB_SOCKET_API_URL } from '../config/environment';

class VideoSignalingClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.sessionId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // Event handlers
    this.onSignalingMessage = null;
    this.onParticipantUpdate = null;
    this.onConnectionStateChange = null;
    this.onError = null;
  }

  /**
   * Connect to video signaling WebSocket
   */
  connect(sessionId, user) {
    if (this.isConnected) {
      console.warn('🎥 Video signaling already connected');
      return;
    }

    this.sessionId = sessionId;
    
    // Create WebSocket URL for video signaling
    const wsUrl = `${WEB_SOCKET_API_URL}/video-signaling/${sessionId}`;
    
    console.log(`🎥 [VIDEO-SIGNALING] Connecting to: ${wsUrl}`);
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers(user);
    } catch (error) {
      console.error('🎥 [VIDEO-SIGNALING] Connection failed:', error);
      this.handleError(error);
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers(user) {
    this.ws.onopen = () => {
      console.log('🎥 [VIDEO-SIGNALING] Connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Send user information to server
      this.sendUserInfo(user);
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(true);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        // Handle both text and binary data
        let messageData;
        if (typeof event.data === 'string') {
          messageData = event.data;
        } else if (event.data instanceof Blob) {
          // Skip binary messages (these are Y.js messages not meant for video signaling)
          console.log('🎥 [VIDEO-SIGNALING] Skipping binary message (Y.js)');
          return;
        } else {
          // Convert other types to string
          messageData = event.data.toString();
        }
        
        const message = JSON.parse(messageData);
        this.handleMessage(message);
      } catch (error) {
        console.error('🎥 [VIDEO-SIGNALING] Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('🎥 [VIDEO-SIGNALING] Connection closed:', event.code, event.reason);
      this.isConnected = false;
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(false);
      }
      
      // Attempt reconnection if not a normal close
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('🎥 [VIDEO-SIGNALING] WebSocket error:', error);
      this.handleError(error);
    };
  }

  /**
   * Handle incoming signaling messages
   */
  handleMessage(message) {
    const { type } = message;
    
    console.log(`🎥 [VIDEO-SIGNALING] Received: ${type}`, message);
    
    switch (type) {
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        // Forward WebRTC signaling messages
        if (this.onSignalingMessage) {
          this.onSignalingMessage(message);
        }
        break;
        
      case 'video-call-participants':
      case 'video-call-user-joined':
      case 'video-call-user-left':
        // Handle participant updates
        if (this.onParticipantUpdate) {
          this.onParticipantUpdate(message);
        }
        break;
        
      default:
        console.warn(`🎥 [VIDEO-SIGNALING] Unknown message type: ${type}`);
    }
  }

  /**
   * Send user information to server
   */
  sendUserInfo(user) {
    if (!this.isConnected || !this.ws) {
      console.warn('🎥 [VIDEO-SIGNALING] Cannot send user info: not connected');
      return;
    }

    // Send user info as a custom message (similar to Y.js user info)
    this.send({
      type: 'user-info',
      userId: user.id,
      userEmail: user.email,
      sessionId: this.sessionId
    });
  }

  /**
   * Join video call
   */
  joinVideoCall() {
    this.send({
      type: 'join-video-call',
      sessionId: this.sessionId
    });
  }

  /**
   * Leave video call
   */
  leaveVideoCall() {
    this.send({
      type: 'leave-video-call',
      sessionId: this.sessionId
    });
  }

  /**
   * Send WebRTC offer to target user
   */
  sendOffer(targetUserId, offer) {
    this.send({
      type: 'offer',
      sessionId: this.sessionId,
      targetUserId,
      offer
    });
  }

  /**
   * Send WebRTC answer to target user
   */
  sendAnswer(targetUserId, answer) {
    this.send({
      type: 'answer',
      sessionId: this.sessionId,
      targetUserId,
      answer
    });
  }

  /**
   * Send ICE candidate to target user
   */
  sendIceCandidate(targetUserId, candidate) {
    this.send({
      type: 'ice-candidate',
      sessionId: this.sessionId,
      targetUserId,
      candidate
    });
  }

  /**
   * Send message to server
   */
  send(message) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('🎥 [VIDEO-SIGNALING] Cannot send message: not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      console.log(`🎥 [VIDEO-SIGNALING] Sent: ${message.type}`, message);
      return true;
    } catch (error) {
      console.error('🎥 [VIDEO-SIGNALING] Failed to send message:', error);
      this.handleError(error);
      return false;
    }
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🎥 [VIDEO-SIGNALING] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected && this.sessionId) {
        // We need user info to reconnect, this will need to be provided by the caller
        console.log('🎥 [VIDEO-SIGNALING] Attempting reconnection...');
        // Note: Reconnection will need user context from the VideoService
      }
    }, delay);
  }

  /**
   * Handle errors
   */
  handleError(error) {
    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * Disconnect from signaling server
   */
  disconnect() {
    if (this.ws) {
      console.log('🎥 [VIDEO-SIGNALING] Disconnecting...');
      this.isConnected = false;
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.sessionId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      sessionId: this.sessionId,
      readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED
    };
  }
}

export default VideoSignalingClient;
