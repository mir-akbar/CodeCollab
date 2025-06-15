/**
 * Video Call Hook
 * React hook for managing video call state and WebRTC connections
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { videoWebSocketService } from '../../services/video/videoWebSocketService';
import { webRTCService } from '../../services/video/webRTCService';
import { useUser } from '../../contexts/UserContext';

export function useVideoCall(sessionId) {
  const { userEmail, user } = useUser();
  
  // State
  const [isInCall, setIsInCall] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [mediaState, setMediaState] = useState({ hasVideo: true, hasAudio: true });

  // Refs
  const connectionRef = useRef(null);
  const isInitializing = useRef(false);

  // Handle remote user joined
  const handleRemoteUserJoined = useCallback(async (user) => {
    try {
      // Create peer connection for the new user
      webRTCService.createPeerConnection(
        user.userId,
        (userId, candidate) => {
          videoWebSocketService.sendIceCandidate(sessionId, userId, candidate);
        },
        (userId, stream) => {
          setRemoteStreams(prev => new Map(prev).set(userId, stream));
        }
      );

      // Create and send offer
      const offer = await webRTCService.createOffer(user.userId);
      videoWebSocketService.sendOffer(sessionId, user.userId, offer);

      // Add to participants
      setParticipants(prev => [...prev.filter(p => p.userId !== user.userId), {
        ...user,
        hasVideo: true,
        hasAudio: true
      }]);
    } catch (error) {
      console.error('Error handling remote user joined:', error);
    }
  }, [sessionId]);

  // Handle remote user left
  const handleRemoteUserLeft = useCallback((user) => {
    webRTCService.closePeerConnection(user.userId);
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(user.userId);
      return newStreams;
    });
    setParticipants(prev => prev.filter(p => p.userId !== user.userId));
  }, []);

  // Handle remote offer
  const handleRemoteOffer = useCallback(async (from, offer) => {
    try {
      // Create peer connection if it doesn't exist
      if (!webRTCService.peerConnections.has(from.userId)) {
        webRTCService.createPeerConnection(
          from.userId,
          (userId, candidate) => {
            videoWebSocketService.sendIceCandidate(sessionId, userId, candidate);
          },
          (userId, stream) => {
            setRemoteStreams(prev => new Map(prev).set(userId, stream));
          }
        );
      }

      // Handle offer and send answer
      const answer = await webRTCService.handleOffer(from.userId, offer);
      videoWebSocketService.sendAnswer(sessionId, from.userId, answer);

      // Add to participants if not already there
      setParticipants(prev => {
        const exists = prev.find(p => p.userId === from.userId);
        if (!exists) {
          return [...prev, { ...from, hasVideo: true, hasAudio: true }];
        }
        return prev;
      });
    } catch (error) {
      console.error('Error handling remote offer:', error);
    }
  }, [sessionId]);

  // Handle remote answer
  const handleRemoteAnswer = useCallback(async (from, answer) => {
    try {
      await webRTCService.handleAnswer(from.userId, answer);
    } catch (error) {
      console.error('Error handling remote answer:', error);
    }
  }, []);

  // Handle remote ICE candidate
  const handleRemoteIceCandidate = useCallback(async (from, candidate) => {
    try {
      await webRTCService.addIceCandidate(from.userId, candidate);
    } catch (error) {
      console.error('Error handling remote ICE candidate:', error);
    }
  }, []);

  // Update participant media state
  const updateParticipantMediaState = useCallback((user, state) => {
    setParticipants(prev => prev.map(p => 
      p.userId === user.userId 
        ? { ...p, ...state }
        : p
    ));
  }, []);

  // Initialize video connection
  useEffect(() => {
    if (!sessionId || !userEmail || isInitializing.current) {
      return;
    }

    console.log('🔗 Initializing video call for session:', sessionId);
    isInitializing.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Connect to video signaling
      connectionRef.current = videoWebSocketService.connect(sessionId);

      // Set up event listeners
      const handleConnection = (connected) => {
        setIsConnected(connected);
        if (connected) {
          videoWebSocketService.setUserPresence(sessionId, {
            email: userEmail,
            name: user?.name || userEmail.split('@')[0]
          });
        }
        setIsLoading(false);
      };

      const handleCallStarted = (data) => {
        console.log('📹 Call started by:', data.initiator.email);
        if (data.initiator.email !== userEmail) {
          // Someone else started the call, show join option
          setError(null);
        }
      };

      const handleUserJoined = (data) => {
        console.log('📹 User joined call:', data.user.email);
        if (data.user.email !== userEmail) {
          handleRemoteUserJoined(data.user);
        }
      };

      const handleUserLeft = (data) => {
        console.log('📹 User left call:', data.user.email);
        if (data.user.email !== userEmail) {
          handleRemoteUserLeft(data.user);
        }
      };

      const handleVideoOffer = async (data) => {
        console.log('📹 Received offer from:', data.from.email);
        await handleRemoteOffer(data.from, data.offer);
      };

      const handleVideoAnswer = async (data) => {
        console.log('📹 Received answer from:', data.from.email);
        await handleRemoteAnswer(data.from, data.answer);
      };

      const handleIceCandidate = async (data) => {
        console.log('📹 Received ICE candidate from:', data.from.email);
        await handleRemoteIceCandidate(data.from, data.candidate);
      };

      const handleMediaStateChanged = (data) => {
        console.log('📹 Media state changed:', data.user.email, data);
        updateParticipantMediaState(data.user, { hasVideo: data.hasVideo, hasAudio: data.hasAudio });
      };

      // Subscribe to video events
      videoWebSocketService.on(sessionId, 'connected', handleConnection);
      videoWebSocketService.on(sessionId, 'video-call-started', handleCallStarted);
      videoWebSocketService.on(sessionId, 'video-call-user-joined', handleUserJoined);
      videoWebSocketService.on(sessionId, 'video-call-user-left', handleUserLeft);
      videoWebSocketService.on(sessionId, 'video-offer', handleVideoOffer);
      videoWebSocketService.on(sessionId, 'video-answer', handleVideoAnswer);
      videoWebSocketService.on(sessionId, 'video-ice-candidate', handleIceCandidate);
      videoWebSocketService.on(sessionId, 'video-media-state-changed', handleMediaStateChanged);

      // Check if already connected
      if (videoWebSocketService.isConnected(sessionId)) {
        handleConnection(true);
      }

      return () => {
        console.log('🧹 Cleaning up video call connection');
        videoWebSocketService.off(sessionId, 'connected', handleConnection);
        videoWebSocketService.off(sessionId, 'video-call-started', handleCallStarted);
        videoWebSocketService.off(sessionId, 'video-call-user-joined', handleUserJoined);
        videoWebSocketService.off(sessionId, 'video-call-user-left', handleUserLeft);
        videoWebSocketService.off(sessionId, 'video-offer', handleVideoOffer);
        videoWebSocketService.off(sessionId, 'video-answer', handleVideoAnswer);
        videoWebSocketService.off(sessionId, 'video-ice-candidate', handleIceCandidate);
        videoWebSocketService.off(sessionId, 'video-media-state-changed', handleMediaStateChanged);
      };
    } catch (err) {
      console.error('Error initializing video call:', err);
      setError(err);
      setIsLoading(false);
    } finally {
      isInitializing.current = false;
    }
  }, [sessionId, userEmail, user, handleRemoteUserJoined, handleRemoteUserLeft, handleRemoteOffer, handleRemoteAnswer, handleRemoteIceCandidate, updateParticipantMediaState]);

  // Start video call
  const startCall = useCallback(async () => {
    if (!sessionId || !userEmail || !isConnected) {
      throw new Error('Video connection not ready');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🎬 Starting video call - requesting media permissions...');
      
      // Check current permissions status
      const permissions = await webRTCService.checkPermissions();
      console.log('📋 Current permissions:', permissions);
      
      // Initialize local media with permission handling
      const stream = await webRTCService.initializeMedia(mediaState);
      setLocalStream(stream);

      // Start the call
      videoWebSocketService.startCall(sessionId, {
        email: userEmail,
        name: user?.name || userEmail.split('@')[0]
      });

      setIsInCall(true);
      console.log('📹 Started video call successfully');
    } catch (error) {
      console.error('Error starting call:', error);
      setError(error.message || 'Failed to start video call');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, userEmail, user, isConnected, mediaState]);

  // Join existing call
  const joinCall = useCallback(async () => {
    if (!sessionId || !userEmail || !isConnected) {
      throw new Error('Video connection not ready');
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🚪 Joining video call - requesting media permissions...');
      
      // Check current permissions status
      const permissions = await webRTCService.checkPermissions();
      console.log('📋 Current permissions:', permissions);

      // Initialize local media with permission handling
      const stream = await webRTCService.initializeMedia(mediaState);
      setLocalStream(stream);

      // Join the call
      videoWebSocketService.joinCall(sessionId, {
        email: userEmail,
        name: user?.name || userEmail.split('@')[0]
      });

      setIsInCall(true);
      console.log('📹 Joined video call successfully');
    } catch (error) {
      console.error('Error joining call:', error);
      setError(error.message || 'Failed to join video call');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, userEmail, user, isConnected, mediaState]);

  // Check media permissions without requesting access
  const checkMediaPermissions = useCallback(async () => {
    try {
      const permissions = await webRTCService.checkPermissions();
      const deviceSupport = await webRTCService.checkMediaDevicesSupport();
      
      return {
        permissions,
        deviceSupport,
        canStartCall: (permissions.camera === 'granted' || permissions.camera === 'prompt') &&
                     (permissions.microphone === 'granted' || permissions.microphone === 'prompt') &&
                     (deviceSupport.hasVideoInput || deviceSupport.hasAudioInput)
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {
        permissions: { camera: 'prompt', microphone: 'prompt' },
        deviceSupport: { hasVideoInput: true, hasAudioInput: true },
        canStartCall: true
      };
    }
  }, []);

  // Leave video call
  const leaveCall = useCallback(() => {
    if (!sessionId) return;

    try {
      // Leave the call
      videoWebSocketService.leaveCall(sessionId);

      // Cleanup WebRTC
      webRTCService.cleanup();

      // Reset state
      setIsInCall(false);
      setLocalStream(null);
      setRemoteStreams(new Map());
      setParticipants([]);
      
      console.log('📹 Left video call');
    } catch (error) {
      console.error('Error leaving call:', error);
      setError(error);
    }
  }, [sessionId]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    try {
      const newVideoState = await webRTCService.toggleVideo();
      
      // Update media state with actual current state from WebRTC service
      const currentMediaState = webRTCService.getMediaState();
      setMediaState(currentMediaState);
      
      // Update local stream reference if video was turned on
      if (newVideoState && webRTCService.localStream) {
        setLocalStream(webRTCService.localStream);
      }
      
      // Broadcast media state change
      videoWebSocketService.updateMediaState(sessionId, currentMediaState);
      
      return newVideoState;
    } catch (error) {
      console.error('Error toggling video:', error);
      throw error;
    }
  }, [sessionId]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const newAudioState = webRTCService.toggleAudio();
    const newMediaState = { ...mediaState, hasAudio: newAudioState };
    setMediaState(newMediaState);
    
    // Broadcast media state change
    videoWebSocketService.updateMediaState(sessionId, newMediaState);
    
    return newAudioState;
  }, [sessionId, mediaState]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Debug helper - get detailed connection info
  const getDebugInfo = useCallback(async () => {
    const debugInfo = {
      sessionId,
      userEmail,
      isInCall,
      isConnected,
      localStreamInfo: localStream ? {
        id: localStream.id,
        videoTracks: localStream.getVideoTracks().length,
        audioTracks: localStream.getAudioTracks().length,
        active: localStream.active
      } : null,
      participants: participants.map(p => ({
        userId: p.userId,
        email: p.email,
        hasVideo: p.hasVideo,
        hasAudio: p.hasAudio
      })),
      remoteStreams: Array.from(remoteStreams.entries()).map(([userId, stream]) => ({
        userId,
        streamId: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        active: stream.active
      })),
      webrtcConnections: [],
      mediaState
    };

    // Get WebRTC connection stats
    for (const [userId, connection] of webRTCService.peerConnections.entries()) {
      try {
        const stats = await connection.getStats();
        const connectionInfo = {
          userId,
          connectionState: connection.connectionState,
          iceConnectionState: connection.iceConnectionState,
          signalingState: connection.signalingState,
          statsCount: stats.size
        };
        debugInfo.webrtcConnections.push(connectionInfo);
      } catch (error) {
        console.warn('Could not get stats for:', userId, error);
      }
    }

    return debugInfo;
  }, [sessionId, userEmail, isInCall, isConnected, localStream, participants, remoteStreams, mediaState]);

  return {
    // State
    isInCall,
    isConnected,
    isLoading,
    error,
    participants,
    localStream,
    remoteStreams,
    mediaState,
    
    // Actions
    startCall,
    joinCall,
    leaveCall,
    toggleVideo,
    toggleAudio,
    clearError,
    checkMediaPermissions,
    getDebugInfo,
    
    // Computed
    participantCount: participants.length,
    hasActiveCall: isInCall && participants.length > 0
  };
}

export default useVideoCall;
