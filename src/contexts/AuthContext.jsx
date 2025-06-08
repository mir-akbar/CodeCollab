/**
 * Modern Authentication Provider using TanStack Query
 * Secure authentication with httpOnly cookies + memory storage
 */

import { createContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { apiClient, setTokens, clearTokens, hasValidToken } from '../services/apiClient';
import { 
  getCurrentCognitoUser,
  signupWithCognito,
  loginWithCognito,
  confirmRegistrationWithCognito,
  logoutFromCognito,
  resendVerificationCode
} from '../services/authService';

// Auth Context
const AuthContext = createContext(null);
// Simplified function to get current user
async function getCurrentUser() {
  try {
    // First check if we have valid tokens in memory
    if (!hasValidToken()) {
      // Try to refresh from httpOnly cookie
      try {
        const refreshResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        
        if (!refreshResponse.ok) {
          console.log('No valid session found - user needs to login');
          return null;
        }
        
        const { accessToken, expiresIn } = await refreshResponse.json();
        setTokens(accessToken, expiresIn);
      } catch (error) {
        console.log('Refresh failed:', error);
        return null;
      }
    }

    // Get current user from Cognito
    const cognitoUser = await getCurrentCognitoUser();
    return cognitoUser; // Return Cognito user directly for now
    
  } catch (error) {
    console.log('Auth check failed:', error);
    return null;
  }
}

// Auth Provider Component
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  // Query to check current authentication status
  const { data: user, isLoading: isCheckingAuth, error } = useQuery({
    queryKey: ['auth', 'currentUser'],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 0, // Always consider data stale so it refetches when needed
    cacheTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

  // Signup Mutation
  const signupMutation = useMutation({
    mutationFn: async ({ name, email, password, username }) => {
      // Sign up with Cognito
      const result = await signupWithCognito({ name, email, password, username });
      console.log('=== AUTH CONTEXT SIGNUP RESULT ===');
      console.log('signupWithCognito result:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password, username }) => {
      console.log('Starting login process...');
      
      // Login with Cognito - supports both email and username
      const result = await loginWithCognito({ email, password, username });
      
      console.log('Cognito login successful, storing tokens...');
      
      // Store tokens securely (memory + backend httpOnly cookies)
      setTokens(result.tokens.accessToken, result.tokens.expiresIn);
      
      // Send tokens to backend for secure storage in httpOnly cookies
      await apiClient.post('/api/auth/store-tokens', {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        idToken: result.tokens.idToken,
        expiresIn: result.tokens.expiresIn
      });
      
      console.log('Login complete!');
      return result;
    },
    onSuccess: async () => {
      console.log('Login mutation onSuccess triggered, refetching auth state...');
      
      // Invalidate and refetch auth queries, waiting for completion
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      await queryClient.refetchQueries({ queryKey: ['auth', 'currentUser'] });
      
      console.log('Auth state updated successfully');
    },
  });

  // Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Logout from Cognito
      await logoutFromCognito();
      
      // Clear tokens from backend (httpOnly cookies)
      try {
        await apiClient.post('/api/auth/logout');
      } catch (error) {
        console.warn('Backend logout failed:', error);
      }
    },
    onSuccess: () => {
      // Clear memory tokens
      clearTokens();
      
      // Clear all query cache
      queryClient.clear();
    },
  });

  // Confirm Registration Mutation
  const confirmMutation = useMutation({
    mutationFn: confirmRegistrationWithCognito,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  // Resend Verification Code Mutation
  const resendCodeMutation = useMutation({
    mutationFn: resendVerificationCode,
  });

  const value = {
    // User state
    user,
    isAuthenticated: !!user && !error,
    isLoading: isCheckingAuth,
    
    // Auth actions
    signup: signupMutation.mutateAsync,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    confirmRegistration: confirmMutation.mutateAsync,
    resendVerificationCode: resendCodeMutation.mutateAsync,
    
    // Mutation states
    isSigningUp: signupMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isConfirming: confirmMutation.isPending,
    isResendingCode: resendCodeMutation.isPending,
    
    // Errors
    signupError: signupMutation.error,
    loginError: loginMutation.error,
    confirmError: confirmMutation.error,
    resendCodeError: resendCodeMutation.error,
  };

  // Debug auth state changes
  console.log('AuthContext state:', { 
    hasUser: !!user, 
    isAuthenticated: !!user && !error, 
    isLoading: isCheckingAuth, 
    error: error?.message,
    userEmail: user?.email 
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { AuthContext };
