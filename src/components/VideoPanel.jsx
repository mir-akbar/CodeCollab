import { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Mic, MicOff, Phone, PhoneCall, Users, Settings } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useVideoCall } from "@/hooks/video/useVideoCall";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { SingletonPermissionCheck } from "./video/PermissionCheck";
import useMediaStore from "@/stores/mediaStore";

// Video Components
function LocalVideo({ stream, mediaState, onToggleVideo, onToggleAudio, height = 'h-32' }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      console.log(`📺 [LOCAL-VIDEO] Set local stream to video element - Stream ID: ${stream.id}`);
    }
  }, [stream]);

  // Log media state changes
  useEffect(() => {
    console.log(`📺 [LOCAL-VIDEO] Media state changed - Video: ${mediaState.hasVideo}, Audio: ${mediaState.hasAudio}`);
  }, [mediaState]);

  // Adjust icon size based on video height
  const getIconSize = (height) => {
    if (height.includes('h-56') || height.includes('h-64')) return 'h-12 w-12';
    if (height.includes('h-40') || height.includes('h-44')) return 'h-10 w-10';
    if (height.includes('h-32') || height.includes('h-36')) return 'h-8 w-8';
    return 'h-6 w-6';
  };

  const iconSize = getIconSize(height);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full ${height} object-cover ${!mediaState.hasVideo ? 'hidden' : ''}`}
      />
      {!mediaState.hasVideo && (
        <div className={`w-full ${height} bg-gray-700 flex items-center justify-center`}>
          <VideoOff className={`${iconSize} text-gray-400`} />
        </div>
      )}
      
      {/* Local controls overlay */}
      <div className="absolute bottom-2 left-2 flex gap-2">
        <Button
          size="sm"
          variant={mediaState.hasVideo ? "default" : "destructive"}
          onClick={onToggleVideo}
          className="h-8 w-8 p-0"
        >
          {mediaState.hasVideo ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          variant={mediaState.hasAudio ? "default" : "destructive"}
          onClick={onToggleAudio}
          className="h-8 w-8 p-0"
        >
          {mediaState.hasAudio ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        You
      </div>
    </div>
  );
}

function RemoteVideo({ stream, participant, height = 'h-32' }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  // Adjust avatar size based on video height
  const getAvatarSize = (height) => {
    if (height.includes('h-56') || height.includes('h-64')) return 'w-16 h-16 text-xl';
    if (height.includes('h-40') || height.includes('h-44')) return 'w-14 h-14 text-lg';
    if (height.includes('h-32') || height.includes('h-36')) return 'w-12 h-12 text-base';
    return 'w-10 h-10 text-sm';
  };

  const avatarSize = getAvatarSize(height);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full ${height} object-cover ${!participant.hasVideo ? 'hidden' : ''}`}
      />
      {!participant.hasVideo && (
        <div className={`w-full ${height} bg-gray-700 flex items-center justify-center`}>
          <div className={`${avatarSize} bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold`}>
            {participant.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      )}
      
      {/* Participant info */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        {participant.name || participant.email?.split('@')[0] || 'Anonymous'}
      </div>
      
      {/* Media status indicators */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        {!participant.hasAudio && (
          <div className="bg-red-500 p-1 rounded">
            <MicOff className="h-3 w-3 text-white" />
          </div>
        )}
        {!participant.hasVideo && (
          <div className="bg-red-500 p-1 rounded">
            <VideoOff className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

function VideoGrid({ localStream, remoteStreams, participants, mediaState, onToggleVideo, onToggleAudio }) {
  const remoteStreamArray = Array.from(remoteStreams.entries());
  const totalParticipants = remoteStreamArray.length + (localStream ? 1 : 0);
  
  // Calculate optimal grid layout based on participant count
  const getGridLayout = (count) => {
    if (count === 1) return { cols: 1, rows: 1, size: 'large' };
    if (count === 2) return { cols: 1, rows: 2, size: 'medium' };
    if (count === 3) return { cols: 2, rows: 2, size: 'medium' }; // 2x2 grid with one empty
    if (count === 4) return { cols: 2, rows: 2, size: 'medium' };
    if (count <= 6) return { cols: 2, rows: 3, size: 'small' };
    if (count <= 9) return { cols: 3, rows: 3, size: 'small' };
    if (count <= 12) return { cols: 3, rows: 4, size: 'tiny' };
    return { cols: 4, rows: Math.ceil(count / 4), size: 'tiny' };
  };
  
  const layout = getGridLayout(totalParticipants);
  
  // Size classes for different layouts with better aspect ratios
  const sizeClasses = {
    large: 'h-56 md:h-64', // Single participant - large view
    medium: 'h-40 md:h-44', // 2-4 participants - medium view
    small: 'h-32 md:h-36', // 5-9 participants - smaller view
    tiny: 'h-24 md:h-28' // 10+ participants - compact view
  };
  
  const videoHeight = sizeClasses[layout.size];
  
  // Grid container classes with responsive design
  const gridClasses = `grid gap-2 md:gap-3 ${
    layout.cols === 1 ? 'grid-cols-1' :
    layout.cols === 2 ? 'grid-cols-1 sm:grid-cols-2' :
    layout.cols === 3 ? 'grid-cols-2 sm:grid-cols-3' :
    'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
  }`;

  // Ensure consistent aspect ratio for all videos
  return (
    <div className="w-full">
      <div className={gridClasses}>
        {/* Local video */}
        {localStream && (
          <LocalVideo 
            stream={localStream} 
            mediaState={mediaState}
            onToggleVideo={onToggleVideo}
            onToggleAudio={onToggleAudio}
            height={videoHeight}
          />
        )}
        
        {/* Remote videos */}
        {remoteStreamArray.map(([userId, stream]) => {
          const participant = participants.find(p => p.userId === userId);
          if (!participant) return null;
          
          return (
            <RemoteVideo 
              key={userId}
              stream={stream} 
              participant={participant}
              height={videoHeight}
            />
          );
        })}
      </div>
    </div>
  );
}

function CallControls({ isInCall, isConnected, isLoading, onStartCall, onJoinCall, onLeaveCall, participantCount, hasActiveCall, canJoinCall }) {
  if (!isConnected) {
    return (
      <div className="text-center text-gray-400 text-sm">
        <p>Connecting to video service...</p>
      </div>
    );
  }

  if (!isInCall) {
    return (
      <div className="space-y-3">        {/* Show Start Call button only if there's no active call */}
        {!hasActiveCall && (
          <Button
            onClick={() => {
              console.log(`🎬 [UI] User clicked Start Call button - hasActiveCall: ${hasActiveCall}, isInCall: ${isInCall}, isConnected: ${isConnected}`);
              onStartCall();
            }}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            {isLoading ? 'Starting...' : 'Start Video Call'}
          </Button>
        )}
        
        {/* Show Join Call button if there's an active call we can join */}
        {canJoinCall && (
          <Button
            onClick={() => {
              console.log(`🚪 [UI] User clicked Join Call button - hasActiveCall: ${hasActiveCall}, canJoinCall: ${canJoinCall}, participantCount: ${participantCount}`);
              onJoinCall();
            }}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <Users className="h-4 w-4 mr-2" />
            {isLoading ? 'Joining...' : `Join Call (${participantCount} users)`}
          </Button>
        )}
        
        {/* Show info if there's an active call but we can't join yet */}
        {hasActiveCall && !canJoinCall && (
          <div className="text-center text-blue-400 text-sm p-3 bg-blue-500/20 rounded-lg">
            <p>Video call is active</p>
            <p className="text-xs text-gray-400 mt-1">
              Setting up connection...
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-center text-green-400 text-sm mb-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Call in progress
        </div>
        {participantCount > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {participantCount + 1} participant{participantCount > 0 ? 's' : ''} total
          </p>
        )}
      </div>
      
      <Button
        onClick={onLeaveCall}
        variant="destructive"
        className="w-full"
      >
        <Phone className="h-4 w-4 mr-2" />
        Leave Call
      </Button>
    </div>
  );
}

export default function VideoPanel() {
  const location = useLocation();
  const { userEmail } = useUser();
  
  // Zustand media state
  const {
    showSettings,
    availableCameras,
    selectedCamera,
    setShowSettings,
    setAvailableCameras,
    setSelectedCamera
  } = useMediaStore();
  
  // Get session ID from URL
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get("session");
  
  console.log(`📺 [VIDEO-PANEL] Rendering VideoPanel - sessionId: ${sessionId}, userEmail: ${userEmail}`);

  // Use video call hook
  const {
    isInCall,
    isConnected,
    isLoading,
    error,
    participants,
    localStream,
    remoteStreams,
    mediaState,
    hasActiveCall,
    canJoinCall,
    startCall,
    joinCall,
    leaveCall,
    toggleVideo,
    toggleAudio,
    clearError,
    participantCount,
    getDebugInfo
  } = useVideoCall(sessionId);

  // Log key state changes
  useEffect(() => {
    console.log(`📺 [VIDEO-PANEL] State changed - isInCall: ${isInCall}, hasActiveCall: ${hasActiveCall}, canJoinCall: ${canJoinCall}, isConnected: ${isConnected}, participantCount: ${participantCount}`);
  }, [isInCall, hasActiveCall, canJoinCall, isConnected, participantCount]);

  // Handle call actions with error handling
  const handleStartCall = async () => {
    console.log(`🎬 [VIDEO-PANEL] handleStartCall triggered`);
    try {
      await startCall();
      toast.success("Video call started!");
      console.log(`✅ [VIDEO-PANEL] Start call completed successfully`);
    } catch (error) {
      console.error(`❌ [VIDEO-PANEL] Start call failed:`, error);
      toast.error(error.message || "Failed to start video call");
    }
  };

  const handleJoinCall = async () => {
    console.log(`🎬 [VIDEO-PANEL] handleJoinCall triggered`);
    try {
      await joinCall();
      toast.success("Joined video call!");
      console.log(`✅ [VIDEO-PANEL] Join call completed successfully`);
    } catch (error) {
      console.error(`❌ [VIDEO-PANEL] Join call failed:`, error);
      toast.error(error.message || "Failed to join video call");
    }
  };

  const handleLeaveCall = () => {
    console.log(`📞 [VIDEO-PANEL] handleLeaveCall triggered`);
    try {
      leaveCall();
      toast.info("Left video call");
      console.log(`✅ [VIDEO-PANEL] Leave call completed successfully`);
    } catch (error) {
      console.error(`❌ [VIDEO-PANEL] Leave call failed:`, error);
      toast.error("Failed to leave call properly");
    }
  };
  const handleToggleVideo = async () => {
    console.log(`📹 [VIDEO-PANEL] handleToggleVideo triggered`);
    try {
      const newState = await toggleVideo();
      toast.info(newState ? "Camera turned on" : "Camera turned off");
      console.log(`✅ [VIDEO-PANEL] Toggle video completed successfully - New State: ${newState}`);
    } catch (error) {
      console.error(`❌ [VIDEO-PANEL] Toggle video failed:`, error);
      toast.error("Failed to toggle camera");
    }
  };

  const handleToggleAudio = () => {
    console.log(`🎤 [VIDEO-PANEL] handleToggleAudio triggered`);
    const newState = toggleAudio();
    toast.info(newState ? "Microphone unmuted" : "Microphone muted");
    console.log(`✅ [VIDEO-PANEL] Toggle audio completed successfully - New State: ${newState}`);
  };
  // Clear error on mount
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Load available cameras
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(cameras);
        
        // Set default camera if none selected
        if (cameras.length > 0 && !selectedCamera) {
          setSelectedCamera(cameras[0].deviceId);
        }
      } catch (error) {
        console.error('Error loading cameras:', error);
      }
    };

    loadCameras();
  }, [selectedCamera, setAvailableCameras, setSelectedCamera]);

  if (!sessionId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-400 p-4">
        <Video className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm text-center">No session selected</p>
        <p className="text-xs text-center mt-2">Join a session to start video calling</p>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-400 p-4">
        <Video className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm text-center">Please log in to use video chat</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#444]">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium">Video Call</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 h-8 w-8"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <div className="m-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error.message}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearError}
            className="mt-2 text-red-400 hover:text-red-300"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main content - flexible area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3">
          {isInCall && (localStream || remoteStreams.size > 0) ? (
            <VideoGrid
              localStream={localStream}
              remoteStreams={remoteStreams}
              participants={participants}
              mediaState={mediaState}
              onToggleVideo={handleToggleVideo}
              onToggleAudio={handleToggleAudio}
            />
          ) : !isInCall && !isConnected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm">Connecting to video service...</p>
            </div>          ) : !isInCall ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Video className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-sm text-center mb-4">No active video call</p>
              <SingletonPermissionCheck 
                key="video-permission-check"
                onPermissionGranted={() => {
                  // Permissions granted, user can now start calls
                }}
                isLoading={isLoading}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Video className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-sm text-center mb-2">Setting up video...</p>
              <p className="text-xs text-center">
                Please allow camera and microphone access when prompted
              </p>
            </div>
          )}
        </div>

        {/* Controls - always at bottom of content area */}        <div className="p-3 border-t border-[#444]">
          <CallControls
            isInCall={isInCall}
            isConnected={isConnected}
            isLoading={isLoading}
            onStartCall={handleStartCall}
            onJoinCall={handleJoinCall}
            onLeaveCall={handleLeaveCall}
            participantCount={participantCount}
            hasActiveCall={hasActiveCall}
            canJoinCall={canJoinCall}
          />
        </div>
      </div>      {/* Settings panel (if shown) */}
      {showSettings && (
        <div className="border-t border-[#444] p-3 bg-[#2d2d2d]">
          <h4 className="text-sm font-medium mb-3">Video Settings</h4>
          <div className="space-y-3 text-xs text-gray-400">
            {/* Status info */}
            <div className="space-y-1">
              <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
              <div>Participants: {participantCount}</div>
              <div>Camera: {mediaState.hasVideo ? '🟢 On' : '🔴 Off'}</div>
              <div>Microphone: {mediaState.hasAudio ? '🟢 On' : '🔴 Off'}</div>
            </div>            {/* Camera selection */}
            {availableCameras.length > 1 && (
              <div className="pt-2 border-t border-[#555]">
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Camera Device:
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full text-xs bg-[#3d3d3d] border border-[#555] rounded px-2 py-1 text-gray-300"
                >
                  {availableCameras.map((camera, index) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Restart video to use new camera
                </p>
              </div>
            )}
            
            {/* Debug section */}
            <div className="pt-3 border-t border-[#555]">
              <h5 className="text-xs font-medium text-gray-300 mb-2">Debug Info</h5>
              <div className="space-y-1">
                <div>Local Stream: {localStream ? '✅ Active' : '❌ None'}</div>
                <div>Remote Streams: {remoteStreams.size}</div>
                <div>Available Cameras: {availableCameras.length}</div>
                <div>Session ID: {sessionId ? sessionId.substring(0, 8) + '...' : 'None'}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const debug = await getDebugInfo();
                    console.log('🐛 Video Chat Debug Info:', debug);
                    toast.info('Debug info logged to console');
                  }}
                  className="mt-2 h-6 text-xs"
                >
                  Log Debug Info
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}{/* Permission check component - conditional wrapper */}      
      <SingletonPermissionCheck 
        onPermissionGranted={() => {
          // Re-attempt to join the call if permissions are granted
          if (!isInCall) {
            handleJoinCall();
          }
        }}
        isLoading={isLoading}
        renderWrapper={(content) => content ? <div className="p-2">{content}</div> : content}
      />
    </div>
  );
}

// PropTypes definitions
LocalVideo.propTypes = {
  stream: PropTypes.object,
  mediaState: PropTypes.shape({
    hasAudio: PropTypes.bool,
    hasVideo: PropTypes.bool
  }).isRequired,
  onToggleVideo: PropTypes.func.isRequired,
  onToggleAudio: PropTypes.func.isRequired,
  height: PropTypes.string
};

RemoteVideo.propTypes = {
  stream: PropTypes.object,
  participant: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    hasAudio: PropTypes.bool,
    hasVideo: PropTypes.bool
  }).isRequired,
  height: PropTypes.string
};

VideoGrid.propTypes = {
  localStream: PropTypes.object,
  remoteStreams: PropTypes.instanceOf(Map).isRequired,
  participants: PropTypes.array.isRequired,
  mediaState: PropTypes.shape({
    hasAudio: PropTypes.bool,
    hasVideo: PropTypes.bool
  }).isRequired,
  onToggleVideo: PropTypes.func.isRequired,
  onToggleAudio: PropTypes.func.isRequired
};

CallControls.propTypes = {
  isInCall: PropTypes.bool.isRequired,
  isConnected: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onStartCall: PropTypes.func.isRequired,
  onJoinCall: PropTypes.func.isRequired,
  onLeaveCall: PropTypes.func.isRequired,
  participantCount: PropTypes.number.isRequired,
  hasActiveCall: PropTypes.bool.isRequired,
  canJoinCall: PropTypes.bool.isRequired
};
