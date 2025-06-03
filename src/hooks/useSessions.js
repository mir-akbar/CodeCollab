import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

// Session API functions
const sessionAPI = {
  // Fetch all sessions for a user
  getUserSessions: async (userEmail) => {
    const response = await axios.get(`${API_URL}/sessions`, {
      params: { email: userEmail }
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch sessions');
    }
    
    return response.data.sessions || [];
  },

  // Create a new session
  createSession: async ({ sessionData, userEmail }) => {
    const response = await axios.post(`${API_URL}/sessions`, {
      ...sessionData,
      creator: userEmail
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create session');
    }
    
    return response.data.session;
  },

  // Delete a session
  deleteSession: async ({ sessionId, userEmail }) => {
    const response = await axios.delete(`${API_URL}/sessions/${sessionId}`, {
      data: { userEmail }
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete session');
    }
    
    return response.data;
  },

  // Invite user to session
  inviteUser: async ({ sessionId, inviteeEmail, role, inviterEmail }) => {
    const response = await axios.post(`${API_URL}/sessions/${sessionId}/invite`, {
      email: inviteeEmail,
      role: role,
      inviterEmail: inviterEmail
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to invite user');
    }
    
    return response.data;
  },

  // Leave a session
  leaveSession: async ({ sessionId, userEmail }) => {
    const response = await axios.post(`${API_URL}/sessions/${sessionId}/leave`, {
      email: userEmail
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to leave session');
    }
    
    return response.data;
  },

  // Remove participant from session
  removeParticipant: async ({ sessionId, participantEmail, userEmail }) => {
    const response = await axios.post(`${API_URL}/sessions/${sessionId}/remove-participant`, {
      participantEmail: participantEmail,
      userEmail: userEmail
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove participant');
    }
    
    return response.data;
  },

  // Promote participant to owner
  promoteToOwner: async ({ sessionId, participantEmail, userEmail }) => {
    const response = await axios.post(`${API_URL}/sessions/${sessionId}/promote-owner`, {
      participantEmail: participantEmail,
      userEmail: userEmail
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to promote to owner');
    }
    
    return response.data;
  },

  // Update participant role
  updateRole: async ({ sessionId, participantEmail, newRole, userEmail }) => {
    const response = await axios.post(`${API_URL}/sessions/${sessionId}/update-role`, {
      participantEmail: participantEmail,
      role: newRole,
      userEmail: userEmail
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update role');
    }
    
    return response.data;
  },
};

// Query keys factory for consistent cache management
export const sessionKeys = {
  all: ['sessions'],
  user: (userEmail) => [...sessionKeys.all, 'user', userEmail],
  detail: (sessionId) => [...sessionKeys.all, 'detail', sessionId],
  participants: (sessionId) => [...sessionKeys.all, 'participants', sessionId],
};

/**
 * Hook to fetch all sessions for a user with intelligent caching
 */
export const useSessions = (userEmail) => {
  return useQuery({
    queryKey: sessionKeys.user(userEmail),
    queryFn: () => sessionAPI.getUserSessions(userEmail),
    enabled: !!userEmail, // Only run if userEmail exists
    staleTime: 3 * 60 * 1000, // 3 minutes - sessions change frequently in collaboration
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds for active collaboration
  });
};

/**
 * Hook to create a new session with optimistic updates
 */
export const useCreateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.createSession,
    onMutate: async ({ sessionData, userEmail }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: sessionKeys.user(userEmail) });
      
      // Snapshot previous value
      const previousSessions = queryClient.getQueryData(sessionKeys.user(userEmail));
      
      // Optimistically update with temporary session
      const tempSession = {
        id: `temp-${Date.now()}`,
        sessionId: `temp-${Date.now()}`,
        name: sessionData.name,
        description: sessionData.description,
        creator: userEmail,
        isCreator: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        participants: [{ email: userEmail, role: 'owner' }],
        // Mark as optimistic for UI feedback
        _isOptimistic: true
      };
      
      queryClient.setQueryData(
        sessionKeys.user(userEmail),
        (old) => old ? [...old, tempSession] : [tempSession]
      );
      
      return { previousSessions, tempSession };
    },
    onSuccess: (newSession, { userEmail }, context) => {
      // Remove optimistic update and add real session
      queryClient.setQueryData(
        sessionKeys.user(userEmail),
        (old) => {
          if (!old) return [newSession];
          // Remove temp session and add real one
          const withoutTemp = old.filter(session => session.id !== context.tempSession.id);
          return [...withoutTemp, newSession];
        }
      );
    },
    onError: (error, { userEmail }, context) => {
      // Restore previous state on error
      if (context?.previousSessions) {
        queryClient.setQueryData(sessionKeys.user(userEmail), context.previousSessions);
      }
    },
    onSettled: (data, error, { userEmail }) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(userEmail) });
    }
  });
};

/**
 * Hook to delete a session with optimistic updates
 */
