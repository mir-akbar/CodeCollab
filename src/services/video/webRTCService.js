/**
 * WebRTC Service
 * Handles peer-to-peer video/audio connections with production-ready configuration
 */

import { env } from '../../config/environment.js';

class WebRTCService {
  constructor() {
    this.peerConnections = new Map(); // userId -> RTCPeerConnection
    this.localStream = null;
    
    // ICE servers configuration - includes both STUN and optional TURN servers
    this.configuration = {
      iceServers: [
        // Free STUN servers for NAT discovery
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        
        // Optional TURN servers for production (configured via environment)
        ...(env.TURN_SERVER_URL ? [{
          urls: env.TURN_SERVER_URL,
          username: env.TURN_USERNAME || 'codelab',
          credential: env.TURN_PASSWORD || 'turnpassword'
        }] : []),
        
        // Optional backup TURN server
        ...(env.TURN_SERVER_URL_BACKUP ? [{
          urls: env.TURN_SERVER_URL_BACKUP,
          username: env.TURN_USERNAME || 'codelab',
          credential: env.TURN_PASSWORD || 'turnpassword'
        }] : [])
      ],
      
      // Optimized configuration
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };
    
    console.log('🎥 WebRTC Service initialized');
    if (env.IS_DEVELOPMENT) {
      this.logConfiguration();
    }
  }

  /**
   * Log current configuration (development only)
   */
  logConfiguration() {
    const hasSTUN = this.configuration.iceServers.some(server => 
      server.urls.includes('stun:')
    );
    const hasTURN = this.configuration.iceServers.some(server => 
      server.urls.includes('turn:')
    );
    
    console.log('🔧 WebRTC Configuration:', {
      STUN_servers: hasSTUN ? 'Configured' : 'None',
      TURN_servers: hasTURN ? 'Configured' : 'None (STUN only)',
      note: hasTURN ? 'Production ready' : 'Demo/development mode'
    });
  }

  /**
   * Check if media devices are available
   */
  async checkMediaDevicesSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Media devices not supported in this browser');
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some(device => device.kind === 'videoinput');
      const hasAudioInput = devices.some(device => device.kind === 'audioinput');
      
