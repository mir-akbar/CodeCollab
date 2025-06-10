/**
 * Pure Y-WebSocket File Upload Routes
 * Handles all file uploads through Y-WebSocket for real-time collaboration
 * No traditional fallback - requires Y-WebSocket server for operation
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { asyncHandler } = require("../middleware/errorHandler");
const accessService = require("../services/accessService");
const fileStorageService = require("../services/fileStorageService");

const router = express.Router();

// CORS configuration
router.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

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

  /**
   * Pure Y-WebSocket File Upload Endpoint
   * Requires Y-WebSocket server for real-time collaboration features
   */
  router.post("/file-upload", upload.single("file"), asyncHandler(async (req, res) => {
    // Comprehensive input validation
    if (!req.file) {
      return res.status(400).json({ 
        error: "No file uploaded",
        hint: "Please select a file to upload"
      });
    }

    const { sessionID, email } = req.body;
    const mode = 'hybrid'; // Pure Y-WebSocket mode only
    
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

    console.log(`📤 Processing Y-WebSocket upload: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)}KB) for session ${sessionID}`);

    // Validate session access (editor permission required)
    try {
      const hasAccess = await accessService.checkSessionAccess(sessionID, email, 'editor');
      if (!hasAccess) {
        return res.status(403).json({ 
          error: "Access denied: User needs editor permission to upload files to this session",
          hint: "Contact the session owner to get editor access"
        });
      }

      console.log(`✅ Session access validated for user ${email} in session ${sessionID}`);
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
        console.log(`📦 Starting Y-WebSocket ZIP upload for ${req.file.originalname}...`);
        
        if (!yjsServer) {
          return res.status(503).json({
            error: "Y-WebSocket server unavailable",
            hint: "Real-time collaboration service is not available",
            fileName: req.file.originalname
          });
        }
        
        // Notify Y-WebSocket clients about upload start
        if (yjsServer) {
          yjsServer.broadcastToSession(sessionID, {
            type: 'zipUploadStarted',
            sessionID, 
            fileName: req.file.originalname,
            fileSize: req.file.size,
            message: "ZIP file processing started..." 
          });
        }

        // Use Y-WebSocket enhanced ZIP processing
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
        if (yjsServer) {
          yjsServer.broadcastToSession(sessionID, {
            type: 'zipUploadComplete',
            sessionID,
            files: result.files || result,
            totalFiles: result.totalFiles || result.length,
            message: `ZIP upload complete: ${result.totalFiles || result.length} files added`
          });
        }

      } else {
        // Handle single file with Y-WebSocket processing
        if (!yjsServer) {
          return res.status(503).json({
            error: "Y-WebSocket server unavailable",
            hint: "Real-time collaboration service is not available",
            fileName: req.file.originalname
          });
        }

        // Use Y-WebSocket enhanced single file upload
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
          message: "File uploaded and ready for collaboration",
          mode: 'hybrid'
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
        if (yjsServer) {
          yjsServer.broadcastToSession(sessionID, {
            type: 'fileUploaded',
            sessionId: sessionID,
            files: result.files,
            action: "single_upload"
          });
        }
      }

      console.log(`✅ Upload completed: ${req.file.originalname} (Y-WebSocket mode)`);

      // Send unified response
      res.json({
        success: true,
        ...result,
        uploadMode: mode,
        originalFileName: req.file.originalname
      });

    } catch (error) {
      console.error("File upload error:", error);
      
      res.status(500).json({ 
        error: "File upload failed", 
        details: error.message,
        fileName: req.file.originalname,
        mode,
        hint: "Please try again or contact support if the issue persists"
      });
    }
  }));

  /**
   * Get session files with optional real-time data
   */
  router.get("/session-files/:sessionId", asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check session access
    const hasAccess = await accessService.checkSessionAccess(sessionId, email, 'viewer');
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to session" });
    }

    // Get files from MongoDB
    const files = await fileStorageService.getSessionFiles(sessionId);
    
    res.json({
      sessionId,
      files,
      totalFiles: files.length
    });
  }));

  return router;
};
