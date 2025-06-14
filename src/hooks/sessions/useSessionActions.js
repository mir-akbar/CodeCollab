/**
 * Session Actions Hook
 * High-level hook that combines all session operations with error handling
 */

import { useCallback } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useCreateSession, useDeleteSession } from './useSessionMutations';
import { useInviteUser, useRemoveParticipant, useUpdateRole, useTransferOwnership } from './useParticipantMutations';
import { useJoinSession, useLeaveSession, useRejectInvitation } from './useMembershipMutations';

/**
 * Utility hook for session-related actions with UserContext integration
 */
export const useSessionActions = () => {
  const { userEmail } = useUser();
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();
  const inviteUser = useInviteUser();
  const leaveSession = useLeaveSession();
  const joinSession = useJoinSession();
  const rejectInvitation = useRejectInvitation();
  const removeParticipant = useRemoveParticipant();
  const transferOwnership = useTransferOwnership();
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
    
    inviteUser: useCallback(async (sessionId, inviteeEmail, role = 'viewer') => {
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

    joinSession: useCallback(async (sessionId) => {
      try {
        await joinSession.mutateAsync({ sessionId, userEmail });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [joinSession, userEmail]),

    rejectInvitation: useCallback(async (sessionId) => {
      try {
        await rejectInvitation.mutateAsync({ sessionId, userEmail });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [rejectInvitation, userEmail]),

    removeParticipant: useCallback(async (sessionId, participantEmail) => {
      try {
        await removeParticipant.mutateAsync({ sessionId, participantEmail, userEmail });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [removeParticipant, userEmail]),

    transferOwnership: useCallback(async (sessionId, newOwnerEmail) => {
      try {
        await transferOwnership.mutateAsync({ sessionId, newOwnerEmail, userEmail });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [transferOwnership, userEmail]),

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
    isJoining: joinSession.isPending,
    isRejectingInvitation: rejectInvitation.isPending,
    isRemovingParticipant: removeParticipant.isPending,
    isTransferringOwnership: transferOwnership.isPending,
    isUpdatingRole: updateRole.isPending,
    // Error states
    createError: createSession.error,
    deleteError: deleteSession.error,
    inviteError: inviteUser.error,
    leaveError: leaveSession.error,
    joinError: joinSession.error,
    rejectInvitationError: rejectInvitation.error,
    removeParticipantError: removeParticipant.error,
    transferOwnershipError: transferOwnership.error,
    updateRoleError: updateRole.error,
  };
};
