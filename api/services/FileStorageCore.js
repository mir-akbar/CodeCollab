/**
 * File Storage Core Operations
 * Handles basic CRUD operations for files in MongoDB
 */

const FileStorage = require('../models/FileStorage');
const path = require('path');

class FileStorageCore {
  /**
   * Store a new file in MongoDB
   */
  async storeFile(fileData) {
    try {
      // Validate required fields
      if (!fileData.sessionId || !fileData.fileName || !fileData.content) {
        throw new Error('Missing required fields: sessionId, fileName, or content');
      }

      // Generate file path if not provided
      const filePath = fileData.filePath || fileData.fileName;
      
      // Determine file type from extension
      const fileExtension = path.extname(fileData.fileName).toLowerCase().slice(1);
      const fileType = this._getFileType(fileExtension);

      // Prepare file data
      const fileDocument = {
        sessionId: fileData.sessionId,
        fileName: fileData.fileName,
        filePath: filePath,
        fileType: fileType,
        content: Buffer.isBuffer(fileData.content) ? fileData.content : Buffer.from(fileData.content, 'utf8'),
        fileSize: Buffer.byteLength(fileData.content),
        mimeType: fileData.mimeType || this._getMimeType(fileExtension),
        uploadedBy: fileData.uploadedBy || fileData.cognitoId,
        updatedAt: new Date()
      };

      // Use upsert to handle both new files and updates
      const result = await FileStorage.findOneAndUpdate(
        { sessionId: fileData.sessionId, filePath: filePath },
        fileDocument,
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );

      return result;
    } catch (error) {
      console.error('Error storing file:', error);
      throw error;
    }
  }

  /**
   * Get file by session and path
   */
  async getFile(sessionId, filePath) {
    try {
      const file = await FileStorage.findByPath(sessionId, filePath);
      if (!file) {
        throw new Error('File not found');
      }
      return file;
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  /**
   * Update file content
   */
  async updateFileContent(sessionId, filePath, newContent, cognitoId = null) {
    try {
      const file = await FileStorage.findByPath(sessionId, filePath);
      if (!file) {
        throw new Error('File not found');
      }

      // Update content and metadata
      file.content = Buffer.isBuffer(newContent) ? newContent : Buffer.from(newContent, 'utf8');
      file.fileSize = Buffer.byteLength(file.content);
      file.updatedAt = new Date();
      
      if (cognitoId) {
        file.uploadedBy = cognitoId;
      }

      await file.save();
      return file;
    } catch (error) {
      console.error('Error updating file content:', error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(sessionId, filePath) {
    try {
      const result = await FileStorage.deleteOne({ sessionId, filePath });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Delete folder and all its contents
   */
  async deleteFolder(sessionId, folderPath) {
    try {
      const result = await FileStorage.deleteMany({ 
        sessionId, 
        $or: [
          { filePath: folderPath },
          { filePath: { $regex: `^${folderPath}/` } }
        ]
      });
      return result.deletedCount;
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  /**
   * Get all files in a session
   */
  async getSessionFiles(sessionId) {
    try {
      return await FileStorage.find({ sessionId })
        .select('-content') // Exclude content for listing
        .sort({ filePath: 1 });
    } catch (error) {
      console.error('Error getting session files:', error);
      throw error;
    }
  }

  /**
   * Delete all files for a session
   */
  async deleteSession(sessionId) {
    try {
      const result = await FileStorage.deleteMany({ sessionId });
      return result.deletedCount;
    } catch (error) {
      console.error('Error deleting session files:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics for a session
   */
  async getStorageStats(sessionId) {
    try {
      const pipeline = [
        { $match: { sessionId } },
        {
          $group: {
            _id: null,
            totalFiles: { $sum: 1 },
            totalSize: { $sum: '$fileSize' }
          }
        }
      ];

      const result = await FileStorage.aggregate(pipeline);
      
      if (result.length === 0) {
        return {
          totalFiles: 0,
          totalSize: 0
        };
      }

      return result[0];
    } catch (error) {
      console.error('Error getting storage stats:', error);
      throw error;
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Determine file type from extension
   */
  _getFileType(extension) {
    const typeMap = {
      'js': 'javascript',
      'mjs': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'cpp',
      'h': 'cpp',
      'hpp': 'cpp',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'css',
      'sass': 'css',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'txt': 'txt',
      'env': 'env'
    };

    return typeMap[extension] || 'text';
  }

  /**
   * Get MIME type from extension
   */
  _getMimeType(extension) {
    const mimeMap = {
      'js': 'application/javascript',
      'mjs': 'application/javascript',
      'jsx': 'application/javascript',
      'ts': 'application/typescript',
      'tsx': 'application/typescript',
      'py': 'text/x-python',
      'java': 'text/x-java',
      'cpp': 'text/x-c++src',
      'c': 'text/x-csrc',
      'h': 'text/x-chdr',
      'hpp': 'text/x-c++hdr',
      'html': 'text/html',
      'htm': 'text/html',
      'css': 'text/css',
      'scss': 'text/x-scss',
      'sass': 'text/x-sass',
      'json': 'application/json',
      'xml': 'application/xml',
      'yaml': 'application/x-yaml',
      'yml': 'application/x-yaml',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'env': 'text/plain'
    };

    return mimeMap[extension] || 'text/plain';
  }
}

module.exports = FileStorageCore;
