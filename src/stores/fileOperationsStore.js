/**
 * File Operations Store
 * Handles UI state that TanStack Query doesn't cover:
 * - Drag/drop states
 * - Validation errors
 * - File selection
 * - Modal states
 * - Folder expansion
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useFileOperationsStore = create()(
  devtools((set, get) => ({
    // UI States per session
    sessions: {},

    // User preferences
    settings: {
      autoSave: true,
      autoSaveInterval: 5000,
      showHiddenFiles: false,
      defaultView: 'tree',
      sortBy: 'name',
      sortOrder: 'asc'
    },

    // === SESSION INITIALIZATION ===
    initializeSession: (sessionId) => set((state) => ({
      ...state,
      sessions: {
        ...state.sessions,
        [sessionId]: {
          selectedFile: null,
          expandedFolders: new Set(),
          isDragOver: false,
          validationError: null,
          modalStates: {
            deleteConfirm: { open: false, file: null },
            createFolder: { open: false, parentPath: null },
            rename: { open: false, file: null }
          }
        }
      }
    })),

    // === FILE SELECTION ===
    setSelectedFile: (sessionId, filePath) => set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            selectedFile: filePath
          }
        }
      };
    }),

    // === DRAG AND DROP ===
    setDragOver: (sessionId, isDragOver) => set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            isDragOver
          }
        }
      };
    }),

    // === VALIDATION ERRORS ===
    setValidationError: (sessionId, error) => set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            validationError: error
          }
        }
      };
    }),

    clearValidationError: (sessionId) => set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            validationError: null
          }
        }
      };
    }),

    // === FOLDER EXPANSION ===
    toggleFolder: (sessionId, folderPath) => set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      const expandedFolders = new Set(session.expandedFolders);
      if (expandedFolders.has(folderPath)) {
        expandedFolders.delete(folderPath);
      } else {
        expandedFolders.add(folderPath);
      }

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            expandedFolders
          }
        }
      };
    }),

    // === MODAL STATES ===
    openDeleteConfirm: (sessionId, file) => set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            modalStates: {
              ...session.modalStates,
              deleteConfirm: { open: true, file }
            }
          }
        }
      };
    }),

    closeDeleteConfirm: (sessionId) => set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            modalStates: {
              ...session.modalStates,
              deleteConfirm: { open: false, file: null }
            }
          }
        }
      };
    }),

    // === SETTINGS ===
    updateSettings: (newSettings) => set((state) => ({
      ...state,
      settings: {
        ...state.settings,
        ...newSettings
      }
    })),

    // === CLEANUP ===
    clearSession: (sessionId) => set((state) => {
      const newSessions = { ...state.sessions };
      delete newSessions[sessionId];
      return {
        ...state,
        sessions: newSessions
      };
    }),

    // === GETTERS ===
    getSessionData: (sessionId) => {
      const state = get();
      return state.sessions[sessionId] || null;
    }
  }), {
    name: 'file-operations-store',
    partialize: (state) => ({
      settings: state.settings
      // DO NOT persist sessions - these should be fresh on reload
    })
  })
);

export { useFileOperationsStore };
