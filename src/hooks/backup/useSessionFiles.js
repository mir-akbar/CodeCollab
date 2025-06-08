import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

// File management API functions
const fileAPI = {
  // Get files for a session
  getSessionFiles: async (sessionId) => {
    const response = await axios.get(`${API_URL}/api/sessions/${sessionId}/files`, {
      withCredentials: true
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch session files');
    }
    
    return response.data.files || [];
  },

  // Upload a file to session
  uploadFile: async ({ sessionId, file, userEmail }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userEmail', userEmail);
    formData.append('sessionId', sessionId);

    const response = await axios.post(
      `${API_URL}/api/sessions/${sessionId}/files/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true
      }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to upload file');
    }
    
    return response.data.file;
  },

  // Delete a file from session
  deleteFile: async ({ sessionId, fileId, userEmail }) => {
    const response = await axios.delete(
      `${API_URL}/api/sessions/${sessionId}/files/${fileId}`,
      {
        data: { userEmail },
        withCredentials: true
      }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete file');
    }
    
    return response.data;
  },

  // Download a file
  downloadFile: async ({ sessionId, fileId }) => {
    const response = await axios.get(
      `${API_URL}/api/sessions/${sessionId}/files/${fileId}/download`,
      {
        responseType: 'blob',
        withCredentials: true
      }
    );
    
    return response.data;
  },

  // Update file content (for collaborative editing)
  updateFileContent: async ({ sessionId, fileId, content, userEmail }) => {
    const response = await axios.put(
      `${API_URL}/api/sessions/${sessionId}/files/${fileId}`,
      {
        content,
        userEmail,
        timestamp: new Date().toISOString()
      },
      {
        withCredentials: true
      }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update file');
    }
    
    return response.data.file;
  }
};

// Query keys for file management
export const fileKeys = {
  all: ['files'],
  session: (sessionId) => [...fileKeys.all, 'session', sessionId],
  file: (sessionId, fileId) => [...fileKeys.all, 'session', sessionId, 'file', fileId],
};

/**
 * Hook to manage session files with TanStack Query caching
 */
export const useSessionFiles = (sessionId) => {
  return useQuery({
    queryKey: fileKeys.session(sessionId),
    queryFn: () => fileAPI.getSessionFiles(sessionId),
    enabled: !!sessionId,
    staleTime: 2 * 60 * 1000, // 2 minutes - files don't change as frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch files on focus (they're usually large)
  });
};

/**
 * Hook to upload files with progress tracking and optimistic updates
 */
export const useUploadFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: fileAPI.uploadFile,
    onMutate: async ({ sessionId, file, userEmail }) => {
      await queryClient.cancelQueries({ queryKey: fileKeys.session(sessionId) });
      
      const previousFiles = queryClient.getQueryData(fileKeys.session(sessionId));
      
      // Create optimistic file entry
      const optimisticFile = {
        id: `temp-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedBy: userEmail,
        uploadedAt: new Date().toISOString(),
        status: 'uploading',
        progress: 0,
        _isOptimistic: true
      };
      
      // Add optimistic file to cache
      queryClient.setQueryData(
        fileKeys.session(sessionId),
        (old) => old ? [...old, optimisticFile] : [optimisticFile]
      );
      
      return { previousFiles, optimisticFile };
    },
    onSuccess: (uploadedFile, { sessionId }, context) => {
      // Replace optimistic file with real one
      queryClient.setQueryData(
        fileKeys.session(sessionId),
        (old) => {
          if (!old) return [uploadedFile];
          const withoutTemp = old.filter(file => file.id !== context.optimisticFile.id);
          return [...withoutTemp, { ...uploadedFile, status: 'uploaded' }];
        }
      );
    },
    onError: (error, { sessionId }, context) => {
      // Restore previous state on error
      if (context?.previousFiles) {
        queryClient.setQueryData(fileKeys.session(sessionId), context.previousFiles);
      }
    }
  });
};

/**
 * Hook to delete files with optimistic updates
 */
export const useDeleteFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: fileAPI.deleteFile,
    onMutate: async ({ sessionId, fileId }) => {
      await queryClient.cancelQueries({ queryKey: fileKeys.session(sessionId) });
      
      const previousFiles = queryClient.getQueryData(fileKeys.session(sessionId));
      
      // Optimistically remove file
      queryClient.setQueryData(
        fileKeys.session(sessionId),
        (old) => old?.filter(file => file.id !== fileId) || []
      );
      
      return { previousFiles };
    },
    onError: (error, { sessionId }, context) => {
      // Restore previous state on error
      if (context?.previousFiles) {
        queryClient.setQueryData(fileKeys.session(sessionId), context.previousFiles);
      }
    }
  });
};

/**
 * Hook to update file content with conflict resolution
 */
export const useUpdateFileContent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: fileAPI.updateFileContent,
    onSuccess: (updatedFile, { sessionId, fileId }) => {
      // Update file in session files cache
      queryClient.setQueryData(
        fileKeys.session(sessionId),
        (old) => old?.map(file => 
          file.id === fileId ? { ...file, ...updatedFile } : file
        ) || []
      );
      
      // Update specific file cache if it exists
      queryClient.setQueryData(
        fileKeys.file(sessionId, fileId),
        updatedFile
      );
    }
  });
};

/**
 * Hook to download files
 */
export const useDownloadFile = () => {
  return useMutation({
    mutationFn: fileAPI.downloadFile,
    onSuccess: (blob, { sessionId, fileId, fileName }) => {
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `file-${fileId}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }
  });
};

/**
 * Comprehensive file management hook
 */
export const useFileManager = (sessionId, userEmail) => {
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();
  const updateFileContent = useUpdateFileContent();
  const downloadFile = useDownloadFile();
  
  const actions = {
    uploadFile: useCallback(async (file) => {
      try {
        const result = await uploadFile.mutateAsync({ sessionId, file, userEmail });
        return { success: true, file: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [uploadFile, sessionId, userEmail]),
    
    deleteFile: useCallback(async (fileId) => {
      try {
        await deleteFile.mutateAsync({ sessionId, fileId, userEmail });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [deleteFile, sessionId, userEmail]),
    
    updateFile: useCallback(async (fileId, content) => {
      try {
        const result = await updateFileContent.mutateAsync({ 
          sessionId, 
          fileId, 
          content, 
          userEmail 
        });
        return { success: true, file: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [updateFileContent, sessionId, userEmail]),
    
    downloadFile: useCallback(async (fileId, fileName) => {
      try {
        await downloadFile.mutateAsync({ sessionId, fileId, fileName });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, [downloadFile, sessionId])
  };
  
  return {
    ...actions,
    // Loading states
    isUploading: uploadFile.isPending,
    isDeleting: deleteFile.isPending,
    isUpdating: updateFileContent.isPending,
    isDownloading: downloadFile.isPending,
    // Progress tracking for uploads
    uploadProgress: uploadFile.variables?.progress || 0,
    // Error states
    uploadError: uploadFile.error,
    deleteError: deleteFile.error,
    updateError: updateFileContent.error,
    downloadError: downloadFile.error,
  };
};
