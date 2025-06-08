const FileStorage = require('../models/FileStorage');

/**
 * Simplified File Storage Service for Y-WebSocket Collaboration
 * 
 * Focused on core file management without complex versioning
 * Optimized for real-time collaboration with y-websocket
 */
class SimplifiedFileStorage {
  constructor() {
    this.MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB per document (MongoDB limit is 16MB)
  }

  // ===== VERSIONING METHODS =====
  
  /**
   * Generate content hash for change detection
   */
  generateContentHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if content has actually changed
   */
  async hasContentChanged(sessionId, filePath, newContent) {
    try {
      const currentFile = await FileStorage.findLatestVersion(sessionId, filePath);
      if (!currentFile) return true; // No existing file, so it's a change
      
      const newHash = this.generateContentHash(newContent);
      return currentFile.contentHash !== newHash;
    } catch (error) {
      console.error('Error checking content change:', error);
      return true; // Assume changed on error
    }
  }

  /**
   * Create a new version of a file
   */
  async createFileVersion(fileData, options = {}) {
    const { 
      maxVersions = this.DEFAULT_MAX_VERSIONS,
      retentionDays = this.DEFAULT_RETENTION_DAYS,
      changeDescription = null
    } = options;

    const { sessionId, fileName, fileType, content, mimeType, parentFolder, filePath } = fileData;

    // Check if content actually changed
    const contentChanged = await this.hasContentChanged(sessionId, filePath, content);
    if (!contentChanged) {
      console.log(`📝 No content change detected for ${filePath}, skipping version creation`);
      return await FileStorage.findLatestVersion(sessionId, filePath);
    }

    // Get current latest version
    const currentLatest = await FileStorage.findLatestVersion(sessionId, filePath);
    let newVersion = 1;
    
    if (currentLatest) {
      // Mark current latest as not latest
      currentLatest.isLatest = false;
      await currentLatest.save();
      newVersion = currentLatest.version + 1;
    }

    // Process content (compression, etc.)
    let finalContent = content;
    let isCompressed = false;
    const originalSize = Buffer.byteLength(content);

    if (this._isTextFile(fileType)) {
      try {
        const compressed = await gzip(content);
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
      throw new Error(`File too large: ${finalSize} bytes. Maximum allowed: ${this.MAX_FILE_SIZE} bytes`);
    }

    // Create new version
    const newFileVersion = new FileStorage({
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
      isCompressed,
      version: newVersion,
      isLatest: true,
      previousVersion: currentLatest ? currentLatest._id : null,
      changeDescription
    });

    const savedVersion = await newFileVersion.save();
    
    // Queue cleanup for this file
    this.queueCleanup(sessionId, filePath, maxVersions, retentionDays);
    
    console.log(`✅ Created version ${newVersion} for ${filePath}`);
    return savedVersion;
  }

  /**
   * Get file version history
   */
  async getFileVersionHistory(sessionId, filePath, limit = 10) {
    return await FileStorage.findVersionHistory(sessionId, filePath, limit);
  }

  /**
   * Get specific version of a file
   */
  async getFileVersion(sessionId, filePath, version) {
    const fileDoc = await FileStorage.findOne({ 
      sessionId, 
      filePath, 
      version 
    });
    
    if (!fileDoc) {
      throw new Error(`Version ${version} of file not found`);
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

  /**
   * Generate enhanced diff between versions
   */
  async generateVersionDiff(sessionId, filePath, fromVersion, toVersion) {
    const [fromFile, toFile] = await Promise.all([
      this.getFileVersion(sessionId, filePath, fromVersion),
      this.getFileVersion(sessionId, filePath, toVersion)
    ]);

    const fromContent = fromFile.content.toString('utf8');
    const toContent = toFile.content.toString('utf8');

    // Generate different types of diffs
    const lineDiff = diff.diffLines(fromContent, toContent);
    const wordDiff = diff.diffWords(fromContent, toContent);
    const charDiff = diff.diffChars(fromContent, toContent);

    // Calculate statistics
    let addedLines = 0, removedLines = 0, addedChars = 0, removedChars = 0;
    
    lineDiff.forEach(part => {
      if (part.added) addedLines += part.count || 0;
      if (part.removed) removedLines += part.count || 0;
    });

    charDiff.forEach(part => {
      if (part.added) addedChars += part.value.length;
      if (part.removed) removedChars += part.value.length;
    });

    return {
      fromVersion: fromFile.version,
      toVersion: toFile.version,
      fromDate: fromFile.createdAt,
      toDate: toFile.createdAt,
      stats: {
        addedLines,
        removedLines,
        addedChars,
        removedChars,
        totalChanges: addedLines + removedLines
      },
      diffs: {
        lines: lineDiff,
        words: wordDiff,
        chars: charDiff
      }
    };
  }

  /**
   * Get versioning statistics for a session
   */
  async getVersioningStats(sessionId) {
    try {
      const pipeline = [
        { $match: { sessionId } },
        {
          $group: {
            _id: '$filePath',
            totalVersions: { $sum: 1 },
            latestVersion: { $max: '$version' },
            totalSize: { $sum: '$fileSize' },
            oldestVersion: { $min: '$createdAt' },
            newestVersion: { $max: '$createdAt' }
          }
        },
        {
          $group: {
            _id: null,
            totalFiles: { $sum: 1 },
            totalVersions: { $sum: '$totalVersions' },
            totalSize: { $sum: '$totalSize' },
            avgVersionsPerFile: { $avg: '$totalVersions' },
            filesWithMultipleVersions: {
              $sum: { $cond: [{ $gt: ['$totalVersions', 1] }, 1, 0] }
            }
          }
        }
      ];

      const result = await FileStorage.aggregate(pipeline);
      
      if (result.length === 0) {
        return {
          totalFiles: 0,
          totalVersions: 0,
          totalSize: 0,
          avgVersionsPerFile: 0,
          filesWithMultipleVersions: 0
        };
      }

      const stats = result[0];
      return {
        totalFiles: stats.totalFiles,
        totalVersions: stats.totalVersions,
        totalSize: stats.totalSize,
        avgVersionsPerFile: Math.round(stats.avgVersionsPerFile * 100) / 100,
        filesWithMultipleVersions: stats.filesWithMultipleVersions,
        versioning: {
          maxVersionsPerFile: this.DEFAULT_MAX_VERSIONS,
          retentionDays: this.DEFAULT_RETENTION_DAYS
        }
      };
    } catch (error) {
      console.error('Error getting versioning stats:', error);
      throw error;
    }
  }

  // ===== CLEANUP METHODS =====
  
  /**
   * Queue cleanup for a file
   */
  queueCleanup(sessionId, filePath, maxVersions, retentionDays) {
    this.cleanupQueue.push({
      sessionId,
      filePath,
      maxVersions,
      retentionDays,
      queuedAt: new Date()
    });
  }

  /**
   * Process cleanup queue
   */
  async processCleanupQueue() {
    if (this.isCleanupRunning || this.cleanupQueue.length === 0) {
      return;
    }

    this.isCleanupRunning = true;
    console.log(`🧹 Processing ${this.cleanupQueue.length} cleanup tasks`);

    try {
      const tasks = this.cleanupQueue.splice(0); // Take all tasks
      const processedFiles = new Set();

      for (const task of tasks) {
        const fileKey = `${task.sessionId}:${task.filePath}`;
        if (processedFiles.has(fileKey)) continue; // Skip duplicates
        
        processedFiles.add(fileKey);
        await this.cleanupFileVersions(
          task.sessionId, 
          task.filePath, 
          task.maxVersions, 
          task.retentionDays
        );
      }
    } catch (error) {
      console.error('Error processing cleanup queue:', error);
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Clean up old versions for a specific file
   */
  async cleanupFileVersions(sessionId, filePath, maxVersions, retentionDays) {
    try {
      // Get all versions for this file
      const allVersions = await FileStorage.find({ 
        sessionId, 
        filePath 
      }).sort({ version: -1 });

      if (allVersions.length <= 1) return; // Keep at least one version

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const versionsToDelete = [];

      // Keep the latest version always
      const versionsToCheck = allVersions.slice(1);

      // Apply retention rules
      let keptCount = 1; // Already keeping the latest
      
      for (const version of versionsToCheck) {
        const shouldDelete = 
          (keptCount >= maxVersions) || 
          (version.createdAt < cutoffDate);

        if (shouldDelete) {
          versionsToDelete.push(version._id);
        } else {
          keptCount++;
        }
      }

      if (versionsToDelete.length > 0) {
        const deleteResult = await FileStorage.deleteMany({
          _id: { $in: versionsToDelete }
        });
        
        console.log(`🗑️ Cleaned up ${deleteResult.deletedCount} old versions for ${filePath}`);
      }
    } catch (error) {
      console.error(`Error cleaning up versions for ${filePath}:`, error);
    }
  }

  /**
   * Start background cleanup scheduler
   */
  startCleanupScheduler() {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.processCleanupQueue();
    }, 5 * 60 * 1000);

    // Also run cleanup on startup after 30 seconds
    setTimeout(() => {
      this.processCleanupQueue();
    }, 30000);
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

  async storeFile(fileData, options = {}) {
    // Check if this file should be ignored
    if (this.shouldIgnoreFile(fileData.filePath || fileData.fileName, fileData.fileName)) {
      console.log(`🚫 Ignoring system file: ${fileData.filePath || fileData.fileName}`);
      throw new Error(`System file ignored: ${fileData.fileName}`);
    }

    // Use the versioning system for new files
    return await this.createFileVersion(fileData, options);
  }

  async getFile(sessionId, filePath) {
    // Get the latest version of the file
    const fileDoc = await FileStorage.findLatestVersion(sessionId, filePath);
    
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

  async updateFileContent(sessionId, filePath, newContent, options = {}) {
    // Get the current file to extract metadata
    const currentFile = await FileStorage.findLatestVersion(sessionId, filePath);
    
    if (!currentFile) {
      throw new Error('File not found');
    }

    // Create new version with updated content
    const fileData = {
      sessionId,
      fileName: currentFile.fileName,
      fileType: currentFile.fileType,
      content: newContent,
      mimeType: currentFile.mimeType,
      parentFolder: currentFile.parentFolder,
      filePath
    };

    return await this.createFileVersion(fileData, {
      ...options,
      changeDescription: options.changeDescription || 'Content updated'
    });
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
    return await FileStorage.find({ sessionId, isLatest: true })
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
