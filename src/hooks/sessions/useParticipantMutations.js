/**
 * Participant Management Hooks
 * Hooks for managing session participants - invite, remove, update roles
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionAPI, sessionKeys } from '../../services/sessionAPI';

/**
 * Hook to invite user to session
 */
export const useInviteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.inviteUser,
    onSuccess: (data, { sessionId, inviterEmail }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(inviterEmail) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.participants(sessionId) });
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
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(userEmail) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.participants(sessionId) });
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
      queryClient.invalidateQueries({ queryKey: sessionKeys.participants(sessionId) });
    }
  });
};

/**
 * Hook to transfer ownership of session
 */
export const useTransferOwnership = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.transferOwnership,
    onSuccess: (data, { sessionId, userEmail }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(userEmail) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.participants(sessionId) });
    }
  });
};
