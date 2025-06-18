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
    this.pendingIceCandidates = new Map(); // Map<userId, Array<RTCIceCandidate>>
    this.localStream = null;
    this.user = null;
    this.sessionId = null;
    
    // WebRTC configuration with environment-based STUN/TURN servers
    this.pcConfig = {
      iceServers: [
        // Google STUN servers (reliable and fast)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' }
      ]
    };
    
    // Add more STUN servers for better reliability in production
    if (env.IS_PRODUCTION) {
      // Add additional reliable STUN servers for redundancy
      this.pcConfig.iceServers.push(
        { urls: 'stun:stun4.l.google.com:19302' },
        // Mozilla's STUN server as backup
        { urls: 'stun:stun.services.mozilla.com' },
        // Additional reliable STUN servers
        { urls: 'stun:stun.ekiga.net' },
        { urls: 'stun:stun.freeswitch.org' }
      );
    }
    
    // Note: For enterprise/production deployments behind strict firewalls,
    // you may need to add TURN servers for relay traffic:
    // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
    
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
      
      if (pc.connectionState === 'connected') {
        console.log(`✅ [VIDEO-SERVICE] WebRTC connection established with ${userId}`);
      } else if (pc.connectionState === 'failed') {
        console.error(`❌ [VIDEO-SERVICE] Connection failed for user: ${userId}`);
        // Could attempt ICE restart here
      } else if (pc.connectionState === 'disconnected') {
        console.warn(`⚠️ [VIDEO-SERVICE] Connection disconnected for user: ${userId}`);
      }
    };
    
    // Handle signaling state changes
    pc.onsignalingstatechange = () => {
      console.log(`🎥 [VIDEO-SERVICE] Signaling state for ${userId}: ${pc.signalingState}`);
    };
    
    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`🎥 [VIDEO-SERVICE] ICE connection state for ${userId}: ${pc.iceConnectionState}`);
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
   * Handle incoming offer with collision resolution
   */
  async handleOffer(message) {
    const { fromUserId, offer } = message;
    
    console.log(`🎥 [VIDEO-SERVICE] Handling offer from: ${fromUserId}`);
    
    // Create peer connection if doesn't exist
    let pc = this.peerConnections.get(fromUserId);
    if (!pc) {
      pc = this.createPeerConnection(fromUserId);
    }
    
    // Handle offer collision - if we're already in "have-local-offer" state,
    // use deterministic rule: user with lexicographically smaller ID becomes answerer
    if (pc.signalingState === 'have-local-offer') {
      const shouldAnswer = this.user.id < fromUserId;
      
      if (shouldAnswer) {
        console.log(`🎥 [VIDEO-SERVICE] Resolving offer collision with ${fromUserId} - we become answerer`);
        
        // Cancel our local offer and accept the remote offer
        await pc.setLocalDescription({type: 'rollback'});
      } else {
        console.log(`🎥 [VIDEO-SERVICE] Resolving offer collision with ${fromUserId} - ignoring their offer, we remain offerer`);
        return; // Ignore their offer, we should remain the offerer
      }
    }
    
    // Check peer connection state before setting remote description
    if (pc.signalingState === 'stable' || pc.signalingState === 'have-remote-offer') {
      try {
        // Set remote description
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        this.signalingClient.sendAnswer(fromUserId, answer);
        
        console.log(`🎥 [VIDEO-SERVICE] Sent answer to: ${fromUserId}`);
        
        // Process any pending ICE candidates now that remote description is set
        await this.processPendingIceCandidates(fromUserId);
        
      } catch (error) {
        console.error(`🎥 [VIDEO-SERVICE] Failed to handle offer from ${fromUserId}:`, error);
        console.log(`🎥 [VIDEO-SERVICE] Peer connection state for ${fromUserId}: ${pc.signalingState}`);
      }
    } else {
      console.warn(`🎥 [VIDEO-SERVICE] Ignoring offer from ${fromUserId} - wrong state: ${pc.signalingState}`);
    }
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(message) {
    const { fromUserId, answer } = message;
    
    console.log(`🎥 [VIDEO-SERVICE] Handling answer from: ${fromUserId}`);
    
    const pc = this.peerConnections.get(fromUserId);
    if (pc) {
      // Check peer connection state before setting remote description
      if (pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`🎥 [VIDEO-SERVICE] Set remote description for: ${fromUserId}`);
          
          // Process any pending ICE candidates now that remote description is set
          await this.processPendingIceCandidates(fromUserId);
          
        } catch (error) {
          console.error(`🎥 [VIDEO-SERVICE] Failed to set remote answer for ${fromUserId}:`, error);
          // Log the current state for debugging
          console.log(`🎥 [VIDEO-SERVICE] Peer connection state for ${fromUserId}: ${pc.signalingState}`);
        }
      } else {
        console.warn(`🎥 [VIDEO-SERVICE] Ignoring answer from ${fromUserId} - wrong state: ${pc.signalingState}`);
      }
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
      // Check if remote description is set before adding ICE candidate
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`🎥 [VIDEO-SERVICE] Added ICE candidate from: ${fromUserId}`);
        } catch (error) {
          console.error(`🎥 [VIDEO-SERVICE] Failed to add ICE candidate from ${fromUserId}:`, error);
        }
      } else {
        console.log(`🎥 [VIDEO-SERVICE] Queueing ICE candidate from ${fromUserId} - no remote description yet`);
        // Queue ICE candidate for later processing
        if (!this.pendingIceCandidates.has(fromUserId)) {
          this.pendingIceCandidates.set(fromUserId, []);
        }
        this.pendingIceCandidates.get(fromUserId).push(candidate);
      }
    } else {
      console.error(`🎥 [VIDEO-SERVICE] No peer connection found for: ${fromUserId}`);
    }
  }

  /**
   * Process pending ICE candidates for a user
   */
  async processPendingIceCandidates(userId) {
    const pendingCandidates = this.pendingIceCandidates.get(userId);
    if (pendingCandidates && pendingCandidates.length > 0) {
      console.log(`🎥 [VIDEO-SERVICE] Processing ${pendingCandidates.length} pending ICE candidates for: ${userId}`);
      
      const pc = this.peerConnections.get(userId);
      if (pc && pc.remoteDescription) {
        for (const candidate of pendingCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error(`🎥 [VIDEO-SERVICE] Failed to add pending ICE candidate for ${userId}:`, error);
          }
        }
        
        // Clear processed candidates
        this.pendingIceCandidates.delete(userId);
      }
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
    
    // Create offer to new user (with collision avoidance built-in)
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
    
    // Clear pending ICE candidates
    this.pendingIceCandidates.delete(userId);
    
    // Remove from store
    const store = useVideoStore.getState();
    store.removeParticipant(userId);
  }

  /**
   * Create offer to a specific user with collision avoidance
   */
  async createOfferToUser(userId) {
    // Use deterministic rule to avoid offer collisions:
    // Only the user with lexicographically larger ID creates offers
    const shouldCreateOffer = this.user.id > userId;
    
    if (!shouldCreateOffer) {
      console.log(`🎥 [VIDEO-SERVICE] Skipping offer creation to ${userId} - collision avoidance (waiting for their offer)`);
      return;
    }
    
    console.log(`🎥 [VIDEO-SERVICE] Creating offer to user: ${userId}`);
    
    try {
      // Create peer connection if doesn't exist
      let pc = this.peerConnections.get(userId);
      if (!pc) {
        pc = this.createPeerConnection(userId);
      }
      
      // Only create offer if in stable state
      if (pc.signalingState !== 'stable') {
        console.log(`🎥 [VIDEO-SERVICE] Skipping offer to ${userId} - peer connection not in stable state: ${pc.signalingState}`);
        return;
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
    
    // Clear pending ICE candidates
    this.pendingIceCandidates.clear();
    
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
