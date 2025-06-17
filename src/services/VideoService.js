/**
 * Video Service
 * Manages WebRTC peer connections and media streams for video chat
 */
import VideoSignalingClient from './VideoSignalingClient';
import useVideoStore from '../stores/videoStore';
import { env } from '../config/environment';

class VideoService {
  constructor() {
    this.signalingClient = new VideoSignalingClient();
    this.peerConnections = new Map(); // Map<userId, RTCPeerConnection>
    this.localStream = null;
    this.user = null;
    this.sessionId = null;
    
    // WebRTC configuration with environment-based STUN/TURN servers
    this.pcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    // Add TURN server if available for Railway/production
    if (env.IS_PRODUCTION) {
      // In production, add more robust STUN servers and TURN if needed
      this.pcConfig.iceServers.push(
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' }
      );
    }
    
    this.setupSignalingHandlers();
  }

  /**
   * Setup signaling event handlers
   */
  setupSignalingHandlers() {
    this.signalingClient.onSignalingMessage = this.handleSignalingMessage.bind(this);
    this.signalingClient.onParticipantUpdate = this.handleParticipantUpdate.bind(this);
    this.signalingClient.onConnectionStateChange = this.handleConnectionStateChange.bind(this);
    this.signalingClient.onError = this.handleSignalingError.bind(this);
  }

  /**
   * Initialize video service for a session
   */
  async initialize(sessionId, user) {
    console.log(`🎥 [VIDEO-SERVICE] Initializing for session: ${sessionId}`);
    
    // Check if already initialized for this session
    if (this.sessionId === sessionId && this.signalingClient.isConnected) {
      console.log(`🎥 [VIDEO-SERVICE] Already initialized for session: ${sessionId}`);
      return;
    }
    
    this.sessionId = sessionId;
    this.user = user;
    
    const store = useVideoStore.getState();
    store.setSessionId(sessionId);
    
    // Connect to signaling server
    this.signalingClient.connect(sessionId, user);
  }

  /**
   * Start video call - get local media and join call
   */
  async startVideoCall() {
    console.log('🎥 [VIDEO-SERVICE] Starting video call...');
    
    const store = useVideoStore.getState();
    store.setCallState(false, true); // not in call, but connecting
    store.setCallError(null);
    
    try {
      // Get user media
      await this.getLocalMedia();
      
      // Join the call on signaling server
      this.signalingClient.joinVideoCall();
      
      console.log('🎥 [VIDEO-SERVICE] Video call started successfully');
      
    } catch (error) {
      console.error('🎥 [VIDEO-SERVICE] Failed to start video call:', error);
      store.setCallError(error.message);
      store.setCallState(false, false);
      throw error;
    }
  }

  /**
   * Get local media (camera and microphone)
   */
  async getLocalMedia() {
    console.log('🎥 [VIDEO-SERVICE] Getting local media...');
    
    const store = useVideoStore.getState();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      this.localStream = stream;
      store.setLocalStream(stream);
      
      console.log('🎥 [VIDEO-SERVICE] Local media obtained successfully');
      return stream;
      
    } catch (error) {
      console.error('🎥 [VIDEO-SERVICE] Failed to get local media:', error);
      
      // Provide helpful error messages
      let errorMessage = 'Failed to access camera/microphone';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone access denied. Please allow permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is being used by another application.';
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Create peer connection for a user
   */
  createPeerConnection(userId) {
    console.log(`🎥 [VIDEO-SERVICE] Creating peer connection for user: ${userId}`);
    
    const pc = new RTCPeerConnection(this.pcConfig);
    
    // Add local stream to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }
    
    // Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log(`🎥 [VIDEO-SERVICE] Received remote stream from user: ${userId}`);
      const [remoteStream] = event.streams;
      
      const store = useVideoStore.getState();
      store.updateParticipantStream(userId, remoteStream);
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🎥 [VIDEO-SERVICE] Sending ICE candidate to user: ${userId}`);
        this.signalingClient.sendIceCandidate(userId, event.candidate);
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🎥 [VIDEO-SERVICE] Connection state for ${userId}: ${pc.connectionState}`);
      
      if (pc.connectionState === 'failed') {
        console.error(`🎥 [VIDEO-SERVICE] Connection failed for user: ${userId}`);
        // Could attempt ICE restart here
      }
    };
    
