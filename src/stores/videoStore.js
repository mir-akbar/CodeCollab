/**
 * Video Store
 * Manages video call state using Zustand
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const videoStore = create(
  devtools(
    (set, get) => ({
      // Call state
      isInCall: false,
      isConnecting: false,
      callError: null,
      
      // Local media state
      localStream: null,
      isMuted: false,
      isCameraEnabled: true,
      
      // Participants
      participants: new Map(), // Map<userId, { stream, userEmail, peerConnection }>
      participantsList: [], // Array of participant objects for UI
      
      // Connection management
      sessionId: null,
      
      // Actions
      setCallState: (isInCall, isConnecting = false) =>
        set({ isInCall, isConnecting }, false, 'setCallState'),
      
      setCallError: (error) =>
        set({ callError: error }, false, 'setCallError'),
      
      setLocalStream: (stream) =>
        set({ localStream: stream }, false, 'setLocalStream'),
      
      setMuted: (isMuted) =>
        set({ isMuted }, false, 'setMuted'),
      
      setCameraEnabled: (isCameraEnabled) =>
        set({ isCameraEnabled }, false, 'setCameraEnabled'),
      
      setSessionId: (sessionId) =>
        set({ sessionId }, false, 'setSessionId'),
      
      // Participant management
      addParticipant: (userId, participantData) =>
        set((state) => {
          const newParticipants = new Map(state.participants);
          newParticipants.set(userId, participantData);
          
          return {
            participants: newParticipants,
            participantsList: Array.from(newParticipants.entries()).map(([id, data]) => ({
              userId: id,
              ...data
            }))
          };
        }, false, 'addParticipant'),
      
      removeParticipant: (userId) =>
        set((state) => {
          const newParticipants = new Map(state.participants);
          newParticipants.delete(userId);
          
          return {
            participants: newParticipants,
            participantsList: Array.from(newParticipants.entries()).map(([id, data]) => ({
              userId: id,
              ...data
            }))
          };
        }, false, 'removeParticipant'),
      
      updateParticipantStream: (userId, stream) =>
        set((state) => {
          const newParticipants = new Map(state.participants);
          const participant = newParticipants.get(userId);
          if (participant) {
            newParticipants.set(userId, { ...participant, stream });
            
            return {
              participants: newParticipants,
              participantsList: Array.from(newParticipants.entries()).map(([id, data]) => ({
                userId: id,
                ...data
              }))
            };
          }
          return {};
        }, false, 'updateParticipantStream'),
      
      // Reset state
      resetVideoState: () =>
        set({
          isInCall: false,
          isConnecting: false,
          callError: null,
          localStream: null,
          participants: new Map(),
          participantsList: [],
          sessionId: null
        }, false, 'resetVideoState'),
      
      // Cleanup
      cleanup: () => {
        const { localStream, participants } = get();
        
        // Stop local stream
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        
        // Close all peer connections
        participants.forEach((participant) => {
          if (participant.peerConnection) {
            participant.peerConnection.close();
          }
          if (participant.stream) {
            participant.stream.getTracks().forEach(track => track.stop());
          }
        });
        
        // Reset state
        get().resetVideoState();
      }
    }),
    {
      name: 'video-store',
      enabled: import.meta.env.DEV
    }
  )
);

export default videoStore;