      return { hasVideoInput, hasAudioInput };
    } catch (error) {
      console.warn('Could not enumerate devices:', error);
      return { hasVideoInput: true, hasAudioInput: true }; // Assume available
    }
  }

  /**
   * Check current permission status
   */
  async checkPermissions() {
    if (!navigator.permissions) {
      return { camera: 'prompt', microphone: 'prompt' };
    }

    try {
      const [cameraPermission, microphonePermission] = await Promise.all([
        navigator.permissions.query({ name: 'camera' }),
        navigator.permissions.query({ name: 'microphone' })
      ]);

      return {
        camera: cameraPermission.state,
        microphone: microphonePermission.state
      };
    } catch (error) {
      console.warn('Could not check permissions:', error);
      return { camera: 'prompt', microphone: 'prompt' };
    }
  }

  /**
   * Request media permissions and initialize stream
   */
  async requestMediaPermissions({ video = true, audio = true } = {}) {
    try {
      // Check device support first
      const deviceSupport = await this.checkMediaDevicesSupport();
      
      if (video && !deviceSupport.hasVideoInput) {
        console.warn('No video input device found');
        video = false;
      }
      
      if (audio && !deviceSupport.hasAudioInput) {
        console.warn('No audio input device found');
        audio = false;
      }

      if (!video && !audio) {
        throw new Error('No audio or video input devices available');
      }

      // Request permissions
      const constraints = {
        video: video ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 }
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('📹 Media permissions granted and stream initialized');
      console.log('🎥 Video tracks:', stream.getVideoTracks().length);
      console.log('🎤 Audio tracks:', stream.getAudioTracks().length);
      
      return {
        stream,
        hasVideo: stream.getVideoTracks().length > 0,
        hasAudio: stream.getAudioTracks().length > 0
      };
    } catch (error) {
      console.error('Error requesting media permissions:', error);
      
      // Provide specific error messages
      let errorMessage = 'Failed to access camera/microphone';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone access denied. Please allow permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect a device and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is being used by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera/microphone does not meet the required specifications.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Media access blocked due to security restrictions.';
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Initialize local media stream
   */
  async initializeMedia({ video = true, audio = true } = {}) {
    try {
      const result = await this.requestMediaPermissions({ video, audio });
      this.localStream = result.stream;
      return this.localStream;
    } catch (error) {
      console.error('Error initializing media:', error);
      throw error;
    }
  }

  /**
   * Create peer connection for a user
   */
  createPeerConnection(userId, onIceCandidate, onRemoteStream) {
    console.log(`🔗 [PEER-CONNECTION] Creating peer connection for user: ${userId}`);
    
    if (this.peerConnections.has(userId)) {
      console.log(`🔗 [PEER-CONNECTION] Closing existing connection for user: ${userId}`);
      this.closePeerConnection(userId);
    }

    const peerConnection = new RTCPeerConnection(this.configuration);

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`📡 [PEER-CONNECTION] ICE candidate generated for: ${userId}`);
        console.log(`📡 [PEER-CONNECTION] Candidate type: ${event.candidate.candidate.split(' ')[7] || 'unknown'}`);
        onIceCandidate(userId, event.candidate);
      } else {
        console.log(`📡 [PEER-CONNECTION] ICE gathering complete for: ${userId}`);
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log(`📹 [PEER-CONNECTION] Remote stream received from: ${userId}`);
      const remoteStream = event.streams[0];
      console.log(`📹 [PEER-CONNECTION] Remote stream details - ID: ${remoteStream.id}, Video tracks: ${remoteStream.getVideoTracks().length}, Audio tracks: ${remoteStream.getAudioTracks().length}`);
      onRemoteStream(userId, remoteStream);
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`🔗 [PEER-CONNECTION] Connection state with ${userId}: ${peerConnection.connectionState}`);
      
      if (peerConnection.connectionState === 'connected') {
        console.log(`✅ [PEER-CONNECTION] Successfully connected to ${userId}`);
      } else if (peerConnection.connectionState === 'disconnected') {
        console.log(`⚠️ [PEER-CONNECTION] Disconnected from ${userId}`);
      } else if (peerConnection.connectionState === 'failed') {
        console.warn(`❌ [PEER-CONNECTION] Connection failed with ${userId}, attempting to restart ICE`);
        peerConnection.restartIce();
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`🧊 [PEER-CONNECTION] ICE connection state with ${userId}: ${peerConnection.iceConnectionState}`);
    };

    // Add local stream if available
    if (this.localStream) {
      console.log(`🔗 [PEER-CONNECTION] Adding local stream tracks to connection for ${userId}`);
      this.localStream.getTracks().forEach(track => {
        console.log(`🔗 [PEER-CONNECTION] Adding ${track.kind} track to ${userId}`);
        peerConnection.addTrack(track, this.localStream);
      });
    } else {
      console.log(`⚠️ [PEER-CONNECTION] No local stream available when creating connection for ${userId}`);
    }

    this.peerConnections.set(userId, peerConnection);
    console.log(`✅ [PEER-CONNECTION] Successfully created peer connection for ${userId}`);
    return peerConnection;
  }

  /**
   * Create and send offer to a user
   */
  async createOffer(userId) {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) {
      throw new Error(`No peer connection found for user: ${userId}`);
    }

    try {
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await peerConnection.setLocalDescription(offer);
      console.log('📤 Created offer for:', userId);
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  /**
   * Handle received offer and create answer
   */
  async handleOffer(userId, offer) {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) {
      throw new Error(`No peer connection found for user: ${userId}`);
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      console.log('📤 Created answer for:', userId);
      return answer;
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  /**
   * Handle received answer
   */
  async handleAnswer(userId, answer) {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) {
      throw new Error(`No peer connection found for user: ${userId}`);
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ Set remote description (answer) for:', userId);
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(userId, candidate) {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) {
      console.warn(`No peer connection found for ICE candidate from: ${userId}`);
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('✅ Added ICE candidate for:', userId);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  /**
   * Toggle local video - properly stops/starts camera hardware
   */
  async toggleVideo() {
    if (!this.localStream) return false;

    const videoTracks = this.localStream.getVideoTracks();
    const hasActiveVideo = videoTracks.length > 0 && videoTracks[0].enabled;

    if (hasActiveVideo) {
      // Turn OFF video - stop the camera hardware completely
      videoTracks.forEach(track => {
        track.stop();
        this.localStream.removeTrack(track);
      });
      
      // Update all peer connections to remove video track
      for (const peerConnection of this.peerConnections.values()) {
        const senders = peerConnection.getSenders().filter(s => 
          s.track && s.track.kind === 'video'
        );
        for (const sender of senders) {
          await peerConnection.removeTrack(sender);
        }
      }
      
      console.log('📹 Video turned OFF - camera hardware stopped');
      return false;
    } else {
      // Turn ON video - request new camera stream
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 }
          }
        });
        
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack) {
          // Add new video track to local stream
          this.localStream.addTrack(newVideoTrack);
          
          // Update all peer connections with new video track
          for (const peerConnection of this.peerConnections.values()) {
            await peerConnection.addTrack(newVideoTrack, this.localStream);
          }
          
          // Stop the temporary stream (we only needed the track)
          newStream.getAudioTracks().forEach(track => track.stop());
          
          console.log('📹 Video turned ON - camera hardware started');
          return true;
        }
      } catch (error) {
        console.error('Error restarting video:', error);
        throw new Error('Failed to restart camera');
      }
    }
    
    return false;
  }

  /**
   * Toggle local audio
   */
  toggleAudio() {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      console.log('🎤 Audio toggled:', audioTrack.enabled ? 'ON' : 'OFF');
      return audioTrack.enabled;
    }
    return false;
  }

  /**
   * Get current media state
   */
  getMediaState() {
    if (!this.localStream) {
      return { hasVideo: false, hasAudio: false };
    }

    const videoTracks = this.localStream.getVideoTracks();
    const audioTracks = this.localStream.getAudioTracks();

    return {
      hasVideo: videoTracks.length > 0 && videoTracks[0].enabled,
      hasAudio: audioTracks.length > 0 && audioTracks[0].enabled
    };
  }

  /**
   * Get available media devices
   */
  async getMediaDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        cameras: devices.filter(device => device.kind === 'videoinput'),
        microphones: devices.filter(device => device.kind === 'audioinput'),
        speakers: devices.filter(device => device.kind === 'audiooutput')
      };
    } catch (error) {
      console.error('Error enumerating devices:', error);
      return { cameras: [], microphones: [], speakers: [] };
    }
  }

  /**
   * Close peer connection for a user
   */
  closePeerConnection(userId) {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
      console.log('🔌 Closed peer connection for:', userId);
    }
  }

  /**
   * Stop local media stream
   */
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
      console.log('🛑 Stopped local media stream');
    }
  }

  /**
   * Cleanup all connections and streams
   */
  cleanup() {
    // Close all peer connections
    for (const userId of this.peerConnections.keys()) {
      this.closePeerConnection(userId);
    }

    // Stop local stream
    this.stopLocalStream();

    console.log('🧹 WebRTC service cleaned up');
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(userId) {
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) return null;

    try {
      const stats = await peerConnection.getStats();
      const report = {};
      
      stats.forEach((stat) => {
        if (stat.type === 'inbound-rtp' || stat.type === 'outbound-rtp') {
          report[stat.type] = stat;
        }
      });
      
      return report;
    } catch (error) {
      console.error('Error getting connection stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const webRTCService = new WebRTCService();
export default webRTCService;
