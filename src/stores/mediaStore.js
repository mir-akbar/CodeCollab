/**
 * Media Store
 * Manages video/audio devices, settings, and media state
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useMediaStore = create()(
  devtools(
    (set) => ({
      // Device state
      availableCameras: [],
      selectedCamera: '',
      availableMicrophones: [],
      selectedMicrophone: '',
      
      // UI state
      showSettings: false,
      showDeviceList: false,
      
      // Media state
      isVideoEnabled: true,
      isAudioEnabled: true,
      isMuted: false,
      isVideoOn: true,
      
      // Quality settings
      videoQuality: 'medium', // 'low', 'medium', 'high'
      audioQuality: 'medium',

      // Actions for devices
      setAvailableCameras: (cameras) => set({ 
        availableCameras: cameras 
      }, false, 'setAvailableCameras'),
      
      setSelectedCamera: (cameraId) => set({ 
        selectedCamera: cameraId 
      }, false, 'setSelectedCamera'),
      
      setAvailableMicrophones: (mics) => set({ 
        availableMicrophones: mics 
      }, false, 'setAvailableMicrophones'),
      
      setSelectedMicrophone: (micId) => set({ 
        selectedMicrophone: micId 
      }, false, 'setSelectedMicrophone'),

      // Actions for UI
      setShowSettings: (show) => set({ 
        showSettings: show 
      }, false, 'setShowSettings'),
      
      toggleSettings: () => set((state) => ({ 
        showSettings: !state.showSettings 
      }), false, 'toggleSettings'),
      
      setShowDeviceList: (show) => set({ 
        showDeviceList: show 
      }, false, 'setShowDeviceList'),

      // Actions for media controls
      setVideoEnabled: (enabled) => set({ 
        isVideoEnabled: enabled,
        isVideoOn: enabled
      }, false, 'setVideoEnabled'),
      
      setAudioEnabled: (enabled) => set({ 
        isAudioEnabled: enabled,
        isMuted: !enabled
      }, false, 'setAudioEnabled'),
      
      toggleVideo: () => set((state) => ({ 
        isVideoEnabled: !state.isVideoEnabled,
        isVideoOn: !state.isVideoEnabled
      }), false, 'toggleVideo'),
      
      toggleAudio: () => set((state) => ({ 
        isAudioEnabled: !state.isAudioEnabled,
        isMuted: state.isAudioEnabled
      }), false, 'toggleAudio'),

      // Actions for quality
      setVideoQuality: (quality) => set({ 
        videoQuality: quality 
      }, false, 'setVideoQuality'),
      
      setAudioQuality: (quality) => set({ 
        audioQuality: quality 
      }, false, 'setAudioQuality'),

      // Reset function
      resetMediaState: () => set({
        availableCameras: [],
        selectedCamera: '',
        availableMicrophones: [],
        selectedMicrophone: '',
        showSettings: false,
        showDeviceList: false,
        isVideoEnabled: true,
        isAudioEnabled: true,
        isMuted: false,
        isVideoOn: true,
        videoQuality: 'medium',
        audioQuality: 'medium'
      }, false, 'resetMediaState')
    }),
    {
      name: 'media-store',
    }
  )
);

export default useMediaStore;
