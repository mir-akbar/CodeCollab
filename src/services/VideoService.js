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
    this.restartTimeouts = new Map(); // Map<userId, timeoutId> for connection recovery
    this.localStream = null;
    this.user = null;
    this.sessionId = null;
    
    // WebRTC configuration with environment-based STUN/TURN servers
    this.pcConfig = {
      iceServers: [
        // Free Cloudflare STUN server (unlimited usage)
        { urls: 'stun:stun.cloudflare.com:3478' },
        // Google STUN servers as backup
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // Additional reliable STUN servers
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:stun.ekiga.net' }
        // Note: TURN servers require signup/API keys
        // See addFreeTurnServers() method for dynamic TURN integration
      ],
      // More aggressive ICE settings for better connectivity
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
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
      // Proactively set up TURN servers for better connectivity
      await this.setupTurnServers();
      
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
   * Setup TURN servers proactively for better connectivity
   */
  async setupTurnServers() {
    // Check if TURN servers are already configured
    if (this.pcConfig.iceServers.some(server => server.urls.includes('turn:'))) {
      console.log('🎯 [VIDEO-SERVICE] TURN servers already configured');
      return;
    }
    
    const openRelayApiKey = import.meta.env.VITE_OPENRELAY_API_KEY;
    
    if (openRelayApiKey) {
      try {
        console.log('🔧 [VIDEO-SERVICE] Setting up OpenRelay TURN servers proactively...');
        await this.addOpenRelayTurn(openRelayApiKey);
        console.log('✅ [VIDEO-SERVICE] OpenRelay TURN servers ready for enhanced connectivity');
      } catch (error) {
        console.log('⚠️ [VIDEO-SERVICE] OpenRelay setup failed, continuing with STUN-only:', error.message);
      }
    } else {
      console.log('📡 [VIDEO-SERVICE] No OpenRelay API key configured, using STUN-only mode');
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
    
    // Handle connection state changes with recovery
    pc.onconnectionstatechange = () => {
      console.log(`🎥 [VIDEO-SERVICE] Connection state for ${userId}: ${pc.connectionState}`);
      
      if (pc.connectionState === 'connected') {
        console.log(`✅ [VIDEO-SERVICE] WebRTC connection established with ${userId}`);
        // Clear any existing restart timeout
        this.clearRestartTimeout(userId);
      } else if (pc.connectionState === 'failed') {
        console.error(`❌ [VIDEO-SERVICE] Connection failed for user: ${userId} - attempting ICE restart`);
        this.attemptICERestart(userId);
      } else if (pc.connectionState === 'disconnected') {
        console.warn(`⚠️ [VIDEO-SERVICE] Connection disconnected for user: ${userId} - monitoring for recovery`);
        // Set a timeout to restart if it doesn't recover
        this.setRestartTimeout(userId, 5000); // 5 second timeout
      }
    };
    
    // Handle signaling state changes
    pc.onsignalingstatechange = () => {
      console.log(`🎥 [VIDEO-SERVICE] Signaling state for ${userId}: ${pc.signalingState}`);
    };
    
    // Handle ICE connection state changes with recovery
    pc.oniceconnectionstatechange = () => {
      console.log(`🎥 [VIDEO-SERVICE] ICE connection state for ${userId}: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === 'failed') {
        console.error(`❌ [VIDEO-SERVICE] ICE connection failed for user: ${userId} - attempting restart`);
        this.attemptICERestart(userId);
      } else if (pc.iceConnectionState === 'disconnected') {
        console.warn(`⚠️ [VIDEO-SERVICE] ICE disconnected for user: ${userId} - will attempt restart if not recovered`);
        this.setRestartTimeout(userId, 3000); // 3 second timeout for ICE
      } else if (pc.iceConnectionState === 'connected') {
        console.log(`✅ [VIDEO-SERVICE] ICE connection restored for user: ${userId}`);
        this.clearRestartTimeout(userId);
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
    
    // Clear pending ICE candidates and restart timeouts
    this.pendingIceCandidates.delete(userId);
    this.clearRestartTimeout(userId);
    
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
   * Set restart timeout for connection recovery
   */
  setRestartTimeout(userId, delay) {
    // Clear existing timeout if any
    this.clearRestartTimeout(userId);
    
    console.log(`⏰ [VIDEO-SERVICE] Setting restart timeout for ${userId} in ${delay}ms`);
    const timeoutId = setTimeout(() => {
      console.log(`🔄 [VIDEO-SERVICE] Restart timeout triggered for ${userId}`);
      this.attemptICERestart(userId);
    }, delay);
    
    this.restartTimeouts.set(userId, timeoutId);
  }

  /**
   * Clear restart timeout
   */
  clearRestartTimeout(userId) {
    const timeoutId = this.restartTimeouts.get(userId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.restartTimeouts.delete(userId);
      console.log(`⏰ [VIDEO-SERVICE] Cleared restart timeout for ${userId}`);
    }
  }

  /**
   * Attempt ICE restart for failed connection
   */
  async attemptICERestart(userId) {
    console.log(`🔄 [VIDEO-SERVICE] Attempting ICE restart for user: ${userId}`);
    
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      console.warn(`⚠️ [VIDEO-SERVICE] No peer connection found for ICE restart: ${userId}`);
      return;
    }
    
    try {
      // Clear any pending restart timeout
      this.clearRestartTimeout(userId);
      
      // Check if we should create a new offer (same collision avoidance logic)
      const shouldCreateOffer = this.user.id > userId;
      
      if (shouldCreateOffer && pc.signalingState === 'stable') {
        console.log(`🔄 [VIDEO-SERVICE] Creating ICE restart offer for ${userId}`);
        
        // Create offer with ICE restart
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        
        this.signalingClient.sendOffer(userId, offer);
        console.log(`🔄 [VIDEO-SERVICE] Sent ICE restart offer to: ${userId}`);
      } else {
        console.log(`🔄 [VIDEO-SERVICE] Waiting for ICE restart offer from ${userId}`);
      }
      
    } catch (error) {
      console.error(`❌ [VIDEO-SERVICE] Failed to restart ICE for ${userId}:`, error);
      
      // If ICE restart fails, try recreating the entire connection
      setTimeout(() => {
        this.recreateConnection(userId);
      }, 2000);
    }
  }

  /**
   * Recreate entire peer connection as last resort
   */
  async recreateConnection(userId) {
    console.log(`🔄 [VIDEO-SERVICE] Recreating peer connection for user: ${userId}`);
    
    try {
      // Close existing connection
      const oldPc = this.peerConnections.get(userId);
      if (oldPc) {
        oldPc.close();
      }
      
      // Clear state
      this.peerConnections.delete(userId);
      this.pendingIceCandidates.delete(userId);
      this.clearRestartTimeout(userId);
      
      // If connection keeps failing, add TURN servers for better connectivity
      if (!this.pcConfig.iceServers.some(server => server.urls.includes('turn:'))) {
        console.log(`🔄 [VIDEO-SERVICE] Adding TURN servers due to repeated connection failures`);
        await this.addFreeTurnServers();
      }
      
      // Create new connection and offer (if we should)
      const shouldCreateOffer = this.user.id > userId;
      if (shouldCreateOffer) {
        console.log(`🔄 [VIDEO-SERVICE] Creating new offer after connection recreation for ${userId}`);
        await this.createOfferToUser(userId);
      }
      
    } catch (error) {
      console.error(`❌ [VIDEO-SERVICE] Failed to recreate connection for ${userId}:`, error);
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
    
    // Clear pending ICE candidates and restart timeouts
    this.pendingIceCandidates.clear();
    
    // Clear all restart timeouts
    this.restartTimeouts.forEach((timeoutId, userId) => {
      clearTimeout(timeoutId);
      console.log(`⏰ [VIDEO-SERVICE] Cleared restart timeout for: ${userId}`);
    });
    this.restartTimeouts.clear();
    
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
  
  /**
   * Add free TURN servers for enhanced connectivity
   * Tries OpenRelay (primary), then falls back to enhanced STUN configuration
   */
  async addFreeTurnServers() {
    console.log('🔄 [VIDEO-SERVICE] Adding free TURN servers for better connectivity...');
    
    try {
      // Try to get OpenRelay credentials from environment
      const openRelayApiKey = import.meta.env.VITE_OPENRELAY_API_KEY;
      
      if (openRelayApiKey) {
        console.log('🔑 [VIDEO-SERVICE] Using OpenRelay Project with API key');
        await this.addOpenRelayTurn(openRelayApiKey);
        return;
      }
      
      // Fallback: Enhanced STUN configuration
      console.log('📡 [VIDEO-SERVICE] No OpenRelay API key found, using enhanced STUN-only configuration');
      this.addEnhancedStunServers();
      
    } catch (error) {
      console.error('❌ [VIDEO-SERVICE] Error setting up TURN servers:', error);
      console.log('📡 [VIDEO-SERVICE] Falling back to enhanced STUN-only configuration');
      this.addEnhancedStunServers();
    }
  }
  
  /**
   * Add OpenRelay TURN servers with API credentials
   */
  async addOpenRelayTurn(apiKey) {
    try {
      // Fetch dynamic credentials from OpenRelay API using configurable endpoint
      const openRelayEndpoint = env.OPENRELAY_ENDPOINT;
      const response = await fetch(`${openRelayEndpoint}?apiKey=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`OpenRelay API failed: ${response.status}`);
      }
      
      const iceServers = await response.json();
      this.addTurnServers(iceServers);
      console.log('✅ [VIDEO-SERVICE] OpenRelay TURN servers added successfully');
      console.log('📊 [VIDEO-SERVICE] ICE servers count:', iceServers.length);
      
    } catch (error) {
      console.error('❌ [VIDEO-SERVICE] Failed to add OpenRelay TURN:', error);
      throw error;
    }
  }
  
  /**
   * Add TURN servers to configuration and update peer connections
   */
  addTurnServers(turnServers) {
    // Add TURN servers while keeping existing STUN servers
    const existingStunServers = this.pcConfig.iceServers.filter(server => 
      server.urls && (Array.isArray(server.urls) 
        ? server.urls.some(url => url.includes('stun:'))
        : server.urls.includes('stun:'))
    );
    
    this.pcConfig.iceServers = [
      ...existingStunServers,
      ...turnServers
    ];
    
    // Update all existing peer connections
    this.peerConnections.forEach(async (pc, userId) => {
      try {
        await pc.setConfiguration(this.pcConfig);
        console.log(`🔄 [VIDEO-SERVICE] Updated ICE servers for ${userId}`);
        await this.restartIceConnection(userId);
      } catch (error) {
        console.error(`❌ [VIDEO-SERVICE] Failed to update ICE servers for ${userId}:`, error);
      }
    });
  }
  
  /**
   * Add additional STUN servers for better connectivity
   */
  addEnhancedStunServers() {
    // Add more STUN servers for better connectivity
    const additionalStunServers = [
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.freeswitch.org' },
      { urls: 'stun:stun.voip.blackberry.com:3478' }
    ];
    
    this.pcConfig.iceServers = [
      ...this.pcConfig.iceServers,
      ...additionalStunServers
    ];
    
    console.log('📡 [VIDEO-SERVICE] Enhanced STUN configuration applied');
    
    // Update existing connections
    this.peerConnections.forEach(async (pc, userId) => {
      try {
        await pc.setConfiguration(this.pcConfig);
        await this.restartIceConnection(userId);
      } catch (error) {
        console.error(`❌ [VIDEO-SERVICE] Failed to update STUN servers for ${userId}:`, error);
      }
    });
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    console.log('🎤 [VIDEO-SERVICE] Toggling mute');
    
    const store = useVideoStore.getState();
    const isMuted = store.isMuted;
    
    // Toggle mute state
    store.setMuted(!isMuted);
    
    // Update local stream tracks
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
      
      console.log(`🎤 [VIDEO-SERVICE] Microphone ${isMuted ? 'unmuted' : 'muted'}`);
    }
  }

  /**
   * Toggle camera
   */
  toggleCamera() {
    console.log('📹 [VIDEO-SERVICE] Toggling camera');
    
    const store = useVideoStore.getState();
    const isCameraEnabled = store.isCameraEnabled;
    
    // Toggle camera state first
    store.setCameraEnabled(!isCameraEnabled);
    
    // Update local stream tracks
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = !isCameraEnabled;
      });
      
      // Force store to update by re-setting the local stream
      // This will trigger React re-renders in components using the stream
      store.setLocalStream(this.localStream);
      
      console.log(`📹 [VIDEO-SERVICE] Camera ${isCameraEnabled ? 'disabled' : 'enabled'}`);
    }
  }

  /**
   * Restart ICE connection for a specific peer
   * Useful when updating ICE servers or recovering from connection issues
   */
  async restartIceConnection(userId) {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      console.warn(`🔄 [VIDEO-SERVICE] No peer connection found for ${userId} to restart ICE`);
      return;
    }

    try {
      console.log(`🔄 [VIDEO-SERVICE] Restarting ICE connection for ${userId}`);
      
      // Restart ICE by creating a new offer with iceRestart option
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      
      // Send the restart offer to the peer
      this.signalingClient.sendSignalingMessage({
        type: 'offer',
        to: userId,
        offer: offer
      });
      
      console.log(`✅ [VIDEO-SERVICE] ICE restart initiated for ${userId}`);
    } catch (error) {
      console.error(`❌ [VIDEO-SERVICE] Failed to restart ICE for ${userId}:`, error);
    }
  }
}

// Export singleton instance
export const videoService = new VideoService();
export default VideoService;
