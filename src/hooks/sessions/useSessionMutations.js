/**
 * Session Mutation Hooks
 * Hooks for creating, updating, and deleting sessions
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionAPI, sessionKeys } from '../../services/sessionAPI';

/**
 * Hook to create a new session with optimistic updates
 */
export const useCreateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.createSession,
    onMutate: async ({ sessionData, userEmail }) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.user(userEmail) });
      
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
        _isOptimistic: true
      };
      
      queryClient.setQueryData(
        sessionKeys.user(userEmail),
        (old) => old ? [...old, tempSession] : [tempSession]
      );
      
      return { previousSessions, tempSession };
    },
    onSuccess: (newSession, { userEmail }, context) => {
      queryClient.setQueryData(
        sessionKeys.user(userEmail),
        (old) => {
          if (!old) return [newSession];
          const withoutTemp = old.filter(session => session.id !== context.tempSession.id);
          return [...withoutTemp, newSession];
        }
      );
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
 * Hook to delete a session with optimistic updates
 */
export const useDeleteSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.deleteSession,
    onMutate: async ({ sessionId, userEmail }) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.user(userEmail) });
      
      const previousSessions = queryClient.getQueryData(sessionKeys.user(userEmail));
      
      queryClient.setQueryData(
        sessionKeys.user(userEmail),
        (old) => old?.filter(session => 
          session.sessionId !== sessionId && session.id !== sessionId
        ) || []
      );
      
      return { previousSessions, sessionId };
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
