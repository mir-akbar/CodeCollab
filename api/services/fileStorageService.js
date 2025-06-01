const FileStorage = require('../models/FileStorage');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class OptimizedFileStorage {
  constructor() {
    this.MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB per document (MongoDB limit is 16MB)
    this.COMPRESSION_THRESHOLD = 1024; // 1KB
    this.COMPRESSIBLE_TYPES = ['.js', '.java', '.py', '.html', '.css', '.json', '.xml', '.txt', '.md'];
  }

  // Helper method to check if a file should be ignored
  shouldIgnoreFile(filePath, fileName) {
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
      '.gitignore', '.gitkeep', '.DS_Store'
    ];
    
    return ignoredPatterns.some(pattern => 
      filePath.includes(pattern) || fileName === pattern.replace('/', '')
    );
  }

  async storeFile(fileData) {
    const { sessionId, fileName, fileType, content, mimeType, parentFolder, filePath } = fileData;

    // Check if this file should be ignored
    if (this.shouldIgnoreFile(filePath || fileName, fileName)) {
      console.log(`🚫 Ignoring system file: ${filePath || fileName}`);
      throw new Error(`System file ignored: ${fileName}`);
    }

    let finalContent = content;
    let isCompressed = false;
    const originalSize = Buffer.byteLength(content);

    // Always try compression for text files
    if (this._isTextFile(fileType)) {
      try {
        const compressed = await gzip(content);
        if (compressed.length < originalSize * 0.8) { // Only use if 20%+ savings
          finalContent = compressed;
          isCompressed = true;
        }
      } catch (error) {
        console.warn('Compression failed:', error.message);
      }
    }

    const finalSize = Buffer.byteLength(finalContent);

    // Check if file fits in document
    if (finalSize > this.MAX_FILE_SIZE) {
      throw new Error(`File too large: ${finalSize} bytes. Maximum allowed: ${this.MAX_FILE_SIZE} bytes`);
    }

    const fileDoc = new FileStorage({
      sessionId,
      fileName,
      fileType,
      mimeType,
      fileSize: originalSize,
      compressedSize: isCompressed ? finalSize : null,
      content: finalContent,
      parentFolder,
      filePath,
      storageType: 'document',
      isCompressed
    });

    return await fileDoc.save();
  }

  async getFile(sessionId, filePath) {
    const fileDoc = await FileStorage.findOne({ sessionId, filePath });
    
    if (!fileDoc) {
      throw new Error('File not found');
    }

    let content = fileDoc.content;
    
    if (fileDoc.isCompressed) {
      content = await gunzip(content);
    }
    
    return {
      ...fileDoc.toObject(),
      content
    };
  }

  async updateFileContent(sessionId, filePath, newContent) {
    const fileDoc = await FileStorage.findOne({ sessionId, filePath });
    
    if (!fileDoc) {
      throw new Error('File not found');
    }

    let finalContent = newContent;
    let isCompressed = false;
    const originalSize = Buffer.byteLength(newContent);

    // Try compression
    if (this._isTextFile(fileDoc.fileType)) {
      try {
        const compressed = await gzip(newContent);
        if (compressed.length < originalSize * 0.8) {
          finalContent = compressed;
          isCompressed = true;
        }
      } catch (error) {
        console.warn('Compression failed:', error.message);
      }
    }

    const finalSize = Buffer.byteLength(finalContent);

    if (finalSize > this.MAX_FILE_SIZE) {
      throw new Error(`Updated file too large: ${finalSize} bytes`);
    }

    fileDoc.content = finalContent;
    fileDoc.fileSize = originalSize;
    fileDoc.compressedSize = isCompressed ? finalSize : null;
    fileDoc.isCompressed = isCompressed;
    fileDoc.lastModified = new Date();
    
    return await fileDoc.save();
  }

  async deleteFile(sessionId, filePath) {
    const result = await FileStorage.deleteOne({ sessionId, filePath });
    return result.deletedCount > 0;
  }

  async deleteFolder(sessionId, folderPath) {
    // Delete all files within the folder path
    const result = await FileStorage.deleteMany({ 
      sessionId, 
      $or: [
        { filePath: folderPath },
        { filePath: { $regex: `^${folderPath}/` } },
        { parentFolder: folderPath }
      ]
    });
    return result.deletedCount;
  }

  async getSessionFiles(sessionId) {
    return await FileStorage.find({ sessionId })
      .select('-content') // Exclude content for listing
      .sort({ filePath: 1 });
  }

  async getFileHierarchy(sessionId) {
    const files = await this.getSessionFiles(sessionId);
    return this._buildHierarchy(files);
  }

  async deleteSession(sessionId) {
    const result = await FileStorage.deleteMany({ sessionId });
    return result.deletedCount;
  }

  async getStorageStats(sessionId) {
    const pipeline = [
      { $match: { sessionId } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalOriginalSize: { $sum: '$fileSize' },
          totalStoredSize: { 
            $sum: { 
              $cond: [
                '$isCompressed', 
                '$compressedSize', 
                '$fileSize'
              ] 
            }
          }
        }
      }
    ];

    const result = await FileStorage.aggregate(pipeline);
    
    if (result.length === 0) {
      return {
        totalFiles: 0,
        totalOriginalSize: 0,
        totalStoredSize: 0,
        compressionRatio: 0
      };
    }

    const stats = result[0];
    return {
      ...stats,
      compressionRatio: stats.totalOriginalSize > 0 
        ? ((stats.totalOriginalSize - stats.totalStoredSize) / stats.totalOriginalSize * 100).toFixed(2)
        : 0
    };
  }

  // YJS-specific methods for real-time collaboration
  async syncYjsDocumentToFile(sessionId, filePath, yjsDocumentState) {
    try {
      // Convert YJS document state to text content
      const Y = require('yjs');
      const doc = new Y.Doc();
      Y.applyUpdate(doc, new Uint8Array(yjsDocumentState));
      const ytext = doc.getText('monaco');
      const content = ytext.toString();
      
      // Update the file content in MongoDB
      const contentBuffer = Buffer.from(content, 'utf8');
      return await this.updateFileContent(sessionId, filePath, contentBuffer);
    } catch (error) {
      console.error('Error syncing YJS document to file:', error);
      throw error;
    }
  }

  async getYjsDocumentFromFile(sessionId, filePath) {
    try {
      // Get the file content from MongoDB
      const file = await this.getFile(sessionId, filePath);
      const content = file.content.toString('utf8');
      
      // Only create a YJS document if the file has content
      if (content && content.trim().length > 0) {
        // Create YJS document with the content
        const Y = require('yjs');
        const doc = new Y.Doc();
        const ytext = doc.getText('monaco');
        ytext.insert(0, content);
        
        // Return the document state as a Uint8Array
        return Y.encodeStateAsUpdate(doc);
      } else {
        // For empty files, return empty document state
        const Y = require('yjs');
        const doc = new Y.Doc();
        doc.getText('monaco'); // Initialize the text type
        return Y.encodeStateAsUpdate(doc);
      }
    } catch (error) {
      // If file doesn't exist, return empty document state
      if (error.message === 'File not found') {
        const Y = require('yjs');
        const doc = new Y.Doc();
        doc.getText('monaco'); // Initialize the text type
        return Y.encodeStateAsUpdate(doc);
      }
      throw error;
    }
  }

  _isTextFile(fileType) {
    return this.COMPRESSIBLE_TYPES.includes(fileType);
  }

  _buildHierarchy(files) {
    const folderMap = new Map();
    const rootItems = [];

    // First pass: Create all folders and files
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
        // Create all necessary intermediate folders in the path
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
        
        // Add the file to its immediate parent folder
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

    // Second pass: Build the nested structure by organizing folders
    for (const [folderPath, folder] of folderMap) {
      const pathParts = folderPath.split('/');
      
      if (pathParts.length === 1) {
        // Top-level folder - add to root
        rootItems.push(folder);
      } else {
        // Nested folder - add to its parent folder
        const parentPath = pathParts.slice(0, -1).join('/');
        if (folderMap.has(parentPath)) {
          folderMap.get(parentPath).children.push(folder);
        }
      }
    }

    return rootItems;
  }

  async storeExtractedFiles(sessionId, extractedFiles, parentFolder = null) {
    const savedFiles = [];

    for (const fileInfo of extractedFiles) {
      try {
        const savedFile = await this.storeFile({
          sessionId,
          fileName: fileInfo.fileName,
          fileType: fileInfo.fileType,
          content: fileInfo.content,
          mimeType: fileInfo.mimeType || 'text/plain',
          parentFolder,
          filePath: fileInfo.filePath
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
}

module.exports = new OptimizedFileStorage();
