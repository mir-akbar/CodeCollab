/**
 * Real-time Collaboration State Store
 * Centralizes all collaboration state management for better performance and consistency
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

const useCollaborationStore = create()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Session-wide collaboration state
      sessions: {},

      // File-specific collaboration state  
      files: {},

      // Global collaboration status
      globalStatus: {
        isInitialized: false,
        hasAnyConnection: false,
        totalOnlineUsers: 0,
        networkStatus: 'online', // 'online' | 'offline' | 'reconnecting'
      },

      // Real-time notifications/events queue
      events: [],
      maxEvents: 50,

      // Connection management
      connections: new Map(),

      // === INITIALIZATION ACTIONS ===
      initializeCollaboration: () => set((state) => ({
        ...state,
        globalStatus: {
          ...state.globalStatus,
          isInitialized: true,
          networkStatus: 'online'
        }
      })),

      // === SESSION COLLABORATION ACTIONS ===
      createSession: (sessionId) => set((state) => ({
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            isConnected: false,
            connectionQuality: 'disconnected',
            onlineUsers: new Set(),
            userDetails: new Map(),
            lastActivity: Date.now(),
            reconnectAttempts: 0
          }
        }
      })),

      updateSessionConnection: (sessionId, isConnected, quality = 'good') => set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        const updatedSession = {
          ...session,
          isConnected,
          connectionQuality: quality,
          lastActivity: Date.now(),
          reconnectAttempts: isConnected ? 0 : session.reconnectAttempts + 1
        };

        const hasAnyConnection = Object.values({
          ...state.sessions,
          [sessionId]: updatedSession
        }).some(s => s.isConnected);

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: updatedSession
          },
          globalStatus: {
            ...state.globalStatus,
            hasAnyConnection,
            networkStatus: hasAnyConnection ? 'online' : 'offline'
          }
        };
      }),

      addUserToSession: (sessionId, userEmail, userDetails = {}) => set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        const newOnlineUsers = new Set(session.onlineUsers);
        newOnlineUsers.add(userEmail);

        const newUserDetails = new Map(session.userDetails);
        newUserDetails.set(userEmail, {
          email: userEmail,
          joinedAt: Date.now(),
          isActive: true,
          ...userDetails
        });

        // Calculate total online users across all sessions
        const allUsers = new Set();
        Object.entries({
          ...state.sessions,
          [sessionId]: { ...session, onlineUsers: newOnlineUsers }
        }).forEach(([, sess]) => {
          sess.onlineUsers.forEach(email => allUsers.add(email));
        });

        const newEvent = {
          id: Date.now(),
          type: 'user-joined',
          sessionId,
          userEmail,
          timestamp: Date.now()
        };

        const newEvents = [newEvent, ...state.events].slice(0, state.maxEvents);

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              onlineUsers: newOnlineUsers,
              userDetails: newUserDetails
            }
          },
          globalStatus: {
            ...state.globalStatus,
            totalOnlineUsers: allUsers.size
          },
          events: newEvents
        };
      }),

      removeUserFromSession: (sessionId, userEmail) => set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        const newOnlineUsers = new Set(session.onlineUsers);
        newOnlineUsers.delete(userEmail);

        const newUserDetails = new Map(session.userDetails);
        newUserDetails.delete(userEmail);

        // Calculate total online users across all sessions
        const allUsers = new Set();
        Object.entries({
          ...state.sessions,
          [sessionId]: { ...session, onlineUsers: newOnlineUsers }
        }).forEach(([, sess]) => {
          sess.onlineUsers.forEach(email => allUsers.add(email));
        });

        const newEvent = {
          id: Date.now(),
          type: 'user-left',
          sessionId,
          userEmail,
          timestamp: Date.now()
        };

        const newEvents = [newEvent, ...state.events].slice(0, state.maxEvents);

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              onlineUsers: newOnlineUsers,
              userDetails: newUserDetails
            }
          },
          globalStatus: {
            ...state.globalStatus,
            totalOnlineUsers: allUsers.size
          },
          events: newEvents
        };
      }),

      // === FILE COLLABORATION ACTIONS ===
      initializeFileCollaboration: (sessionId, filePath) => set((state) => {
        const key = `${sessionId}-${filePath}`;
        if (state.files[key]) return state;

        return {
          ...state,
          files: {
            ...state.files,
            [key]: {
              isReady: false,
              hasEditor: false,
              cursors: new Map(),
              selections: new Map(),
              isContentSynced: false,
              lastSync: null
            }
          }
        };
      }),

      setFileCollaborationReady: (sessionId, filePath, ready = true) => set((state) => {
        const key = `${sessionId}-${filePath}`;
        const fileState = state.files[key];
        if (!fileState) return state;

        return {
          ...state,
          files: {
            ...state.files,
            [key]: {
              ...fileState,
              isReady: ready,
              lastSync: ready ? Date.now() : fileState.lastSync
            }
          }
        };
      }),

      updateCursorPosition: (sessionId, filePath, clientId, cursorData) => set((state) => {
        const key = `${sessionId}-${filePath}`;
        const fileState = state.files[key];
        if (!fileState) return state;

        const newCursors = new Map(fileState.cursors);
        newCursors.set(clientId, {
          ...cursorData,
          timestamp: Date.now()
        });

        return {
          ...state,
          files: {
            ...state.files,
            [key]: {
              ...fileState,
              cursors: newCursors
            }
          }
        };
      }),

      updateSelection: (sessionId, filePath, clientId, selectionData) => set((state) => {
        const key = `${sessionId}-${filePath}`;
        const fileState = state.files[key];
        if (!fileState) return state;

        const newSelections = new Map(fileState.selections);
        newSelections.set(clientId, {
          ...selectionData,
          timestamp: Date.now()
        });

        return {
          ...state,
          files: {
            ...state.files,
            [key]: {
              ...fileState,
              selections: newSelections
            }
          }
        };
      }),

      // === CONNECTION MANAGEMENT ===
      addConnection: (key, connection) => set((state) => {
        const newConnections = new Map(state.connections);
        newConnections.set(key, connection);
        return {
          ...state,
          connections: newConnections
        };
      }),

      removeConnection: (key) => set((state) => {
        const newConnections = new Map(state.connections);
        newConnections.delete(key);
        return {
          ...state,
          connections: newConnections
        };
      }),

      // === EVENT MANAGEMENT ===
      addEvent: (event) => set((state) => {
        const newEvent = {
          ...event,
          id: event.id || Date.now(),
          timestamp: event.timestamp || Date.now()
        };

        const newEvents = [newEvent, ...state.events].slice(0, state.maxEvents);
        return {
          ...state,
          events: newEvents
        };
      }),

      clearEvents: () => set((state) => ({
        ...state,
        events: []
      })),

      // === CLEANUP ACTIONS ===
      cleanupSession: (sessionId) => set((state) => {
        // eslint-disable-next-line no-unused-vars
        const { [sessionId]: _, ...remainingSessions } = state.sessions;
        
        // Remove file states for this session
        const remainingFiles = {};
        Object.entries(state.files).forEach(([key, fileState]) => {
          if (!key.startsWith(`${sessionId}-`)) {
            remainingFiles[key] = fileState;
          }
        });

        // Update global status
        const hasAnyConnection = Object.values(remainingSessions).some(s => s.isConnected);
        const allUsers = new Set();
        Object.values(remainingSessions).forEach(session => {
          session.onlineUsers.forEach(email => allUsers.add(email));
        });

        return {
          ...state,
          sessions: remainingSessions,
          files: remainingFiles,
          globalStatus: {
            ...state.globalStatus,
            hasAnyConnection,
            totalOnlineUsers: allUsers.size
          }
        };
      }),

      cleanupFile: (sessionId, filePath) => set((state) => {
        const key = `${sessionId}-${filePath}`;
        // eslint-disable-next-line no-unused-vars
        const { [key]: _, ...remainingFiles } = state.files;
        
        return {
          ...state,
          files: remainingFiles
        };
      }),

      // === SELECTOR HELPERS ===
      getSessionUsers: (sessionId) => {
        const session = get().sessions[sessionId];
        return session ? Array.from(session.onlineUsers) : [];
      },

      getFileCollaborationStatus: (sessionId, filePath) => {
        const key = `${sessionId}-${filePath}`;
        return get().files[key] || null;
      },

      getConnectionQuality: (sessionId) => {
        const session = get().sessions[sessionId];
        return session ? session.connectionQuality : 'disconnected';
      },

      getAllConnectedSessions: () => {
        return Object.entries(get().sessions)
          .filter(([, session]) => session.isConnected)
          .map(([sessionId, session]) => ({ sessionId, ...session }));
      }
    })),
    { name: 'CollaborationStore' }
  )
);

export { useCollaborationStore };
