/**
 * File Management API Service
 * Handles all file-related API calls to the backend
 * Uses apiClient for authentication and proper error handling
 * 
 * Updated to use unified /api/files/* endpoints
 */

import { apiClient } from '../apiClient';

class FileApiService {
  constructor() {
    // apiClient already has the base URL configured
  }

  /**
   * Upload a file (single or ZIP)
   */
  async uploadFile(file, sessionId, userEmail, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionID', sessionId);
    formData.append('email', userEmail);

    const response = await apiClient.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  }

  /**
   * Get all files for a session
   */
  async getSessionFiles(sessionId) {
    const response = await apiClient.get(`/api/files/session/${encodeURIComponent(sessionId)}`);
    return response.data.files || response.data;
  }

  /**
   * Get file hierarchy for a session
   */
  async getFileHierarchy(sessionId) {
    const response = await apiClient.get(`/api/files/hierarchy/${encodeURIComponent(sessionId)}`);
    return response.data;
  }

  /**
   * Get file content
   */
  async getFileContent(filePath, sessionId) {
    const response = await apiClient.get(`/api/files/content?path=${encodeURIComponent(filePath)}&sessionId=${encodeURIComponent(sessionId)}`, {
      responseType: 'text'
    });
    return response.data;
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath, sessionId, userEmail = null) {
    const response = await apiClient.delete(`/api/files/${encodeURIComponent(sessionId)}/${encodeURIComponent(filePath)}`, {
      data: {
        userEmail: userEmail,
      },
    });

    return response.data;
  }

  /**
   * Get storage statistics for a session
   */
  async getStorageStats(sessionId) {
    const response = await apiClient.get(`/api/files/stats/${encodeURIComponent(sessionId)}`);
    return response.data;
  }
}

// Export singleton instance
export const fileApiService = new FileApiService();
export default fileApiService;
