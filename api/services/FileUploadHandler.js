/**
 * File Upload Handler
 * Handles single file and ZIP file uploads with Y-WebSocket integration
 */

class FileUploadHandler {
  constructor(fileStorageCore, zipProcessor, yjsDocumentSync) {
    this.fileStorageCore = fileStorageCore;
    this.zipProcessor = zipProcessor;
    this.yjsDocumentSync = yjsDocumentSync;
    this.uploadSessions = new Map(); // Track active uploads
  }

  /**
   * Upload single file with Y-WebSocket real-time collaboration setup
   */
  async uploadFile(sessionId, fileData, uploaderEmail) {
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.yjsDocumentSync.yjsServer) {
      throw new Error('Y-WebSocket server required for file uploads');
    }
    
    try {
      console.log(`📤 [FILE UPLOAD] Starting single file upload: ${fileData.fileName} for session ${sessionId}`);
      console.log(`📤 [FILE UPLOAD] File data:`, {
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        size: fileData.content?.length || 0,
        parentFolder: fileData.parentFolder,
        filePath: fileData.filePath
      });
      
      // Store file in MongoDB
      const savedFile = await this.fileStorageCore.storeFile({
        sessionId,
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        content: fileData.content,
        mimeType: fileData.mimeType,
        parentFolder: fileData.parentFolder,
        filePath: fileData.filePath,
        uploadedBy: uploaderEmail
      });

      // Create file info for response
      const fileInfo = {
        id: savedFile._id.toString(),
        name: savedFile.fileName,
        type: savedFile.fileType.replace('.', ''),
        path: savedFile.filePath,
        size: savedFile.fileSize,
        uploadedBy: uploaderEmail,
        uploadedAt: new Date().toISOString()
      };
      
      // Create collaboration room and notify about new file
      console.log(`🔗 [FILE UPLOAD] Creating collaboration room for file: ${fileInfo.path}`);
      const roomId = this.yjsDocumentSync.createCollaborationRoom(sessionId, fileInfo.path);
      
      console.log(`📢 [FILE UPLOAD] Notifying collaboration room about file ready: ${fileInfo.path}`);
      this.yjsDocumentSync.notifyCollaborationRoom(sessionId, fileInfo.path, {
        type: 'file-ready-for-collaboration',
        file: fileInfo,
        message: `File uploaded and ready for real-time editing: ${fileData.fileName}`
      });
      
      console.log(`✅ [FILE UPLOAD] File upload complete - stored and Y-WebSocket room notified: ${fileData.fileName}`, {
        fileId: fileInfo.id,
        roomId,
        collaborationReady: true
      });
      
      return {
        success: true,
        file: fileInfo,
        uploadId,
        collaborationReady: true,
        roomId
      };
      
    } catch (error) {
      console.error(`❌ [FILE UPLOAD] Single file upload failed: ${fileData.fileName}`, {
        error: error.message,
        stack: error.stack,
        sessionId,
        fileName: fileData.fileName
      });
      throw error;
    }
  }

  /**
   * Upload ZIP file with Y-WebSocket real-time collaboration setup
   */
  async uploadZipFile(sessionId, zipFile, uploaderEmail) {
    const uploadId = `zip-upload-${Date.now()}`;
    
    if (!this.yjsDocumentSync.yjsServer) {
      throw new Error('Y-WebSocket server required for ZIP uploads');
    }
    
    try {
      console.log(`📦 Starting Y-WebSocket ZIP upload for session ${sessionId}`);
      
      // Extract and process files using ZIP processor
      const extractedFiles = await this.zipProcessor.processZipFile(
        zipFile, 
        sessionId, 
        uploaderEmail
      );

      // Create collaboration rooms and notify about all new files
      const roomIds = [];
      extractedFiles.forEach(file => {
        const roomId = this.yjsDocumentSync.createCollaborationRoom(sessionId, file.path);
        roomIds.push(roomId);
        
        this.yjsDocumentSync.notifyCollaborationRoom(sessionId, file.path, {
          type: 'file-ready-for-collaboration',
          file,
          message: `ZIP file extracted: ${file.name} ready for collaboration`
        });
      });

      console.log(`✅ ZIP processing complete: ${extractedFiles.length} files extracted and Y-WebSocket rooms notified`);
      
      return {
        success: true,
        files: extractedFiles,
        uploadId,
        totalFiles: extractedFiles.length,
        collaborationReady: true,
        roomIds
      };
      
    } catch (error) {
      console.error('❌ Y-WebSocket ZIP upload failed:', error);
      throw error;
    }
  }

  /**
   * Get upload session status
   */
  getUploadStatus(uploadId) {
    return this.uploadSessions.get(uploadId) || null;
  }

  /**
   * Track upload session
   */
  trackUploadSession(uploadId, sessionData) {
    this.uploadSessions.set(uploadId, {
      ...sessionData,
      startTime: new Date(),
      status: 'active'
    });
  }

  /**
   * Complete upload session
   */
  completeUploadSession(uploadId) {
    const session = this.uploadSessions.get(uploadId);
    if (session) {
      session.status = 'completed';
      session.endTime = new Date();
      // Clean up completed sessions after 1 hour
      setTimeout(() => {
        this.uploadSessions.delete(uploadId);
      }, 60 * 60 * 1000);
    }
  }
}

module.exports = FileUploadHandler;
