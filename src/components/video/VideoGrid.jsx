/**
 * Video Grid Component
 * Displays local and remote video streams in a grid layout
 */
import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { User, VideoOff } from 'lucide-react';
import VideoParticipant from './VideoParticipant';
import { useVideoStore } from '../../stores';

const VideoGrid = ({ localStream, participants }) => {
  const localVideoRef = useRef(null);
  const { isCameraEnabled } = useVideoStore();

  // Set up local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Update video tracks when camera state changes
  useEffect(() => {
    console.log(`🎥 [VIDEO-GRID] Effect triggered - isCameraEnabled: ${isCameraEnabled}, hasStream: ${!!localStream}`);
    
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      console.log(`🎥 [VIDEO-GRID] Found ${videoTracks.length} video tracks`);
      
      videoTracks.forEach((track, index) => {
        console.log(`🎥 [VIDEO-GRID] Track ${index} - before: enabled=${track.enabled}, setting to: ${isCameraEnabled}`);
        track.enabled = isCameraEnabled;
        console.log(`🎥 [VIDEO-GRID] Track ${index} - after: enabled=${track.enabled}`);
      });
      
      // Force video element refresh when camera is enabled
      if (isCameraEnabled && localVideoRef.current) {
        console.log('🎥 [VIDEO-GRID] Forcing video refresh for camera toggle');
        // Multiple methods to force refresh
        localVideoRef.current.srcObject = null;
        localVideoRef.current.load();
        
        // Re-attach stream after a brief delay
        setTimeout(() => {
          if (localVideoRef.current && localStream) {
            console.log('🎥 [VIDEO-GRID] Re-attaching stream to video element');
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(e => {
              console.warn('🎥 [VIDEO-GRID] Auto-play failed:', e);
            });
          }
        }, 50);
      }
    }
  }, [isCameraEnabled, localStream]);

  // Check if video should be displayed - use both state and actual track status
  const shouldShowVideo = isCameraEnabled && localStream && 
    localStream.getVideoTracks().length > 0;

  // Calculate grid layout based on participant count
  const totalParticipants = participants.length + 1; // +1 for local user
  const getGridCols = () => {
    if (totalParticipants <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  return (
    <div className="h-full p-3">
      <div className={`grid ${getGridCols()} gap-3 h-full`}>
        {/* Local video */}
        <div className="relative bg-gray-800 rounded-md overflow-hidden border border-gray-700 min-h-[200px]">
          {shouldShowVideo ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-800">
              <div className="text-center text-gray-400">
                <VideoOff className="w-6 h-6 mx-auto mb-2" />
                <p className="text-xs">Camera off</p>
              </div>
            </div>
          )}
          
          {/* Local user label */}
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
            <div className="flex items-center">
              <User className="w-3 h-3 mr-1" />
              You
            </div>
          </div>
          
          {/* Local indicator */}
          <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-0.5 rounded text-xs">
            Local
          </div>
        </div>

        {/* Remote participants */}
        {participants.map(participant => (
          <VideoParticipant
            key={participant.userId}
            participant={participant}
          />
        ))}

        {/* Empty slots for visual balance (show only if less than 4 total) */}
        {totalParticipants < 4 && Array.from({ length: 4 - totalParticipants }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="bg-gray-800 border border-gray-700 border-dashed rounded-md flex items-center justify-center"
          >
            <div className="text-gray-500 text-center">
              <User className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs">Waiting...</p>
            </div>
          </div>
        ))}
      </div>

      {/* Info overlay for many participants */}
      {totalParticipants > 6 && (
        <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-xs">
          {totalParticipants} in call
        </div>
      )}
    </div>
  );
};

VideoGrid.propTypes = {
  localStream: PropTypes.object,
  participants: PropTypes.array.isRequired
};

export default VideoGrid;
