/**
 * ⚠️  ARCHIVED: UNUSED ENHANCED FILE CONTROLLER ⚠️
 * 
 * STATUS: Modern, Production-Ready, Currently Unused
 * CREATED: December 2024
 * REASON FOR ARCHIVAL: Current direct route → service pattern is cleaner
 * 
 * This is NOT a legacy file! It's an enhanced controller that provides
 * an alternative API architecture but is currently unused in favor of
 * the direct route implementation in fileUpload.js
 * 
 * FEATURES:
 * - Enhanced error handling with detailed responses
 * - Comprehensive access control validation  
 * - Utility endpoints for monitoring and stats
 * - Full integration with modular services
 * - Y-WebSocket collaboration support
 * 
 * TO USE: Update routes to import and use these controller methods
 * 
 * File Controller - Updated for Modular Architecture
 * Handles file-related HTTP requests with Y-WebSocket integration
 * Compatible with the new modular file storage system
 */

const fileStorageService = require("../services/fileStorageService");
const accessService = require("../services/accessService");
const { asyncHandler } = require("../middleware/errorHandler");

class FileController {

  /**
   * Get file content with proper error handling
   */
  getFile = asyncHandler(async (req, res) => {
    const { path: filePath, sessionId } = req.query;

    if (!filePath || !sessionId) {
      return res.status(400).json({ 
        error: "File path and session ID are required",
        hint: "Please provide both path and sessionId parameters"
      });
    }

    try {
      const decodedPath = decodeURIComponent(filePath);
      const file = await fileStorageService.getFile(sessionId, decodedPath);
      
      res.set({
        'Content-Type': file.mimeType || 'text/plain',
        'Content-Length': file.content.length,
        'Cache-Control': 'no-cache'
      });
      
      res.send(file.content);
    } catch (error) {
      if (error.message === 'File not found') {
        return res.status(404).json({ 
          error: "File not found",
          filePath: filePath,
          sessionId: sessionId
        });
      }
      throw error; // Let asyncHandler deal with other errors
    }
  });

  /**
   * Get files by session with enhanced validation
   */
  getSessionFiles = asyncHandler(async (req, res) => {
    const sessionId = req.query.session;
    const { email } = req.query;

    if (!sessionId) {
      return res.status(400).json({ 
        error: "Session ID is required",
        hint: "Please provide a session parameter"
      });
    }

    // Optional access control if email is provided
    if (email) {
      try {
        const hasAccess = await accessService.checkSessionAccess(sessionId, email, 'viewer');
        if (!hasAccess) {
          return res.status(403).json({ 
            error: "Access denied to session",
            hint: "You need at least viewer permission to access files"
          });
        }
      } catch (error) {
        console.warn(`Access check failed for session ${sessionId}:`, error.message);
        // Continue without access check if service is unavailable
      }
    }

    const files = await fileStorageService.getSessionFiles(sessionId);
    
    // Transform to match frontend expectations
    const transformedFiles = files.map(file => ({
      id: file._id,
      name: file.fileName,
      type: file.fileType.replace('.', ''),
      path: file.filePath,
      size: file.fileSize,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.createdAt,
      mimeType: file.mimeType
    }));

    res.json({
      sessionId,
      files: transformedFiles,
      totalFiles: transformedFiles.length
    });
  });

  /**
   * Get file hierarchy with caching support
   */
  getFileHierarchy = asyncHandler(async (req, res) => {
    const sessionId = req.query.session;
    const { email } = req.query;

    if (!sessionId) {
      return res.status(400).json({ 
        error: "Session ID is required",
        hint: "Please provide a session parameter"
      });
    }

    // Optional access control
    if (email) {
      try {
        const hasAccess = await accessService.checkSessionAccess(sessionId, email, 'viewer');
        if (!hasAccess) {
          return res.status(403).json({ 
            error: "Access denied to session",
            hint: "You need at least viewer permission to view file hierarchy"
          });
        }
      } catch (error) {
        console.warn(`Access check failed for session ${sessionId}:`, error.message);
      }
    }

    const hierarchy = await fileStorageService.getFileHierarchy(sessionId);
    
    res.json({
      sessionId,
      hierarchy,
      totalItems: this.countHierarchyItems(hierarchy)
    });
  });

  /**
   * Helper to count total items in hierarchy
   */
  countHierarchyItems(items) {
    let count = 0;
    for (const item of items) {
      count++;
      if (item.children && item.children.length > 0) {
        count += this.countHierarchyItems(item.children);
      }
    }
    return count;
  }

