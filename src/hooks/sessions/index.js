/**
 * Session Hooks Index
 * Re-exports all session-related hooks for easy importing
 */

// Query hooks
export {
  useSessions,
  useSessionDetails,
  useSessionParticipants,
  usePendingInvitations
} from './useSessionQueries';

// Session mutation hooks
export {
  useCreateSession,
  useDeleteSession
} from './useSessionMutations';

// Participant management hooks
export {
  useInviteUser,
  useRemoveParticipant,
  useUpdateRole,
  useTransferOwnership
} from './useParticipantMutations';

// Membership hooks
export {
  useJoinSession,
  useLeaveSession,
  useRejectInvitation
} from './useMembershipMutations';

// High-level action hooks
export { useSessionActions } from './useSessionActions';

// Coordination hooks
export { useSessionsWithInvitations } from './useSessionCoordination';

// For backward compatibility, export the main action hook as default
export { useSessionActions as default } from './useSessionActions';
