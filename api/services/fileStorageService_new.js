/**
 * Simplified File Storage Service for Y-WebSocket Collaboration
 * 
 * Focused on core file management without complex versioning
 * Optimized for real-time collaboration with y-websocket
 */

const FileStorage = require('../models/FileStorage');
const path = require('path');

class SimplifiedFileStorage {
  constructor() {
    this.SUPPORTED_TYPES = [
      'javascript', 'python', 'java', 'cpp', 'html', 'css', 
      'json', 'xml', 'yaml', 'markdown', 'txt', 'env'
    ];
  }

  /**
   * Store a new file
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

      // Create file document
      const file = new FileStorage({
        sessionId: fileData.sessionId,
        fileName: fileData.fileName,
        filePath: filePath,
        fileType: fileType,
        content: Buffer.isBuffer(fileData.content) ? fileData.content : Buffer.from(fileData.content, 'utf8'),
        fileSize: Buffer.byteLength(fileData.content),
        mimeType: fileData.mimeType || this._getMimeType(fileExtension),
        uploadedBy: fileData.uploadedBy || fileData.cognitoId
      });

      await file.save();
      return file;
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
   * Get file hierarchy for session
   */
  async getFileHierarchy(sessionId) {
    try {
      const files = await this.getSessionFiles(sessionId);
      return this._buildHierarchy(files);
    } catch (error) {
      console.error('Error building file hierarchy:', error);
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

  /**
   * YJS document synchronization - sync YJS document state to file
   */
  async syncYjsDocumentToFile(sessionId, filePath, yjsDocumentState, cognitoId = null) {
    try {
      // Convert YJS document state to text content
      const Y = require('yjs');
      const doc = new Y.Doc();
      Y.applyUpdate(doc, new Uint8Array(yjsDocumentState));
      const ytext = doc.getText('monaco');
      const content = ytext.toString();
      
      // Update the file content
      return await this.updateFileContent(sessionId, filePath, content, cognitoId);
    } catch (error) {
      console.error('Error syncing YJS document to file:', error);
      throw error;
    }
  }

  /**
   * YJS document synchronization - get YJS document state from file
   */
  async getYjsDocumentFromFile(sessionId, filePath) {
    try {
      let content = '';
      
      try {
        // Try to get the file content
        const file = await this.getFile(sessionId, filePath);
        content = file.content.toString('utf8');
      } catch (error) {
        // If file doesn't exist, start with empty content
        if (error.message === 'File not found') {
          content = '';
        } else {
          throw error;
        }
      }

      // Create YJS document with the content
      const Y = require('yjs');
      const doc = new Y.Doc();
      const ytext = doc.getText('monaco');
      
      if (content.length > 0) {
        ytext.insert(0, content);
      }
      
      // Return the document state as a Uint8Array
      return Y.encodeStateAsUpdate(doc);
    } catch (error) {
      console.error('Error getting YJS document from file:', error);
      throw error;
    }
  }

  /**
   * Store multiple extracted files (for zip uploads)
   */
  async storeExtractedFiles(sessionId, extractedFiles, cognitoId = null) {
    const savedFiles = [];

    for (const fileInfo of extractedFiles) {
      try {
        // Skip system files
        if (this._shouldIgnoreFile(fileInfo.filePath, fileInfo.fileName)) {
          console.log(`🚫 Ignoring system file: ${fileInfo.fileName}`);
          continue;
        }

        const savedFile = await this.storeFile({
          sessionId,
          fileName: fileInfo.fileName,
          fileType: fileInfo.fileType,
          content: fileInfo.content,
          mimeType: fileInfo.mimeType || 'text/plain',
          filePath: fileInfo.filePath,
          uploadedBy: cognitoId
        });

        savedFiles.push({
          name: savedFile.fileName,
          type: savedFile.fileType,
          path: savedFile.filePath,
          size: savedFile.fileSize
        });
      } catch (error) {
        console.error(`Error storing file ${fileInfo.fileName}:`, error.message);
      }
    }

    return savedFiles;
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

  /**
   * Check if file should be ignored (system files)
   */
  _shouldIgnoreFile(filePath, fileName) {
    // Ignore macOS system files
    if (fileName.startsWith('._') || fileName === '.DS_Store') {
      return true;
    }
    
    // Ignore __MACOSX directory and its contents
    if (filePath.includes('__MACOSX/') || filePath.includes('__MACOSX\\')) {
      return true;
    }
    
    // Ignore other common system/hidden files
    const ignoredPatterns = [
      '.git/', 'node_modules/', '.vscode/', '.idea/',
      'Thumbs.db', 'desktop.ini', '.env', '.env.local',
      '.gitignore', '.gitkeep'
    ];
    
    return ignoredPatterns.some(pattern => 
      filePath.includes(pattern) || fileName === pattern.replace('/', '')
    );
  }

  /**
   * Build hierarchical file structure
   */
  _buildHierarchy(files) {
    const folderMap = new Map();
    const rootItems = [];

    // Process each file
    for (const file of files) {
      const pathParts = file.filePath.split('/');
      
      if (pathParts.length === 1) {
        // Root level file
        rootItems.push({
          name: file.fileName,
          type: 'file',
          path: file.filePath,
          size: file.fileSize
        });
      } else {
        // Create folder structure
        for (let i = 1; i < pathParts.length; i++) {
          const folderPath = pathParts.slice(0, i).join('/');
          if (!folderMap.has(folderPath)) {
            folderMap.set(folderPath, {
              name: pathParts[i - 1],
              type: 'folder',
              path: folderPath,
              children: []
            });
          }
        }
        
        // Add file to its parent folder
        const parentFolderPath = pathParts.slice(0, -1).join('/');
        if (folderMap.has(parentFolderPath)) {
          folderMap.get(parentFolderPath).children.push({
            name: file.fileName,
            type: 'file',
            path: file.filePath,
            size: file.fileSize
          });
        }
      }
    }

    // Build nested folder structure
    for (const [folderPath, folder] of folderMap) {
      const pathParts = folderPath.split('/');
      
      if (pathParts.length === 1) {
        // Top-level folder
        rootItems.push(folder);
      } else {
        // Nested folder
        const parentPath = pathParts.slice(0, -1).join('/');
        if (folderMap.has(parentPath)) {
          folderMap.get(parentPath).children.push(folder);
        }
      }
    }

    return rootItems;
  }
}

module.exports = new SimplifiedFileStorage();