export const useDeleteSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.deleteSession,
    onMutate: async ({ sessionId, userEmail }) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.user(userEmail) });
      
      const previousSessions = queryClient.getQueryData(sessionKeys.user(userEmail));
      
      // Optimistically remove session
      queryClient.setQueryData(
        sessionKeys.user(userEmail),
        (old) => old?.filter(session => 
          session.sessionId !== sessionId && session.id !== sessionId
        ) || []
      );
      
      return { previousSessions, sessionId };
    },
    onError: (error, { userEmail }, context) => {
      // Restore previous state on error
      if (context?.previousSessions) {
        queryClient.setQueryData(sessionKeys.user(userEmail), context.previousSessions);
      }
    },
    onSettled: (data, error, { userEmail }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(userEmail) });
    }
  });
};

/**
 * Hook to invite user to session
 */
export const useInviteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.inviteUser,
    onSuccess: (data, { sessionId, inviterEmail }) => {
      // Invalidate sessions for the inviter to show updated participant list
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(inviterEmail) });
      // Invalidate session details if cached
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    }
  });
};

/**
 * Hook to leave a session
 */
export const useLeaveSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.leaveSession,
    onMutate: async ({ sessionId, userEmail }) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.user(userEmail) });
      
      const previousSessions = queryClient.getQueryData(sessionKeys.user(userEmail));
      
      // Optimistically remove session from user's list
      queryClient.setQueryData(
        sessionKeys.user(userEmail),
        (old) => old?.filter(session => 
          session.sessionId !== sessionId && session.id !== sessionId
        ) || []
      );
      
      return { previousSessions };
    },
    onError: (error, { userEmail }, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(sessionKeys.user(userEmail), context.previousSessions);
      }
    },
    onSettled: (data, error, { userEmail }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(userEmail) });
    }
  });
};

/**
 * Hook to remove participant from session
 */
export const useRemoveParticipant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.removeParticipant,
    onSuccess: (data, { sessionId, userEmail }) => {
      // Invalidate sessions to show updated participant list
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(userEmail) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    }
  });
};

/**
 * Hook to promote participant to owner
 */
export const usePromoteToOwner = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.promoteToOwner,
    onSuccess: (data, { sessionId, userEmail }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(userEmail) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    }
  });
};

/**
 * Hook to update participant role
 */
export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.updateRole,
    onSuccess: (data, { sessionId, userEmail }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(userEmail) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    }
  });
};

/**
 * Utility hook for session-related actions
 */
export const useSessionActions = (userEmail) => {
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();
  const inviteUser = useInviteUser();
  const leaveSession = useLeaveSession();
  const removeParticipant = useRemoveParticipant();
  const promoteToOwner = usePromoteToOwner();
  const updateRole = useUpdateRole();
  
  // Wrapped action functions with consistent error handling
  const actions = {
    createSession: useCallback(async (sessionData) => {
      try {
        const result = await createSession.mutateAsync({ sessionData, userEmail });
        return { success: true, session: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [createSession, userEmail]),
    
    deleteSession: useCallback(async (sessionId) => {
      try {
        await deleteSession.mutateAsync({ sessionId, userEmail });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [deleteSession, userEmail]),
    
    inviteUser: useCallback(async (sessionId, inviteeEmail, role = 'editor') => {
      try {
        await inviteUser.mutateAsync({ 
          sessionId, 
          inviteeEmail, 
          role, 
          inviterEmail: userEmail 
        });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [inviteUser, userEmail]),
    
    leaveSession: useCallback(async (sessionId) => {
      try {
        await leaveSession.mutateAsync({ sessionId, userEmail });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [leaveSession, userEmail]),

    removeParticipant: useCallback(async (sessionId, participantEmail) => {
      try {
        await removeParticipant.mutateAsync({ sessionId, participantEmail, userEmail });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [removeParticipant, userEmail]),

    promoteToOwner: useCallback(async (sessionId, participantEmail) => {
      try {
        await promoteToOwner.mutateAsync({ sessionId, participantEmail, userEmail });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [promoteToOwner, userEmail]),

    updateRole: useCallback(async (sessionId, participantEmail, newRole) => {
      try {
        await updateRole.mutateAsync({ sessionId, participantEmail, newRole, userEmail });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [updateRole, userEmail])
  };
  
  return {
    ...actions,
    // Loading states for UI feedback
    isCreating: createSession.isPending,
    isDeleting: deleteSession.isPending,
    isInviting: inviteUser.isPending,
    isLeaving: leaveSession.isPending,
    isRemovingParticipant: removeParticipant.isPending,
    isPromoting: promoteToOwner.isPending,
    isUpdatingRole: updateRole.isPending,
    // Error states
    createError: createSession.error,
    deleteError: deleteSession.error,
    inviteError: inviteUser.error,
    leaveError: leaveSession.error,
    removeParticipantError: removeParticipant.error,
    promoteError: promoteToOwner.error,
    updateRoleError: updateRole.error,
  };
};