/**
 * User Profile Hook using TanStack Query
 * Provides cached, reactive user profile data
 */

import { useQuery } from '@tanstack/react-query';
import { API_URL } from '@/config/environment.js';
import { useUser } from '@/contexts/UserContext';

// Query keys for consistent cache management
export const userQueryKeys = {
  all: ['user'],
  profile: () => [...userQueryKeys.all, 'profile'],
};

/**
 * Hook to fetch user profile with TanStack Query
 * @returns {Object} Query result with user profile data
 */
export const useUserProfile = () => {
  const { userEmail } = useUser();

  return useQuery({
    queryKey: userQueryKeys.profile(),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch user profile');
      }

      return data.user;
    },
    enabled: !!userEmail, // Only run query if user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus for profile data
  });
};

/**
 * Derived hook that provides formatted user data for UI components
 * @returns {Object} Formatted user data with fallbacks
 */
export const useFormattedUserData = () => {
  const { userEmail } = useUser();
  const { data: userProfile, isLoading, error } = useUserProfile();

  // Create formatted user data with smart fallbacks
  // The API returns user data directly, not nested under 'profile'
  const userData = {
    name: userProfile?.name || userEmail?.split('@')[0] || "User",
    displayName: userProfile?.displayName || "",
    username: userProfile?.username || "",
    email: userProfile?.email || userEmail || "",
    status: userProfile?.status || "active",
    isLoading,
    error,
  };

  return userData;
};