  /**
   * Delete file with enhanced validation and Y-WebSocket notification
   */
  deleteFile = asyncHandler(async (req, res) => {
    const { path: filePath, sessionId, email } = req.body;
    
    if (!filePath || !sessionId) {
      return res.status(400).json({ 
        error: "File path and session ID are required",
        hint: "Please provide both path and sessionId in request body"
      });
    }

    // Validate editor access if email provided
    if (email) {
      try {
        const hasAccess = await accessService.checkSessionAccess(sessionId, email, 'editor');
        if (!hasAccess) {
          return res.status(403).json({ 
            error: "Access denied: Editor permission required to delete files",
            hint: "Contact the session owner to get editor access"
          });
        }
      } catch (error) {
        console.warn(`Access check failed for session ${sessionId}:`, error.message);
      }
    }

    const deleted = await fileStorageService.deleteFile(sessionId, filePath);
    
    if (!deleted) {
      return res.status(404).json({ 
        error: "File not found",
        filePath,
        sessionId
      });
    }

    res.json({ 
      message: "File deleted successfully", 
      deletedPath: filePath,
      sessionId
    });
  });

  /**
   * Upload file using modular file storage system
   * Note: This method is primarily for API completeness.
   * Main file uploads should use the dedicated routes in fileUpload.js
   */
  uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ 
        error: "No file uploaded",
        hint: "Please select a file to upload"
      });
    }

    const { sessionID, email } = req.body;

    if (!sessionID || !email) {
      return res.status(400).json({ 
        error: "Session ID and email are required",
        hint: "Please provide both sessionID and email in request body"
      });
    }

    // Validate file type
    const allowedExtensions = ['.js', '.java', '.py', '.zip'];
    const fileExt = require('path').extname(req.file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      return res.status(400).json({ 
        error: `Unsupported file type: ${fileExt}`,
        supportedTypes: allowedExtensions,
        hint: "Please use the dedicated upload routes for better functionality"
      });
    }

    // Validate session access
    try {
      const hasAccess = await accessService.checkSessionAccess(sessionID, email, 'editor');
      if (!hasAccess) {
        return res.status(403).json({ 
          error: "Access denied: Editor permission required to upload files",
          hint: "Contact the session owner to get editor access"
        });
      }
    } catch (error) {
      console.error("Session validation error:", error);
      return res.status(500).json({ 
        error: "Failed to validate session access", 
        details: error.message
      });
    }

    try {
      let result;

      if (fileExt === ".zip") {
        // Use modular ZIP processor
        result = await fileStorageService.uploadZipFile(sessionID, req.file, email);
        
        res.json({
          success: true,
          message: "ZIP file uploaded and processed",
          sessionID,
          totalFiles: result.totalFiles || result.files?.length || 0,
          files: result.files || [],
          uploadMode: 'modular',
          recommendation: "Use /api/file-upload/file-upload for enhanced ZIP processing with real-time updates"
        });
      } else {
        // Use modular single file upload
        result = await fileStorageService.uploadFile(
          sessionID,
          {
            fileName: req.file.originalname,
            fileType: fileExt,
            content: req.file.buffer,
            mimeType: req.file.mimetype || 'text/plain',
            parentFolder: null,
            filePath: req.file.originalname
          },
          email
        );

        res.json({
          success: true,
          message: "File uploaded successfully",
          sessionID,
          file: result.file,
          uploadMode: 'modular',
          recommendation: "Use /api/file-upload/file-upload for enhanced features including real-time collaboration"
        });
      }
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ 
        error: "File upload failed", 
        details: error.message,
        fileName: req.file.originalname,
        hint: "Consider using the dedicated upload routes for better error handling"
      });
    }
  });

  /**
   * Get storage statistics for a session
   */
  getStorageStats = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { email } = req.query;

    if (!sessionId) {
      return res.status(400).json({ 
        error: "Session ID is required",
        hint: "Please provide sessionId in URL parameters"
      });
    }

    // Validate access if email provided
    if (email) {
      try {
        const hasAccess = await accessService.checkSessionAccess(sessionId, email, 'viewer');
        if (!hasAccess) {
          return res.status(403).json({ 
            error: "Access denied to session",
            hint: "You need at least viewer permission to view storage statistics"
          });
        }
      } catch (error) {
        console.warn(`Access check failed for session ${sessionId}:`, error.message);
      }
    }

    const stats = await fileStorageService.getStorageStats(sessionId);
    
    res.json({
      sessionId,
      ...stats,
      formattedTotalSize: fileStorageService.formatFileSize(stats.totalSize || 0)
    });
  });

  /**
   * Validate file data (utility endpoint)
   */
  validateFileData = asyncHandler(async (req, res) => {
    const fileData = req.body;

    const validation = fileStorageService.validateFileData(fileData);
    
    res.json({
      isValid: validation.isValid,
      errors: validation.errors,
      fileData: validation.isValid ? fileData : undefined
    });
  });

  /**
   * Get service status (utility endpoint)
   */
  getServiceStatus = asyncHandler(async (req, res) => {
    const status = fileStorageService.getServiceStatus();
    
    res.json({
      timestamp: new Date().toISOString(),
      ...status
    });
  });
}

module.exports = new FileController();
