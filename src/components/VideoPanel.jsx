import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Mic, MicOff, Video, VideoOff, User, AlertCircle, RefreshCw } from "lucide-react";
import { API_URL } from "../common/Constant";

const socket = io(`${API_URL}/video-chat`);

export default function VideoPanel() {
  const localVideoRef = useRef(null);
  const [remoteVideos, setRemoteVideos] = useState({});
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const peerConnections = useRef({});
  const searchParams = new URLSearchParams(location.search);
  const session = searchParams.get("session");
  const [permissionStatus, setPermissionStatus] = useState({
    camera: "pending", // pending, granted, denied
    microphone: "pending", // pending, granted, denied
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const videoConstraints = useRef({ facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } });
  const audioStream = useRef(null);
  const localStream = useRef(null);

  useEffect(() => {
    const initializeMedia = async () => {
      try {
        setIsRetrying(true);
        setErrorMessage("");
        
        // Request permissions with specific constraints
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoConstraints.current, 
          audio: true 
        });
        
        // Store for reference
        localStream.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Set permission status
        setPermissionStatus({
          camera: stream.getVideoTracks().length > 0 ? "granted" : "denied",
          microphone: stream.getAudioTracks().length > 0 ? "granted" : "denied",
        });

        socket.emit("join-room", { roomId: "room1", session });

        socket.on("existing-users", (users) => {
          users.forEach((userId) => createPeerConnection(userId, stream, true));
        });

        socket.on("user-connected", (userId, userSession) => {
          if (userSession === session) {
            createPeerConnection(userId, stream, true);
          }
        });

        socket.on("offer", async ({ offer, from, session: senderSession }) => {
          if (senderSession !== session) return;

          if (!peerConnections.current[from]) {
            createPeerConnection(from, stream, false);
          }
          await peerConnections.current[from].setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnections.current[from].createAnswer();
          await peerConnections.current[from].setLocalDescription(answer);
          socket.emit("answer", { answer, to: from, session });
        });

        socket.on("answer", async ({ answer, from, session: senderSession }) => {
          if (senderSession !== session) return;
          if (peerConnections.current[from]) {
            await peerConnections.current[from].setRemoteDescription(new RTCSessionDescription(answer));
          }
        });

        socket.on("candidate", async ({ candidate, from, session: senderSession }) => {
          if (senderSession !== session) return;
          if (peerConnections.current[from]) {
            await peerConnections.current[from].addIceCandidate(new RTCIceCandidate(candidate));
          }
        });

        socket.on("user-disconnected", (userId, userSession) => {
          if (userSession !== session) return;
          if (peerConnections.current[userId]) {
            peerConnections.current[userId].close();
            delete peerConnections.current[userId];
            setRemoteVideos((prevVideos) => {
              const updatedVideos = { ...prevVideos };
              delete updatedVideos[userId];
              return updatedVideos;
            });
          }
        });

      } catch (error) {
        console.error("Error accessing media devices:", error);
        
        // Handle specific permission errors
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          setPermissionStatus({
            camera: "denied",
            microphone: "denied",
          });
          setErrorMessage("Camera or microphone access was denied. Please grant permission and try again.");
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          setErrorMessage("No camera or microphone found. Please connect a device and try again.");
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
          setErrorMessage("Your camera or microphone is already in use by another application.");
        } else {
          setErrorMessage(`Error accessing media: ${error.message}`);
        }
      } finally {
        setIsRetrying(false);
      }
    };

    initializeMedia();

    return () => {
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      
      // Clean up local media streams
      if (localStream.current) {
        const tracks = localStream.current.getTracks();
        tracks.forEach(track => {
          track.stop();
        });
        localStream.current = null;
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      
      socket.disconnect();
    };
  }, [session]);

  const createPeerConnection = (userId, stream, createOffer) => {
    const peerConnection = new RTCPeerConnection();

    peerConnection.ontrack = (event) => {
      setRemoteVideos((prevVideos) => ({
        ...prevVideos,
        [userId]: event.streams[0],
      }));
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", { candidate: event.candidate, to: userId, session });
      }
    };

    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    peerConnections.current[userId] = peerConnection;

    if (createOffer) {
      createOfferForUser(userId);
    }
  };

  const createOfferForUser = async (userId) => {
    const offer = await peerConnections.current[userId].createOffer();
    await peerConnections.current[userId].setLocalDescription(offer);
    socket.emit("offer", { offer, to: userId, session });
  };

  const toggleMute = () => {
    setIsMuted((prevState) => {
      const newMutedState = !prevState;
      if (localStream.current) {
        localStream.current.getAudioTracks().forEach((track) => {
          track.enabled = !newMutedState;
        });
      }
      return newMutedState;
    });
  };

  const toggleCamera = async () => {
    try {
      const newCameraState = !isCameraOn;
      
      if (!localStream.current) return;
      
      // Stop and remove all video tracks when turning off camera
      if (!newCameraState) {
        // Find all video tracks in the stream
        const videoTracks = localStream.current.getVideoTracks();
        
        // Log for debugging
        console.log(`Found ${videoTracks.length} video tracks to stop`);
        
        // Stop each video track (this should release the camera)
        videoTracks.forEach(track => {
          console.log(`Stopping video track: ${track.label}`);
          track.stop();
          
          // Also remove the track from the stream
          localStream.current.removeTrack(track);
        });
        
        // Update the video element to reflect changes
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream.current;
        }
      } 
      // When turning camera back on, request camera again
      else {
        try {
          // Request camera permission again
          const newVideoStream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints.current,
            audio: false
          });
          
          if (newVideoStream && localStream.current) {
            // Get the first video track
            const videoTrack = newVideoStream.getVideoTracks()[0];
            
            if (videoTrack) {
              // Add this track to our existing stream
              localStream.current.addTrack(videoTrack);
              
              // Update the video element
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream.current;
              }
              
              // Update all peer connections with this new track
              Object.values(peerConnections.current).forEach(pc => {
                const senders = pc.getSenders();
                const videoSender = senders.find(sender => 
                  sender.track && sender.track.kind === 'video'
                );
                
                if (videoSender) {
                  videoSender.replaceTrack(videoTrack);
                } else {
                  pc.addTrack(videoTrack, localStream.current);
                }
              });
            }
          }
        } catch (err) {
          console.error("Failed to re-enable camera:", err);
          setErrorMessage("Failed to re-enable camera. It may be in use by another application.");
          // Don't update isCameraOn state since we failed
          return;
        }
      }
      
      // Update state if everything succeeded
      setIsCameraOn(newCameraState);
      
    } catch (error) {
      console.error("Error toggling camera:", error);
      setErrorMessage("Failed to toggle camera. Please try again.");
    }
  };
  

  const retryMediaAccess = () => {
    // Re-initialize media access
    setPermissionStatus({
      camera: "pending",
      microphone: "pending",
    });
    
    // Stop all existing tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        console.log(`Stopping track ${track.kind} during retry`);
        track.stop();
      });
      localStream.current = null;
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    // This will trigger the useEffect again
    const initializeMedia = async () => {
      try {
        setIsRetrying(true);
        setErrorMessage("");
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoConstraints.current, 
          audio: true 
        });
        
        // Store the stream
        localStream.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setPermissionStatus({
          camera: stream.getVideoTracks().length > 0 ? "granted" : "denied",
          microphone: stream.getAudioTracks().length > 0 ? "granted" : "denied",
        });

        // Reset audio/video states
        setIsMuted(false);
        setIsCameraOn(true);
        
      } catch (error) {
        console.error("Error during retry:", error);
        setErrorMessage("Failed to access media devices. Please check your permissions.");
      } finally {
        setIsRetrying(false);
      }
    };
    
    initializeMedia();
  };

  return (
    <div className="flex flex-col h-full overflow-auto py-2 px-2">
      {/* Permission error message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-100">{errorMessage}</p>
              <button 
                onClick={retryMediaAccess}
                disabled={isRetrying}
                className="mt-2 flex items-center space-x-1 text-xs text-white bg-red-500/30 hover:bg-red-500/50 px-2 py-1 rounded"
              >
                <RefreshCw size={12} className={`${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Your video */}
      <div className="mb-4 w-full">
        <div className="relative rounded-lg overflow-hidden shadow-lg border-2 border-blue-500">
          <div className="w-full" style={{ height: "200px" }}>
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover bg-gray-900" 
            />
            
            {/* Permission indicators */}
            {permissionStatus.camera === "pending" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <p className="text-white text-sm">Requesting camera access...</p>
              </div>
            )}
            
            {/* Camera off indicator */}
            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="flex flex-col items-center">
                  <VideoOff size={36} className="text-white mb-2" />
                  <p className="text-white text-sm">Camera turned off</p>
                </div>
              </div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-medium flex items-center">
                <User size={14} className="mr-1" /> You
              </span>
              <div className="flex space-x-1">
                {isMuted && (
                  <MicOff size={16} className="text-red-500" />
                )}
                {!isCameraOn && (
                  <VideoOff size={16} className="text-red-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Remote videos in a scrollable list */}
      <div className="flex-1 overflow-auto mb-4 space-y-4">
        {Object.entries(remoteVideos).map(([userId, stream]) => (
          <div key={userId} className="relative rounded-lg overflow-hidden shadow-lg border border-gray-600 mb-3">
            <div className="w-full" style={{ height: "160px" }}>
              <video 
                autoPlay 
                playsInline 
                ref={(el) => el && (el.srcObject = stream)} 
                className="w-full h-full object-cover bg-gray-900" 
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <span className="text-white text-sm font-medium flex items-center">
                <User size={14} className="mr-1" /> User {userId.slice(0, 5)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-3 bg-gray-800 rounded-lg p-2 shadow-lg">
        <button 
          onClick={toggleMute} 
          className={`p-2 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
          title={isMuted ? "Unmute" : "Mute"}
          disabled={permissionStatus.microphone === "denied"}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <button 
          onClick={toggleCamera} 
          className={`p-2 rounded-full transition-colors ${!isCameraOn ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
          title={isCameraOn ? "Turn off camera" : "Turn on camera"}
          disabled={permissionStatus.camera === "denied"}
        >
          {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
      </div>
    </div>
  );
}
