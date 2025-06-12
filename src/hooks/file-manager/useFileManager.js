/**
 * TanStack Query hooks for File Management
 * Provides reactive state management for file operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fileApiService } from '@/services/file-manager/fileApi';
import { toast } from 'sonner';

// Query keys for consistent cache management
export const fileQueryKeys = {
  all: ['files'],
  sessions: () => [...fileQueryKeys.all, 'sessions'],
  session: (sessionId) => [...fileQueryKeys.sessions(), sessionId],
  hierarchy: (sessionId) => [...fileQueryKeys.session(sessionId), 'hierarchy'],
  content: (sessionId, filePath) => [...fileQueryKeys.session(sessionId), 'content', filePath],
  stats: (sessionId) => [...fileQueryKeys.session(sessionId), 'stats'],
};

/**
 * Hook to fetch session files
 */
export function useSessionFiles(sessionId) {
  return useQuery({
    queryKey: fileQueryKeys.session(sessionId),
    queryFn: () => fileApiService.getSessionFiles(sessionId),
    enabled: !!sessionId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch file hierarchy
 */
export function useFileHierarchy(sessionId) {
  return useQuery({
    queryKey: fileQueryKeys.hierarchy(sessionId),
    queryFn: () => fileApiService.getFileHierarchy(sessionId),
    enabled: !!sessionId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch file content
 */
export function useFileContent(sessionId, filePath) {
  return useQuery({
    queryKey: fileQueryKeys.content(sessionId, filePath),
    queryFn: () => fileApiService.getFileContent(filePath, sessionId),
    enabled: !!(sessionId && filePath),
    staleTime: 30000, // 30 seconds - reduced from 1 minute for faster updates
    gcTime: 1000 * 60 * 5, // 5 minutes cache time
    retry: 2, // Reduced retries for faster failure detection
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch storage statistics
 */
export function useStorageStats(sessionId) {
  return useQuery({
    queryKey: fileQueryKeys.stats(sessionId),
    queryFn: () => fileApiService.getStorageStats(sessionId),
    enabled: !!sessionId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to upload files
 */
export function useFileUpload(sessionId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, userEmail, onProgress }) => 
      fileApiService.uploadFile(file, sessionId, userEmail, onProgress),
    
    onSuccess: (data) => {
      // Invalidate related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.hierarchy(sessionId) });
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.stats(sessionId) });
      
      // Show success message
      const fileCount = data.files?.length || 1;
      const message = data.message || `${fileCount} file(s) uploaded successfully`;
      toast.success(message);
    },
    
    onError: (error) => {
      console.error('File upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    },
  });
}

/**
 * Hook to delete files
 */
export function useFileDelete(sessionId, userEmail = null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ filePath }) => 
      fileApiService.deleteFile(filePath, sessionId, userEmail),
    
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.hierarchy(sessionId) });
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.stats(sessionId) });
      
      toast.success(data.message || 'File deleted successfully');
    },
    
    onError: (error) => {
      console.error('File delete error:', error);
      toast.error(error.message || 'Failed to delete file');
    },
  });
}

/**
 * Hook to refresh file data
 */
export function useRefreshFiles(sessionId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Invalidate and refetch all file-related queries
      await queryClient.invalidateQueries({ queryKey: fileQueryKeys.session(sessionId) });
      await queryClient.invalidateQueries({ queryKey: fileQueryKeys.hierarchy(sessionId) });
      await queryClient.invalidateQueries({ queryKey: fileQueryKeys.stats(sessionId) });
      return true;
    },
    
    onSuccess: () => {
      toast.success('Files refreshed');
    },
    
    onError: (error) => {
      console.error('Refresh error:', error);
      toast.error('Failed to refresh files');
    },
  });
}

/**
 * Hook that combines multiple file operations for convenience
 */
export function useFileManager(sessionId, userEmail = null) {
  const sessionFiles = useSessionFiles(sessionId);
  const fileHierarchy = useFileHierarchy(sessionId);
  const storageStats = useStorageStats(sessionId);
  const uploadFile = useFileUpload(sessionId);
  const deleteFile = useFileDelete(sessionId, userEmail);
  const refreshFiles = useRefreshFiles(sessionId);

  return {
    // Data
    files: sessionFiles.data || [],
    hierarchy: fileHierarchy.data || [],
    stats: storageStats.data || { totalFiles: 0, totalSize: 0 },
    
    // Loading states
    isLoading: sessionFiles.isLoading || fileHierarchy.isLoading,
    isRefreshing: sessionFiles.isFetching || fileHierarchy.isFetching,
    
    // Error states
    error: sessionFiles.error || fileHierarchy.error,
    
    // Mutations
    uploadFile: uploadFile.mutate,
    deleteFile: deleteFile.mutate,
    refreshFiles: refreshFiles.mutate,
    
    // Mutation states
    isUploading: uploadFile.isPending,
    isDeleting: deleteFile.isPending,
    uploadError: uploadFile.error,
    deleteError: deleteFile.error,
  };
}
