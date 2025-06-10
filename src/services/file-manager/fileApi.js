/**
 * File Management API Service
 * Handles all file-related API calls to the backend
 * Uses modern fetch API with proper error handling
 */

import { API_URL } from '@/common/Constant';

class FileApiService {
  constructor() {
    this.baseUrl = `${API_URL}`;
  }

  /**
   * Upload a file (single or ZIP)
   */
  async uploadFile(file, sessionId, userEmail, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionID', sessionId);
    formData.append('email', userEmail);

    const response = await fetch(`${this.baseUrl}/file-upload/file-upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all files for a session
   */
  async getSessionFiles(sessionId) {
    const response = await fetch(
      `${this.baseUrl}/by-session?session=${encodeURIComponent(sessionId)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get file hierarchy for a session
   */
  async getFileHierarchy(sessionId) {
    const response = await fetch(
      `${this.baseUrl}/hierarchy?session=${encodeURIComponent(sessionId)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch file hierarchy: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get file content
   */
  async getFileContent(filePath, sessionId) {
    const response = await fetch(
      `${this.baseUrl}/get-file?path=${encodeURIComponent(filePath)}&sessionId=${encodeURIComponent(sessionId)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${response.status}`);
    }

    return response.text();
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath, sessionId) {
    const response = await fetch(`${this.baseUrl}/delete-file`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: filePath,
        sessionId: sessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Delete failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get storage statistics for a session
   */
  async getStorageStats(sessionId) {
    const response = await fetch(
      `${this.baseUrl}/stats?session=${encodeURIComponent(sessionId)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch storage stats: ${response.status}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const fileApiService = new FileApiService();
export default fileApiService;
