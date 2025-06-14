/**
 * Membership Management Hooks
 * Hooks for joining, leaving, and invitation management
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionAPI, sessionKeys } from '../../services/sessionAPI';

/**
 * Hook to join a session (accept invitation)
 */
export const useJoinSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.joinSession,
    onSuccess: (data, { sessionId, userEmail }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(userEmail) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations', userEmail] });
      queryClient.invalidateQueries({ queryKey: sessionKeys.participants(sessionId) });
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
 * Hook to reject/decline a session invitation
 */
export const useRejectInvitation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.rejectInvitation,
    onSuccess: (data, { userEmail }) => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations', userEmail] });
    }
  });
};