    this.peerConnections.set(userId, pc);
    return pc;
  }

  /**
   * Handle incoming signaling messages
   */
  async handleSignalingMessage(message) {
    const { type, fromUserId } = message;
    
    console.log(`🎥 [VIDEO-SERVICE] Handling signaling: ${type} from ${fromUserId}`);
    
    try {
      switch (type) {
        case 'offer':
          await this.handleOffer(message);
          break;
        case 'answer':
          await this.handleAnswer(message);
          break;
        case 'ice-candidate':
          await this.handleIceCandidate(message);
          break;
      }
    } catch (error) {
      console.error(`🎥 [VIDEO-SERVICE] Error handling signaling message:`, error);
    }
  }

  /**
   * Handle incoming offer
   */
  async handleOffer(message) {
    const { fromUserId, offer } = message;
    
    console.log(`🎥 [VIDEO-SERVICE] Handling offer from: ${fromUserId}`);
    
    // Create peer connection if doesn't exist
    let pc = this.peerConnections.get(fromUserId);
    if (!pc) {
      pc = this.createPeerConnection(fromUserId);
    }
    
    // Set remote description
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    // Create and send answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    this.signalingClient.sendAnswer(fromUserId, answer);
    
    console.log(`🎥 [VIDEO-SERVICE] Sent answer to: ${fromUserId}`);
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(message) {
    const { fromUserId, answer } = message;
    
    console.log(`🎥 [VIDEO-SERVICE] Handling answer from: ${fromUserId}`);
    
    const pc = this.peerConnections.get(fromUserId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`🎥 [VIDEO-SERVICE] Set remote description for: ${fromUserId}`);
    } else {
      console.error(`🎥 [VIDEO-SERVICE] No peer connection found for: ${fromUserId}`);
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(message) {
    const { fromUserId, candidate } = message;
    
    console.log(`🎥 [VIDEO-SERVICE] Handling ICE candidate from: ${fromUserId}`);
    
    const pc = this.peerConnections.get(fromUserId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      console.error(`🎥 [VIDEO-SERVICE] No peer connection found for: ${fromUserId}`);
    }
  }

  /**
   * Handle participant updates
   */
  handleParticipantUpdate(message) {
    const { type } = message;
    const store = useVideoStore.getState();
    
    console.log(`🎥 [VIDEO-SERVICE] Participant update: ${type}`, message);
    
    switch (type) {
      case 'video-call-participants':
        // Initial participants list when joining
        this.handleInitialParticipants(message.participants);
        store.setCallState(true, false); // in call, not connecting
        break;
        
      case 'video-call-user-joined':
        // New user joined - create offer
        this.handleUserJoined(message);
        break;
        
      case 'video-call-user-left':
        // User left - cleanup
        this.handleUserLeft(message);
        break;
    }
  }

  /**
   * Handle initial participants when joining call
   */
  async handleInitialParticipants(participants) {
    console.log(`🎥 [VIDEO-SERVICE] Initial participants:`, participants);
    
    const store = useVideoStore.getState();
    
    // Add participants to store
    participants.forEach(participant => {
      store.addParticipant(participant.userId, {
        userEmail: participant.userEmail || 'Unknown',
        stream: null,
        peerConnection: null
      });
    });
    
    // Create offers to all existing participants
    for (const participant of participants) {
      await this.createOfferToUser(participant.userId);
    }
  }

  /**
   * Handle new user joining call
   */
  async handleUserJoined(message) {
    const { userId, userEmail } = message;
    
    console.log(`🎥 [VIDEO-SERVICE] User joined: ${userId}`);
    
    const store = useVideoStore.getState();
    store.addParticipant(userId, {
      userEmail: userEmail || 'Unknown',
      stream: null,
      peerConnection: null
    });
    
    // Create offer to new user
    await this.createOfferToUser(userId);
  }

  /**
   * Handle user leaving call
   */
  handleUserLeft(message) {
    const { userId } = message;
    
    console.log(`🎥 [VIDEO-SERVICE] User left: ${userId}`);
    
    // Close peer connection
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
    
    // Remove from store
    const store = useVideoStore.getState();
    store.removeParticipant(userId);
  }

  /**
   * Create offer to a specific user
   */
  async createOfferToUser(userId) {
    console.log(`🎥 [VIDEO-SERVICE] Creating offer to user: ${userId}`);
    
    try {
      // Create peer connection if doesn't exist
      let pc = this.peerConnections.get(userId);
      if (!pc) {
        pc = this.createPeerConnection(userId);
      }
      
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      this.signalingClient.sendOffer(userId, offer);
      
      console.log(`🎥 [VIDEO-SERVICE] Sent offer to: ${userId}`);
      
    } catch (error) {
      console.error(`🎥 [VIDEO-SERVICE] Failed to create offer to ${userId}:`, error);
    }
  }

  /**
   * Handle signaling connection state changes
   */
  handleConnectionStateChange(isConnected) {
    console.log(`🎥 [VIDEO-SERVICE] Signaling connection: ${isConnected ? 'connected' : 'disconnected'}`);
    
    if (!isConnected) {
      const store = useVideoStore.getState();
      store.setCallError('Signaling connection lost');
    }
  }

  /**
   * Handle signaling errors
   */
  handleSignalingError(error) {
    console.error('🎥 [VIDEO-SERVICE] Signaling error:', error);
    
    const store = useVideoStore.getState();
    store.setCallError(`Signaling error: ${error.message}`);
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (!this.localStream) return;
    
    const store = useVideoStore.getState();
    const audioTrack = this.localStream.getAudioTracks()[0];
    
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      store.setMuted(!audioTrack.enabled);
      console.log(`🎥 [VIDEO-SERVICE] Audio ${audioTrack.enabled ? 'unmuted' : 'muted'}`);
    }
  }

  /**
   * Toggle camera
   */
  toggleCamera() {
    if (!this.localStream) return;
    
    const store = useVideoStore.getState();
    const videoTrack = this.localStream.getVideoTracks()[0];
    
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      store.setCameraEnabled(videoTrack.enabled);
      console.log(`🎥 [VIDEO-SERVICE] Camera ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Leave video call
   */
  async leaveVideoCall() {
    console.log('🎥 [VIDEO-SERVICE] Leaving video call...');
    
    // Notify server
    this.signalingClient.leaveVideoCall();
    
    // Cleanup
    this.cleanup();
    
    const store = useVideoStore.getState();
    store.setCallState(false, false);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    console.log('🎥 [VIDEO-SERVICE] Cleaning up...');
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Close all peer connections
    this.peerConnections.forEach((pc, userId) => {
      console.log(`🎥 [VIDEO-SERVICE] Closing peer connection for: ${userId}`);
      pc.close();
    });
    this.peerConnections.clear();
    
    // Cleanup store
    const store = useVideoStore.getState();
    store.cleanup();
  }

  /**
   * Disconnect from signaling
   */
  disconnect() {
    this.cleanup();
    this.signalingClient.disconnect();
  }
}

// Export singleton instance
export const videoService = new VideoService();
export default VideoService;
