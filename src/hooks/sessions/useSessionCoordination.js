/**
 * Coordinated Session Hooks
 * Advanced hooks for synchronized data fetching and complex operations
 */

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionAPI, sessionKeys } from '../../services/sessionAPI';
import { useUser } from '../../contexts/UserContext';

/**
 * Coordinated hook that synchronizes sessions and pending invitations
 * This ensures both queries refresh at the same time to avoid timing discrepancies
 * Uses a shared interval timer for perfect synchronization
 */
export const useSessionsWithInvitations = () => {
  const { userEmail } = useUser();
  const queryClient = useQueryClient();
  
  // Define shared query options for consistent behavior
  const sharedQueryOptions = {
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    // Disable individual intervals - we'll use a coordinated approach
    refetchInterval: false,
  };
  
  const sessionsQuery = useQuery({
    queryKey: sessionKeys.user(userEmail),
    queryFn: () => sessionAPI.getUserSessions(),
    enabled: !!userEmail,
    gcTime: 10 * 60 * 1000,
    ...sharedQueryOptions,
  });
  
  const invitationsQuery = useQuery({
    queryKey: ['pendingInvitations', userEmail],
    queryFn: () => sessionAPI.getPendingInvitations(userEmail),
    enabled: !!userEmail,
    structuralSharing: true,
    ...sharedQueryOptions,
  });
  
  // Coordinated refresh function
  const refreshBoth = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(userEmail) }),
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations', userEmail] })
    ]);
  }, [queryClient, userEmail]);
  
  // Set up synchronized 30-second interval using useEffect for proper cleanup
  useEffect(() => {
    if (!userEmail) return;
    
    const intervalId = setInterval(() => {
      // Only refresh if queries are enabled and user is present
      if (userEmail && !document.hidden) {
        refreshBoth();
      }
    }, 30 * 1000);
    
    return () => clearInterval(intervalId);
  }, [userEmail, refreshBoth]);
  
  return {
    sessions: sessionsQuery,
    invitations: invitationsQuery,
    refreshBoth,
    // Combined loading states
    isRefreshing: sessionsQuery.isFetching || invitationsQuery.isFetching,
    isInitialLoading: sessionsQuery.isLoading || invitationsQuery.isLoading,
  };
};
