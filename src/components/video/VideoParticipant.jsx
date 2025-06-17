/**
 * Video Participant Component
 * Displays a single participant's video stream
 */
import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { User, VideoOff, VolumeX } from 'lucide-react';

const VideoParticipant = ({ participant }) => {
  const videoRef = useRef(null);
  const { userId, userEmail, stream } = participant;

  // Set up video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Check if video track is enabled
  const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
  const hasAudio = stream && stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled;

  return (
    <div className="relative bg-gray-800 rounded-md overflow-hidden border border-gray-700">
      {hasVideo && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-800">
          <div className="text-center text-gray-400">
            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
              <User className="w-6 h-6" />
            </div>
            <p className="text-xs">{userEmail || 'User'}</p>
            {!hasVideo && (
              <div className="flex items-center justify-center mt-1">
                <VideoOff className="w-3 h-3 mr-1" />
                <span className="text-xs">Camera off</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* User info overlay */}
      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
        <div className="flex items-center">
          <User className="w-3 h-3 mr-1" />
          {userEmail || userId}
        </div>
      </div>
      
      {/* Audio indicator */}
      {!hasAudio && (
        <div className="absolute bottom-2 right-2 bg-red-600/80 text-white p-1 rounded">
          <VolumeX className="w-3 h-3" />
        </div>
      )}
      
      {/* Connection status indicator */}
      {!stream && (
        <div className="absolute top-2 right-2 bg-yellow-600 text-white px-2 py-0.5 rounded text-xs">
          Connecting...
        </div>
      )}
      
      {stream && (
        <div className="absolute top-2 right-2 bg-green-500 w-2 h-2 rounded-full"></div>
      )}
    </div>
  );
};

VideoParticipant.propTypes = {
  participant: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    userEmail: PropTypes.string,
    stream: PropTypes.object
  }).isRequired
};

export default VideoParticipant;
