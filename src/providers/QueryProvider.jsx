import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import PropTypes from 'prop-types';

// Create a client with optimized settings for CodeLab
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: How long data stays fresh (5 minutes for sessions)
      staleTime: 5 * 60 * 1000,
      // Cache time: How long data stays in cache when no observers (10 minutes)
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
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time collaboration
      refetchOnWindowFocus: true,
      // Refetch on reconnect for offline support
      refetchOnReconnect: true,
      // Background refetch interval for active sessions (30 seconds)
      refetchInterval: (data, query) => {
        // Guard against undefined query parameter
        if (!query || !query.queryKey || !Array.isArray(query.queryKey)) {
          return false;
        }
        
        // Only auto-refetch for sessions that are marked as active
        if (query.queryKey[0] === 'sessions' && data?.some?.(session => session.status === 'active')) {
          return 30 * 1000; // 30 seconds
        }
        return false; // No auto-refetch for other queries
      },
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      // Show loading states for at least 200ms to prevent flashing
      networkMode: 'online',
    },
  },
});

// Enhanced error handling
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

// Global error boundary for queries
queryClient.setQueryDefaults(['sessions'], {
  onError: (error) => {
    console.error('Session fetch failed:', error);
    // Could integrate with global error handling here
  },
});

const QueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show devtools only in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
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
