/**
 * Simplified File Queries using TanStack Query directly
 * This replaces the complex fileApi service layer with direct query implementations
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
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

// ===== QUERY HOOKS =====

/**
 * Hook to fetch session files
 */
export function useSessionFiles(sessionId) {
  return useQuery({
    queryKey: fileQueryKeys.session(sessionId),
    queryFn: async () => {
      const response = await apiClient.get(`/api/files/session/${encodeURIComponent(sessionId)}`);
      return response.data.files || response.data;
    },
    enabled: !!sessionId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch file hierarchy with smart prefetching
 */
export function useFileHierarchy(sessionId) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: fileQueryKeys.hierarchy(sessionId),
    queryFn: async () => {
      const response = await apiClient.get(`/api/files/hierarchy/${encodeURIComponent(sessionId)}`);
      return response.data;
    },
    enabled: !!sessionId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Auto-prefetch all file contents when hierarchy loads
  React.useEffect(() => {
    if (query.data && sessionId) {
      const prefetchFiles = (items) => {
        items.forEach(item => {
          if (item.type === 'file') {
            // Prefetch file content
            queryClient.prefetchQuery({
              queryKey: fileQueryKeys.content(sessionId, item.path),
              queryFn: async () => {
                const response = await apiClient.get(
                  `/api/files/content?path=${encodeURIComponent(item.path)}&sessionId=${encodeURIComponent(sessionId)}`,
                  { responseType: 'text' }
                );
                return response.data;
              },
              staleTime: 10 * 60 * 1000,
            });
          } else if (item.children) {
            prefetchFiles(item.children);
          }
        });
      };
      
      // Prefetch all files in background
      setTimeout(() => prefetchFiles(query.data), 100);
    }
  }, [query.data, sessionId, queryClient]);

  return query;
}

/**
 * Hook to fetch file content - simplified version
 */
export function useFileContent(sessionId, filePath) {
  return useQuery({
    queryKey: fileQueryKeys.content(sessionId, filePath),
    queryFn: async () => {
      console.log(`📥 [FRONTEND FETCH] Fetching file content:`, {
        filePath,
        sessionId,
        timestamp: new Date().toISOString()
      });

      const response = await apiClient.get(
        `/api/files/content?path=${encodeURIComponent(filePath)}&sessionId=${encodeURIComponent(sessionId)}`,
        { responseType: 'text' }
      );

      console.log(`✅ [FRONTEND FETCH] File content received:`, {
        filePath,
        contentLength: response.data?.length || 0,
        status: response.status
      });

      return response.data;
    },
    enabled: !!(sessionId && filePath),
    staleTime: 5 * 60 * 1000, // 5 minutes - shorter cache
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory shorter
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: '', // Show empty string immediately while loading
  });
}

/**
 * Hook to fetch storage statistics
 */
export function useStorageStats(sessionId) {
  return useQuery({
    queryKey: fileQueryKeys.stats(sessionId),
    queryFn: async () => {
      const response = await apiClient.get(`/api/files/stats/${encodeURIComponent(sessionId)}`);
      return response.data;
    },
    enabled: !!sessionId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

// ===== MUTATION HOOKS =====

/**
 * Hook to upload files
 */
export function useFileUpload(sessionId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, userEmail, onProgress }) => {
      console.log(`📤 [FRONTEND UPLOAD] Starting file upload:`, {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)}KB`,
        fileType: file.type,
        sessionId,
        userEmail,
        timestamp: new Date().toISOString()
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionID', sessionId);
      formData.append('email', userEmail);

      console.log(`📤 [FRONTEND UPLOAD] Sending POST request to /api/files/upload`);

      const response = await apiClient.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`📤 [FRONTEND UPLOAD] Progress: ${percentCompleted}% (${progressEvent.loaded}/${progressEvent.total} bytes)`);
            onProgress(percentCompleted);
          }
        },
      });

      console.log(`✅ [FRONTEND UPLOAD] Upload response received:`, {
        status: response.status,
        success: response.data?.success,
        fileCount: response.data?.files?.length || (response.data?.file ? 1 : 0),
        collaborationReady: response.data?.collaborationReady
      });

      return response.data;
    },
    
    onSuccess: (data) => {
      console.log(`✅ [FRONTEND UPLOAD] Upload successful:`, {
        files: data.files?.length || (data.file ? 1 : 0),
        message: data.message,
        collaborationReady: data.collaborationReady,
        roomId: data.roomId
      });

      // Invalidate related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.hierarchy(sessionId) });
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.stats(sessionId) });
      
      // IMPORTANT: Invalidate content cache for newly uploaded files
      if (data.files && Array.isArray(data.files)) {
        // Multiple files (ZIP upload)
        data.files.forEach(file => {
          if (file.path) {
            console.log(`🧹 [FRONTEND UPLOAD] Invalidating content cache for: ${file.path}`);
            queryClient.invalidateQueries({ 
              queryKey: fileQueryKeys.content(sessionId, file.path) 
            });
          }
        });
      } else if (data.file && data.file.path) {
        // Single file upload
        console.log(`🧹 [FRONTEND UPLOAD] Invalidating content cache for: ${data.file.path}`);
        queryClient.invalidateQueries({ 
          queryKey: fileQueryKeys.content(sessionId, data.file.path) 
        });
      }
      
      // Show success message
      const fileCount = data.files?.length || 1;
      const message = data.message || `${fileCount} file(s) uploaded successfully`;
      toast.success(message);
    },
    
    onError: (error) => {
      console.error(`❌ [FRONTEND UPLOAD] Upload failed:`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        sessionId
      });
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
    mutationFn: async ({ filePath }) => {
      console.log('🗑️ Starting file deletion process for:', filePath);
      
      try {
        // First disconnect any active collaboration for this file to prevent Y-WebSocket errors
        const { codeCollaborationService } = await import('@/services/code-editor/codeCollaborationService');
        console.log('🔌 Disconnecting collaboration service for:', filePath);
        codeCollaborationService.disconnect(sessionId, filePath);
        
        // Wait a brief moment for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn('⚠️ Error disconnecting collaboration before delete:', error);
      }

      console.log('🌐 Making delete API request for:', filePath);
      const response = await apiClient.delete(
        `/api/files/${encodeURIComponent(sessionId)}/${encodeURIComponent(filePath)}`,
        { data: { userEmail } }
      );
      
      console.log('✅ Delete API request completed for:', filePath);
      return { ...response.data, deletedFilePath: filePath };
    },
    
    onMutate: async ({ filePath }) => {
      console.log('🚀 Starting optimistic update for file deletion:', filePath);
      
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: fileQueryKeys.session(sessionId) });
      await queryClient.cancelQueries({ queryKey: fileQueryKeys.hierarchy(sessionId) });
      
      // Snapshot the previous values for rollback
      const previousSessionFiles = queryClient.getQueryData(fileQueryKeys.session(sessionId));
      const previousHierarchy = queryClient.getQueryData(fileQueryKeys.hierarchy(sessionId));
      
      return { previousSessionFiles, previousHierarchy, deletedFilePath: filePath };
    },
    
    onSuccess: (data, variables, context) => {
      console.log('🎉 File deletion successful:', data.deletedFilePath);
      
      // Clean up file content cache
      if (data.deletedFilePath) {
        queryClient.removeQueries({ 
          queryKey: fileQueryKeys.content(sessionId, data.deletedFilePath) 
        });
      }
      
      // Invalidate related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.hierarchy(sessionId) });
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.stats(sessionId) });
      
      toast.success(data.message || 'File deleted successfully');
    },
    
    onError: (error, variables, context) => {
      console.error('❌ File delete error:', error);
      
      // Rollback optimistic updates on error
      if (context?.previousSessionFiles) {
        queryClient.setQueryData(fileQueryKeys.session(sessionId), context.previousSessionFiles);
      }
      if (context?.previousHierarchy) {
        queryClient.setQueryData(fileQueryKeys.hierarchy(sessionId), context.previousHierarchy);
      }
      
      toast.error(error.message || 'Failed to delete file');
    },
    
    onSettled: (data, error, variables, context) => {
      console.log('🏁 File deletion operation settled for:', variables.filePath);
      
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.hierarchy(sessionId) });
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

// ===== CONVENIENCE HOOK =====

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
