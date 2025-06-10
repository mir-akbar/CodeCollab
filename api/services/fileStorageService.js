/**
 * Pure Y-WebSocket File Storage Service (Orchestrator)
 * Simplified main service that orchestrates all file storage operations
 * Refactored into modular components for better maintainability
 */

const FileStorageCore = require('./FileStorageCore');
const ZipProcessor = require('./ZipProcessor');
const YjsDocumentSync = require('./YjsDocumentSync');
const FileUploadHandler = require('./FileUploadHandler');
const FileUtils = require('./FileUtils');

class PureYjsFileStorageService {
  constructor() {
    // Initialize core components
    this.core = new FileStorageCore();
    this.zipProcessor = new ZipProcessor(this.core);
    this.yjsDocumentSync = new YjsDocumentSync(this.core);
    this.uploadHandler = new FileUploadHandler(this.core, this.zipProcessor, this.yjsDocumentSync);
    
    // Expose constants
    this.SUPPORTED_TYPES = FileUtils.SUPPORTED_TYPES;
  }

  /**
   * Set Y-WebSocket server (required for real-time collaboration)
   */
  setYjsServer(yjsServer) {
    this.yjsDocumentSync.setYjsServer(yjsServer);
    console.log('🔌 Y-WebSocket server connected to file storage service');
  }

  // ===== FILE UPLOAD OPERATIONS =====

  /**
   * Upload single file with Y-WebSocket real-time collaboration setup
   */
  async uploadFile(sessionId, fileData, uploaderEmail) {
    return this.uploadHandler.uploadFile(sessionId, fileData, uploaderEmail);
  }

  /**
   * Upload ZIP file with Y-WebSocket real-time collaboration setup
   */
  async uploadZipFile(sessionId, zipFile, uploaderEmail) {
    return this.uploadHandler.uploadZipFile(sessionId, zipFile, uploaderEmail);
  }

  // ===== CORE FILE OPERATIONS =====

  /**
   * Store a new file
   */
  async storeFile(fileData) {
    return this.core.storeFile(fileData);
  }

  /**
   * Get file by session and path
   */
  async getFile(sessionId, filePath) {
    return this.core.getFile(sessionId, filePath);
  }

  /**
   * Update file content
   */
  async updateFileContent(sessionId, filePath, newContent, cognitoId = null) {
    return this.core.updateFileContent(sessionId, filePath, newContent, cognitoId);
  }

  /**
   * Delete a file
   */
  async deleteFile(sessionId, filePath) {
    return this.core.deleteFile(sessionId, filePath);
  }

  /**
   * Delete folder and all its contents
   */
  async deleteFolder(sessionId, folderPath) {
    return this.core.deleteFolder(sessionId, folderPath);
  }

  /**
   * Get all files in a session
   */
  async getSessionFiles(sessionId) {
    return this.core.getSessionFiles(sessionId);
  }

  /**
   * Get file hierarchy for session
   */
  async getFileHierarchy(sessionId) {
    const files = await this.core.getSessionFiles(sessionId);
    return FileUtils.buildHierarchy(files);
  }

  /**
   * Delete all files for a session
   */
  async deleteSession(sessionId) {
    return this.core.deleteSession(sessionId);
  }

  /**
   * Get storage statistics for a session
   */
  async getStorageStats(sessionId) {
    return this.core.getStorageStats(sessionId);
  }

  // ===== Y-WEBSOCKET DOCUMENT SYNCHRONIZATION =====

  /**
   * Y-WebSocket Document Synchronization - sync Y.js document state to file
   */
  async syncYjsDocumentToFile(sessionId, filePath, yjsDocumentState, cognitoId = null) {
    return this.yjsDocumentSync.syncDocumentToFile(sessionId, filePath, yjsDocumentState, cognitoId);
  }

  /**
   * Y-WebSocket Document Synchronization - get Y.js document state from file
   */
  async getYjsDocumentFromFile(sessionId, filePath) {
    return this.yjsDocumentSync.getDocumentFromFile(sessionId, filePath);
  }

  // ===== ZIP PROCESSING =====

  /**
   * Process ZIP file with progress tracking
   */
  async processZipFile(zipFile, sessionId, uploaderEmail) {
    return this.zipProcessor.processZipFile(zipFile, sessionId, uploaderEmail);
  }

  /**
   * Store multiple extracted files (for zip uploads)
   */
  async storeExtractedFiles(sessionId, extractedFiles, cognitoId = null) {
    return this.zipProcessor.storeExtractedFiles(sessionId, extractedFiles, cognitoId);
  }

  // ===== UTILITY FUNCTIONS =====

  /**
   * Check if file should be ignored (system files)
   */
  shouldIgnoreFile(filePath, fileName) {
    return FileUtils.shouldIgnoreFile(filePath, fileName);
  }

  /**
   * Get upload session status
   */
  getUploadStatus(uploadId) {
    return this.uploadHandler.getUploadStatus(uploadId);
  }

  /**
   * Validate file data
   */
  validateFileData(fileData) {
    return FileUtils.validateFileData(fileData);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    return FileUtils.formatFileSize(bytes);
  }

  // ===== COLLABORATION HELPERS =====

  /**
   * Create collaboration room for a file
   */
  createCollaborationRoom(sessionId, filePath) {
    return this.yjsDocumentSync.createCollaborationRoom(sessionId, filePath);
  }

  /**
   * Notify collaboration room about file events
   */
  notifyCollaborationRoom(sessionId, filePath, eventData) {
    return this.yjsDocumentSync.notifyCollaborationRoom(sessionId, filePath, eventData);
  }

  // ===== SERVICE STATUS =====

  /**
   * Get service status and component health
   */
  getServiceStatus() {
    return {
      status: 'active',
      components: {
        fileStorageCore: 'active',
        zipProcessor: 'active',
        yjsDocumentSync: this.yjsDocumentSync.yjsServer ? 'active' : 'waiting for Y-WebSocket server',
        fileUploadHandler: 'active',
        fileUtils: 'active'
      },
      yjsServerConnected: !!this.yjsDocumentSync.yjsServer,
      supportedFileTypes: this.SUPPORTED_TYPES.length,
      activeUploadSessions: this.uploadHandler.uploadSessions.size
    };
  }
}

// Create and export singleton instance
module.exports = new PureYjsFileStorageService();
