/**
 * Video Call Panel
 * Main video chat interface component
 */
import { useEffect, useState, useRef } from 'react';
import { Play, PhoneOff, Loader2, AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useUser } from '../../contexts/UserContext';
import { videoService } from '../../services/VideoService';
import { useVideoStore } from '../../stores';
import VideoGrid from './VideoGrid';
import VideoControls from './VideoControls';

const VideoCallPanel = ({ sessionId: propSessionId }) => {
  const {
    isInCall,
    isConnecting,
    callError,
    localStream,
    participantsList
  } = useVideoStore();
  
  const location = useLocation();
  const { userEmail } = useUser();
  
  // Get session ID from prop first, then URL as fallback
  const searchParams = new URLSearchParams(location.search);
  const urlSessionId = searchParams.get("session");
  const sessionId = propSessionId || urlSessionId;
  
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationRef = useRef(false);

  // Initialize video service when component mounts
  useEffect(() => {
    const initializeVideoService = async () => {
      if (sessionId && userEmail && !initializationRef.current) {
        try {
          console.log('🎥 [VIDEO-PANEL] Initializing video service...');
          initializationRef.current = true;
          // Create user object similar to what other services expect
          const user = { id: userEmail, email: userEmail };
          await videoService.initialize(sessionId, user);
          setIsInitialized(true);
        } catch (error) {
          console.error('🎥 [VIDEO-PANEL] Failed to initialize video service:', error);
          initializationRef.current = false;
        }
      }
    };

    initializeVideoService();

    // Cleanup on unmount
    return () => {
      console.log('🎥 [VIDEO-PANEL] Cleaning up video service...');
      videoService.cleanup();
      setIsInitialized(false);
      initializationRef.current = false;
    };
  }, [sessionId, userEmail]);

  // Handle start video call
  const handleStartCall = async () => {
    if (!isInitialized) {
      console.error('🎥 [VIDEO-PANEL] Video service not initialized');
      return;
    }

    try {
      await videoService.startVideoCall();
    } catch (error) {
      console.error('🎥 [VIDEO-PANEL] Failed to start video call:', error);
    }
  };

  // Handle leave video call
  const handleLeaveCall = async () => {
    try {
      await videoService.leaveVideoCall();
    } catch (error) {
      console.error('🎥 [VIDEO-PANEL] Failed to leave video call:', error);
    }
  };

  // Render different states
  if (!sessionId || !userEmail) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-400 text-sm">Session not available</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
          <p className="text-gray-400 text-sm">Initializing video service...</p>
        </div>
      </div>
    );
  }

  if (callError) {
    return (
      <div className="p-4">
        <div className="bg-red-900/20 border border-red-700 rounded-md p-3 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="w-4 h-4 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-red-400 font-medium text-xs">Connection Error</h4>
              <p className="text-red-300 text-xs mt-1 leading-relaxed">{callError}</p>
            </div>
          </div>
        </div>
        
        {!isInCall && (
          <button
            onClick={handleStartCall}
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors text-sm"
          >
            {isConnecting ? 'Retrying...' : 'Try Again'}
          </button>
        )}
      </div>
    );
  }

  if (!isInCall && !isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-center max-w-xs">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-700 rounded-lg flex items-center justify-center">
            <Play className="w-6 h-6 text-gray-300 ml-0.5" />
          </div>
          
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            Video Chat
          </h3>
          <p className="text-gray-400 text-xs mb-6 leading-relaxed">
            Connect with session participants
          </p>

          <button
            onClick={handleStartCall}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center group"
          >
            <Play className="w-4 h-4 mr-2 ml-0.5" />
            Start Video Call
          </button>

          <p className="text-xs text-gray-500 mt-3">
            Camera & mic access required
          </p>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin text-blue-500" />
          <h3 className="text-sm font-medium text-gray-300 mb-1">
            Connecting...
          </h3>
          <p className="text-gray-400 text-xs">
            Setting up video call
          </p>
        </div>
      </div>
    );
  }

  // In call - show video grid and controls
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div>
          <h3 className="text-sm font-medium text-gray-200">Video Call</h3>
          <p className="text-xs text-gray-400">
            {participantsList.length + 1} participant{participantsList.length !== 0 ? 's' : ''}
          </p>
        </div>
        
        <button
          onClick={handleLeaveCall}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center"
        >
          <PhoneOff className="w-3 h-3 mr-1" />
          Leave
        </button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 overflow-hidden">
        <VideoGrid 
          localStream={localStream}
          participants={participantsList}
        />
      </div>

      {/* Controls */}
      <div className="border-t border-gray-700">
        <VideoControls />
      </div>
    </div>
  );
};

VideoCallPanel.propTypes = {
  sessionId: PropTypes.string
};

export default VideoCallPanel;
