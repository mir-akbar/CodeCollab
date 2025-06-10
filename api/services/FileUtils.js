/**
 * File Utilities
 * Common file utility functions and file hierarchy management
 */

const path = require('path');

class FileUtils {
  static SUPPORTED_TYPES = [
    'javascript', 'python', 'java', 'cpp', 'html', 'css', 
    'json', 'xml', 'yaml', 'markdown', 'txt', 'env'
  ];

  /**
   * Check if file should be ignored (system files)
   */
  static shouldIgnoreFile(filePath, fileName) {
    // Use fileName if provided, otherwise extract from filePath
    const name = fileName || path.basename(filePath);
    
    // Ignore macOS system files
    if (name.startsWith('._') || name === '.DS_Store') {
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
      filePath.includes(pattern) || name === pattern.replace('/', '')
    );
  }

  /**
   * Build hierarchical file structure from flat file list
   */
  static buildHierarchy(files) {
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

  /**
   * Normalize file path (convert backslashes to forward slashes)
   */
  static normalizePath(filePath) {
    return filePath.replace(/\\/g, '/');
  }

  /**
   * Get file extension without dot
   */
  static getFileExtension(fileName) {
    return path.extname(fileName).toLowerCase().slice(1);
  }

  /**
   * Check if file type is supported
   */
  static isSupportedFileType(extension) {
    const supportedExtensions = [
      'js', 'mjs', 'jsx', 'ts', 'tsx', 'py', 'java', 
      'cpp', 'c', 'h', 'hpp', 'html', 'htm', 'css', 
      'scss', 'sass', 'json', 'xml', 'yaml', 'yml', 
      'md', 'txt', 'env'
    ];
    return supportedExtensions.includes(extension);
  }

  /**
   * Generate unique upload ID
   */
  static generateUploadId(prefix = 'upload') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file data
   */
  static validateFileData(fileData) {
    const errors = [];

    if (!fileData.sessionId) {
      errors.push('Session ID is required');
    }

    if (!fileData.fileName) {
      errors.push('File name is required');
    }

    if (!fileData.content) {
      errors.push('File content is required');
    }

    if (fileData.fileName && fileData.fileName.length > 255) {
      errors.push('File name is too long (max 255 characters)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = FileUtils;
