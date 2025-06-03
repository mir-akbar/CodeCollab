import { QueryClient } from '@tanstack/react-query';

// Create and export the query client for direct access in components
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: (data, query) => {
        if (query.queryKey[0] === 'sessions' && data?.some(session => session.status === 'active')) {
          return 30 * 1000;
        }
        return false;
      },
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});
