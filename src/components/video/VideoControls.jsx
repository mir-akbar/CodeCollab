/**
 * Video Controls Component
 * Provides mute, camera toggle, and other call controls
 */
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { videoService } from '../../services/VideoService';
import { useVideoStore } from '../../stores';

const VideoControls = () => {
  const { isMuted, isCameraEnabled } = useVideoStore();

  const handleToggleMute = () => {
    videoService.toggleMute();
  };

  const handleToggleCamera = () => {
    videoService.toggleCamera();
  };

  const handleLeaveCall = async () => {
    await videoService.leaveVideoCall();
  };

  return (
    <div className="flex items-center justify-center p-3 bg-gray-800">
      <div className="flex items-center space-x-2">
        {/* Mute/Unmute button */}
        <button
          onClick={handleToggleMute}
          className={`p-2 rounded-md transition-colors ${
            isMuted
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        {/* Camera toggle button */}
        <button
          onClick={handleToggleCamera}
          className={`p-2 rounded-md transition-colors ${
            !isCameraEnabled
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
          title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraEnabled ? (
            <Video className="w-4 h-4" />
          ) : (
            <VideoOff className="w-4 h-4" />
          )}
        </button>

        {/* Leave call button */}
        <button
          onClick={handleLeaveCall}
          className="p-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
          title="Leave call"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default VideoControls;
