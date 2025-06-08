import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import PropTypes from 'prop-types';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';

// Create a client with optimized settings for CodeLab
// Following TanStack Query v5 best practices
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: How long data stays fresh (5 minutes for sessions)
      staleTime: 5 * 60 * 1000,
      // Cache time: How long data stays in cache when no observers (10 minutes)
      // Note: renamed from cacheTime to gcTime in v5
      gcTime: 10 * 60 * 1000,
      // Retry configuration for network resilience
      retry: (failureCount, error) => {
        // Don't retry on 401/403 (auth issues)
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      // Default behavior for throwOnError (replaces useErrorBoundary in v5)
      throwOnError: false,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time collaboration
      refetchOnWindowFocus: true,
      // Refetch on reconnect for offline support
      refetchOnReconnect: true,
      // Background refetch interval for active sessions (30 seconds)
      refetchInterval: (query) => {
        // Guard against undefined query parameter
        if (!query || !query.queryKey || !Array.isArray(query.queryKey)) {
          return false;
        }
        
        // Only auto-refetch for sessions that are marked as active
        if (query.queryKey[0] === 'sessions' && query.state.data?.some?.(session => session.status === 'active')) {
          return 30 * 1000; // 30 seconds
        }
        return false; // No auto-refetch for other queries
      },
      // Optimized structural sharing for better performance with deep objects
      structuralSharing: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

// Enhanced error handling with specific mutation keys
queryClient.setMutationDefaults(['createSession'], {
  onError: (error) => {
    console.error('Session creation failed:', error);
    // Could integrate with toast system here
  },
});

queryClient.setMutationDefaults(['deleteSession'], {
  onError: (error) => {
    console.error('Session deletion failed:', error);
  },
});

queryClient.setMutationDefaults(['inviteUser'], {
  onError: (error) => {
    console.error('User invitation failed:', error);
  },
});

// Enhanced authentication mutation defaults
queryClient.setMutationDefaults(['enhancedAuth', 'register'], {
  onError: (error) => {
    console.error('Enhanced registration failed:', error);
  },
});

queryClient.setMutationDefaults(['enhancedAuth', 'login'], {
  onError: (error) => {
    console.error('Enhanced login failed:', error);
  },
});

queryClient.setMutationDefaults(['enhancedAuth', 'updateProfile'], {
  onError: (error) => {
    console.error('Profile update failed:', error);
  },
});

// Global error boundary for queries
queryClient.setQueryDefaults(['sessions'], {
  onError: (error) => {
    console.error('Session fetch failed:', error);
    // Could integrate with global error handling here
  },
});

// Enhanced auth query defaults
queryClient.setQueryDefaults(['enhancedAuth'], {
  onError: (error) => {
    console.error('Enhanced auth operation failed:', error);
  },
});

// Set up query defaults for session details - may have different staleness needs
queryClient.setQueryDefaults(['sessions', 'detail'], {
  // Session details need fresher data for real-time collaboration
  staleTime: 2 * 60 * 1000, // 2 minutes instead of 5
  // More frequent refetching in the background for active sessions
  refetchInterval: (query) => {
    if (query.state.data?.status === 'active') {
      return 15 * 1000; // 15 seconds for active sessions
    }
    return false;
  }
});

// Set up query defaults for file management
queryClient.setQueryDefaults(['files'], {
  // File lists should refetch when window is focused
  refetchOnWindowFocus: true,
  onError: (error) => {
    console.error('File operation failed:', error);
  },
});

const QueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserProvider>
          {children}
        </UserProvider>
      </AuthProvider>
      {/* Show devtools only in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
          toggleButtonProps={{
            style: {
              marginLeft: '5px',
              transform: 'scale(0.8)',
              transformOrigin: 'bottom right',
            },
          }}
        />
      )}
    </QueryClientProvider>
  );
};

QueryProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default QueryProvider;
