/**
 * Core Session Query Hooks
 * Basic hooks for fetching session data
 */

import { useQuery } from '@tanstack/react-query';
import { sessionAPI, sessionKeys } from '../../services/sessionAPI';
import { useUser } from '../../contexts/UserContext';

/**
 * Hook to fetch all sessions for a user with intelligent caching
 */
export const useSessions = () => {
  const { userEmail } = useUser();
  
  return useQuery({
    queryKey: sessionKeys.user(userEmail),
    queryFn: () => sessionAPI.getUserSessions(),
    enabled: !!userEmail,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
  });
};

/**
 * Hook to fetch single session details with real-time updates
 */
export const useSessionDetails = (sessionId) => {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: () => sessionAPI.getSessionDetails(sessionId),
    enabled: !!sessionId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    refetchOnWindowFocus: true,
    refetchInterval: 15 * 1000, // Auto-refetch every 15 seconds
  });
};

/**
 * Hook to fetch participants for a specific session
 */
export const useSessionParticipants = (sessionId, options = {}) => {
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: sessionKeys.participants(sessionId),
    queryFn: () => sessionAPI.getSessionParticipants(sessionId),
    enabled: !!sessionId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
};

/**
 * Hook to get user's pending invitations
 */
export const usePendingInvitations = (userEmail) => {
  return useQuery({
    queryKey: ['pendingInvitations', userEmail],
    queryFn: () => sessionAPI.getPendingInvitations(userEmail),
    enabled: !!userEmail,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    structuralSharing: true,
  });
};
