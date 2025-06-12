/**
 * Unified File Management Routes
 * Consolidates all file operations into a single, well-organized route file
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const { asyncHandler } = require("../middleware/errorHandler");
const { requireAuth } = require("../middleware/cognitoAuth");
const accessService = require("../services/accessService");
const fileStorageService = require("../services/fileStorageService");

const router = express.Router();

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

module.exports = (yjsServer) => {
  // Set Y-WebSocket server for real-time collaboration
  if (yjsServer) {
    fileStorageService.setYjsServer(yjsServer);
  }

  // ==================== FILE UPLOAD OPERATIONS ====================

  /**
   * Upload a file (single or ZIP)
   * POST /api/files/upload
   */
  router.post("/upload", upload.single("file"), asyncHandler(async (req, res) => {
    // Comprehensive input validation
    if (!req.file) {
      return res.status(400).json({ 
        error: "No file uploaded",
        hint: "Please select a file to upload"
      });
    }

    const { sessionID, email } = req.body;
    
    // Validate required fields
    if (!sessionID) {
      return res.status(400).json({ 
        error: "Session ID is required",
        hint: "Please provide a valid session ID"
      });
    }
    
    if (!email) {
      return res.status(400).json({ 
        error: "User email is required",
        hint: "Please provide a valid email address"
      });
    }

    // File validation
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const allowedExtensions = [".js", ".java", ".py", ".zip"];
    
    if (!allowedExtensions.includes(fileExt)) {
      return res.status(400).json({ 
        error: `Unsupported file type: ${fileExt}`,
        supportedTypes: allowedExtensions,
        fileName: req.file.originalname
      });
    }

    // Check file size
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    if (req.file.size > maxFileSize) {
      return res.status(400).json({
        error: `File too large: ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`,
        hint: `Maximum file size is ${maxFileSize / (1024 * 1024)}MB`,
        fileName: req.file.originalname
      });
    }

    console.log(`📤 [UPLOAD ROUTE] Processing upload:`, {
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / 1024).toFixed(2)}KB`,
      sessionID,
      email,
      fileType: fileExt,
      timestamp: new Date().toISOString()
    });

    // Validate session access (editor permission required)
    try {
      const hasAccess = await accessService.checkSessionAccess(sessionID, email, 'editor');
      if (!hasAccess) {
        return res.status(403).json({ 
          error: "Access denied: User needs editor permission to upload files to this session",
          hint: "Contact the session owner to get editor access"
        });
      }

      console.log(`✅ [UPLOAD ROUTE] Session access validated for user ${email} in session ${sessionID}`);
    } catch (error) {
      console.error("Session validation error:", error);
      return res.status(500).json({ 
        error: "Failed to validate session access", 
        details: error.message,
        hint: "Please try again or contact support if the issue persists"
      });
    }

    try {
      let result;

      if (fileExt === ".zip") {
        // Handle ZIP file with Y-WebSocket processing
        console.log(`📦 Starting ZIP upload for ${req.file.originalname}...`);
        
        if (!yjsServer) {
          return res.status(503).json({
            error: "Y-WebSocket server unavailable",
            hint: "Real-time collaboration service is not available",
            fileName: req.file.originalname
          });
        }
        
        // Notify Y-WebSocket clients about upload start
        yjsServer.broadcastToRoom(sessionID, {
          type: 'zipUploadStarted',
          sessionID, 
          fileName: req.file.originalname,
          fileSize: req.file.size,
          message: "ZIP file processing started..." 
        });

        result = await fileStorageService.uploadZipFile(sessionID, req.file, email);
        
        // Notify Y-WebSocket rooms about new files
        if (result.files) {
          result.files.forEach(file => {
            const roomName = `${sessionID}-${file.name}`;
            yjsServer.broadcastToRoom(roomName, {
              type: 'file-uploaded',
              sessionID,
              file,
              message: `New file available for collaboration: ${file.name}`
            });
          });
        }

        // Notify Y-WebSocket clients about upload completion
        yjsServer.broadcastToRoom(sessionID, {
          type: 'zipUploadComplete',
          sessionID,
          files: result.files || result,
          totalFiles: result.totalFiles || result.length,
          message: `ZIP upload complete: ${result.totalFiles || result.length} files added`
        });

      } else {
        // Handle single file with Y-WebSocket processing
        if (!yjsServer) {
          return res.status(503).json({
            error: "Y-WebSocket server unavailable",
            hint: "Real-time collaboration service is not available",
            fileName: req.file.originalname
          });
        }

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
        
        // Format response for consistency
        result = {
          success: true,
          files: [result.file],
          message: "File uploaded and ready for collaboration"
        };

        // Notify Y-WebSocket room about new file
        const roomName = `${sessionID}-${req.file.originalname}`;
        yjsServer.broadcastToRoom(roomName, {
          type: 'file-uploaded',
          sessionID,
          file: result.files[0],
          message: `File ready for collaborative editing: ${req.file.originalname}`
        });

        // Notify Y-WebSocket clients about single file upload
        yjsServer.broadcastToRoom(sessionID, {
          type: 'fileUploaded',
          sessionId: sessionID,
          files: result.files,
          action: "single_upload"
        });
      }

      console.log(`✅ Upload completed: ${req.file.originalname}`);

      res.json({
        success: true,
        ...result,
        originalFileName: req.file.originalname
      });

    } catch (error) {
      console.error("File upload error:", error);
      
      res.status(500).json({ 
        error: "File upload failed", 
        details: error.message,
        fileName: req.file.originalname,
        hint: "Please try again or contact support if the issue persists"
      });
    }
  }));

  // ==================== FILE RETRIEVAL OPERATIONS ====================

  /**
   * Get file content
   * GET /api/files/content?path=...&sessionId=...
   */
  router.get("/content", requireAuth, asyncHandler(async (req, res) => {
    const { path: filePath, sessionId } = req.query;
    const userEmail = req.userEmail || req.user?.email;

    console.log(`📥 [FILE CONTENT] Fetching file content:`, {
      filePath,
      sessionId,
      userEmail,
      timestamp: new Date().toISOString()
    });

    if (!filePath || !sessionId) {
      console.log(`❌ [FILE CONTENT] Missing required parameters:`, { filePath, sessionId });
      return res.status(400).json({ error: "File path and session ID are required" });
    }

    try {
      const decodedPath = decodeURIComponent(filePath);
      console.log(`📂 [FILE CONTENT] Decoded file path: ${decodedPath}`);
      
      const file = await fileStorageService.getFile(sessionId, decodedPath);
      console.log(`✅ [FILE CONTENT] File retrieved successfully:`, {
        fileName: file.fileName,
        fileSize: file.content?.length || 0,
        mimeType: file.mimeType
      });
      
      res.set({
        'Content-Type': file.mimeType || 'text/plain',
        'Content-Length': file.content.length,
        'Cache-Control': 'no-cache'
      });
      
      res.send(file.content);
    } catch (error) {
      console.error(`❌ [FILE CONTENT] Failed to fetch file:`, {
        filePath,
        sessionId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }));

  /**
   * Get all files for a session
   * GET /api/files/session/:sessionId
   */
  router.get("/session/:sessionId", requireAuth, asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    console.log(`🔍 [FILES] GET /api/files/session/${sessionId} - Route handler started`);
    
    // Get authenticated user's email from middleware
    const email = req.userEmail || req.user?.email;
    
    console.log(`🔍 [FILES] User email from middleware: ${email}`);

    if (!email) {
      console.log(`🔍 [FILES] No email found, returning 401`);
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log(`🔍 [FILES] Calling accessService.checkSessionAccess with email: ${email}, sessionId: ${sessionId}`);
    
    // Check session access
    const hasAccess = await accessService.checkSessionAccess(sessionId, email, 'viewer');
    
    console.log(`🔍 [FILES] Access check result: ${hasAccess}`);
    
    if (!hasAccess) {
      console.log(`🔍 [FILES] Access denied, returning 403`);
      return res.status(403).json({ error: "Access denied to session" });
    }

    console.log(`🔍 [FILES] Access granted, fetching files...`);
    
    const files = await fileStorageService.getSessionFiles(sessionId);
    
    // Transform to match frontend expectations
    const transformedFiles = files.map(file => ({
      name: file.fileName,
      type: file.fileType.replace('.', ''),
      path: file.filePath,
      size: file.fileSize
    }));

    res.json({
      sessionId,
      files: transformedFiles,
      totalFiles: files.length
    });
  }));

  /**
   * Get file hierarchy for a session
   * GET /api/files/hierarchy/:sessionId
   */
  router.get("/hierarchy/:sessionId", asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const hierarchy = await fileStorageService.getFileHierarchy(sessionId);
    res.json(hierarchy);
  }));

  /**
   * Get storage statistics for a session
   * GET /api/files/stats/:sessionId
   */
  router.get("/stats/:sessionId", asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const stats = await fileStorageService.getStorageStats(sessionId);
    res.json(stats);
  }));

  // ==================== FILE DELETION OPERATIONS ====================

  /**
   * Delete file or folder
   * DELETE /api/files/:sessionId/:path
   */
  router.delete("/:sessionId/*", asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const filePath = req.params[0]; // Get the wildcard path
    const { userEmail } = req.body;
    
    if (!filePath || !sessionId) {
      return res.status(400).json({ error: "File path and session ID are required" });
    }

    // Get file info before deletion for notification
    let fileInfo = null;
    try {
      fileInfo = await fileStorageService.getFile(sessionId, filePath);
    } catch (err) {
      // File might not exist, continue with deletion attempt
      console.warn(`Could not get file info for ${filePath}:`, err.message);
    }

    const deleted = await fileStorageService.deleteFile(sessionId, filePath);
    
    if (!deleted) {
      return res.status(404).json({ error: "File not found" });
    }

    // Broadcast file deletion to all users in the session through Y-WebSocket
    if (yjsServer && fileInfo) {
      yjsServer.broadcastToRoom(sessionId, {
        type: 'file-deleted',
        sessionId,
        file: {
          name: fileInfo.fileName,
          path: filePath,
          type: fileInfo.fileType.replace('.', ''),
          size: fileInfo.fileSize
        },
        deletedBy: userEmail || 'Unknown user',
        message: `File "${fileInfo.fileName}" was deleted`
      });
    }

    res.json({ 
      success: true,
      message: "File deleted successfully", 
      deletedPath: filePath 
    });
  }));

  return router;
};
