/**
 * Editor State Store  
 * Manages Monaco Editor and code collaboration state
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useEditorStore = create()(
  devtools(
    (set, get) => ({
      // Current file state
      currentFilePath: null,
      hasContentSet: false,
      isCollaborationReady: false,
      currentContent: "",
      
      // Collaboration state
      onlineUsers: [],
      isConnected: false,
      isLoading: true,
      error: null,
      
      // Code execution state
      isExecuting: false,
      output: "",
      isOutputVisible: false,
      isEditable: false,
      executionResult: null,

      // Actions
      setCurrentFile: (filePath) => set({ 
        currentFilePath: filePath,
        hasContentSet: false,
        isCollaborationReady: false,
        error: null
      }, false, 'setCurrentFile'),

      setContentSet: (isSet) => set({ hasContentSet: isSet }, false, 'setContentSet'),
      
      setCollaborationReady: (ready) => set({ 
        isCollaborationReady: ready 
      }, false, 'setCollaborationReady'),

      setCurrentContent: (content) => set({ currentContent: content }, false, 'setCurrentContent'),

      setOnlineUsers: (users) => set({ onlineUsers: users }, false, 'setOnlineUsers'),
      
      setConnectionStatus: (connected, loading = false) => set({ 
        isConnected: connected,
        isLoading: loading 
      }, false, 'setConnectionStatus'),

      setError: (error) => set({ error }, false, 'setError'),
      
      // Code execution actions
      setExecuting: (executing) => set({ isExecuting: executing }, false, 'setExecuting'),
      
      setOutput: (output) => set({ output }, false, 'setOutput'),
      
      setOutputVisible: (visible) => set({ isOutputVisible: visible }, false, 'setOutputVisible'),
      
      setEditable: (editable) => set({ isEditable: editable }, false, 'setEditable'),

      // Complex actions
      resetEditor: () => set({
        currentFilePath: null,
        hasContentSet: false,
        isCollaborationReady: false,
        onlineUsers: [],
        isConnected: false,
        isLoading: true,
        error: null,
        isExecuting: false,
        output: "",
        isOutputVisible: false,
        isEditable: false,
        executionResult: null,
      }, false, 'resetEditor'),

      updateCollaborationState: (state) => set((current) => ({
        ...current,
        ...state
      }), false, 'updateCollaborationState'),

      // Selectors (computed values)
      isEditorReady: () => {
        const state = get();
        return state.hasContentSet && state.isCollaborationReady && !state.error;
      },

      getOnlineUserCount: () => get().onlineUsers.length,
    }),
    {
      name: 'editor-store',
    }
  )
);

export default useEditorStore;
