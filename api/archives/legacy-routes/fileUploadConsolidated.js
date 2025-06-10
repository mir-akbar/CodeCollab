/**
 * Consolidated File Upload Routes with Hybrid Y-WebSocket Integration
 * Combines the robust ZIP processing from fileUpload.js with Y-WebSocket integration
 * Single endpoint for both traditional and hybrid uploads
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

module.exports = (io, yjsServer) => {
  // Set Y-WebSocket server for hybrid functionality
  if (yjsServer) {
    fileStorageService.setYjsServer(yjsServer);
  }

  /**
   * Unified File Upload Endpoint
   * Handles both traditional Socket.IO and hybrid Y-WebSocket uploads
   */
  router.post("/file-upload", upload.single("file"), asyncHandler(async (req, res) => {
    // Comprehensive input validation
    if (!req.file) {
      return res.status(400).json({ 
        error: "No file uploaded",
        hint: "Please select a file to upload"
      });
    }

    const { sessionID, email, mode = 'traditional' } = req.body;
    
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

    console.log(`📤 Processing ${mode} upload: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)}KB) for session ${sessionID}`);

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
        // Handle ZIP file with progress tracking
        console.log(`📦 Starting ZIP upload for ${req.file.originalname}...`);
        
        // Emit initial upload event
        io.emit("zipUploadStarted", { 
          sessionID, 
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mode,
          message: "ZIP file processing started..." 
        });

        if (mode === 'hybrid' && yjsServer) {
          // Use Y-WebSocket enhanced ZIP processing
          result = await fileStorageService.uploadZipFile(sessionID, req.file, email);
        } else {
          // Use traditional ZIP processing with detailed progress
          result = await handleZipFileTraditional(req.file, sessionID, io, email);
        }

        // Emit completion events
        io.emit("zipUploadComplete", {
          sessionID,
          files: result.files || result,
          totalFiles: result.totalFiles || result.length,
          mode,
          message: `ZIP upload complete: ${result.totalFiles || result.length} files added`
        });

      } else {
        // Handle single file
        if (mode === 'hybrid' && yjsServer) {
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
            message: "File uploaded successfully",
            mode: 'hybrid'
          };
        } else {
          // Use traditional single file upload
          const savedFile = await fileStorageService.storeFile({
            sessionId: sessionID,
            fileName: req.file.originalname,
            fileType: fileExt,
            content: req.file.buffer,
            mimeType: req.file.mimetype || 'text/plain',
            parentFolder: null,
            filePath: req.file.originalname,
            uploadedBy: email
          });

          result = {
            success: true,
            files: [{
              id: savedFile._id.toString(),
              name: savedFile.fileName,
              type: savedFile.fileType.replace('.', ''),
              path: savedFile.filePath,
              size: savedFile.fileSize,
              uploadedBy: email
            }],
            sessionID,
            mode: 'traditional',
            message: "File uploaded successfully"
          };
        }

        // Emit file uploaded events
        io.emit("fileUploaded", result);
        io.to(sessionID).emit("filesChanged", { 
          sessionId: sessionID, 
          files: result.files,
          action: "single_upload",
          mode
        });
      }

      console.log(`✅ Upload completed: ${req.file.originalname} (${mode} mode)`);

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

  /**
   * Traditional ZIP processing with detailed progress tracking
   * Maintains compatibility with existing frontend components
   */
  async function handleZipFileTraditional(zipFile, sessionID, io, uploaderEmail) {
    const unzipper = require("unzipper");
    const { Readable } = require("stream");
    
    const extractedFiles = [];
    const filePromises = [];
    let totalFiles = 0;
    let processedFiles = 0;
    
    console.log(`📦 Starting traditional ZIP extraction for session ${sessionID}`);
    
    return new Promise((resolve, reject) => {
      const readable = Readable.from(zipFile.buffer);
      
      readable
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          const fileName = entry.path;
          const fileExtension = path.extname(fileName).toLowerCase();
          
          // Skip system files
          if (fileStorageService.shouldIgnoreFile(fileName)) {
            console.log(`🚫 Skipping system file: ${fileName}`);
            entry.autodrain();
            return;
          }
          
          if (['.js', '.java', '.py'].includes(fileExtension)) {
            totalFiles++;
            console.log(`📄 Found valid file ${totalFiles}: ${fileName}`);
            
            const filePromise = new Promise((resolveFile, rejectFile) => {
              const chunks = [];
              
              entry.on('data', (chunk) => chunks.push(chunk));
              entry.on('end', async () => {
                try {
                  const content = Buffer.concat(chunks);
                  const parentFolder = path.dirname(fileName) !== '.' ? path.dirname(fileName) : null;
                  const baseFileName = path.basename(fileName);
                  const normalizedFilePath = fileName.replace(/\\/g, '/');
                  
                  console.log(`💾 Storing file: ${baseFileName} (${content.length} bytes)`);
                  
                  const savedFile = await fileStorageService.storeFile({
                    sessionId: sessionID,
                    fileName: baseFileName,
                    fileType: fileExtension,
                    content,
                    mimeType: 'text/plain',
                    parentFolder,
                    filePath: normalizedFilePath,
                    uploadedBy: uploaderEmail
                  });
                  
                  const fileInfo = {
                    id: savedFile._id.toString(),
                    name: savedFile.fileName,
                    type: savedFile.fileType.replace('.', ''),
                    path: savedFile.filePath,
                    size: savedFile.fileSize,
                    uploadedBy: uploaderEmail
                  };
                  
                  extractedFiles.push(fileInfo);
                  processedFiles++;
                  
                  console.log(`✅ File stored successfully: ${baseFileName} (${processedFiles}/${totalFiles})`);
                  
                  // Emit progress update for each file processed
                  io.emit("zipFileProcessed", { 
                    sessionID, 
                    file: fileInfo,
                    processedFiles, 
                    totalFiles,
                    message: `Processed ${processedFiles}/${totalFiles} files` 
                  });
                  
                  resolveFile(fileInfo);
                  
                } catch (error) {
                  const baseFileName = path.basename(fileName);
                  console.error(`❌ Error storing extracted file ${baseFileName}:`, error);
                  rejectFile({
                    fileName: baseFileName,
                    error: error.message,
                    details: error
                  });
                }
              });
              
              entry.on('error', (error) => {
                console.error(`❌ Error reading file ${fileName}:`, error);
                rejectFile({
                  fileName: path.basename(fileName),
                  error: error.message,
                  details: error
                });
              });
            });
            
            filePromises.push(filePromise);
          } else {
            entry.autodrain();
          }
        })
        .on('close', async () => {
          try {
            console.log(`📥 ZIP parsing complete. Processing ${filePromises.length} files...`);
            
            // Emit initial progress update with total files found
            io.emit("zipProgress", { 
              sessionID, 
              totalFiles: filePromises.length,
              message: `ZIP parsing complete. Processing ${filePromises.length} files...` 
            });
            
            // Process files with error recovery
            const results = await Promise.allSettled(filePromises);
            
            // Separate successful and failed uploads
            const successfulFiles = [];
            const failedFiles = [];
            
            results.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                successfulFiles.push(result.value);
              } else {
                failedFiles.push({
                  fileName: `file_${index}`,
                  error: result.reason?.message || 'Unknown error'
                });
                console.error(`❌ Failed to process file ${index}:`, result.reason);
              }
            });
            
            console.log(`🎉 ZIP processing complete: ${successfulFiles.length} successful, ${failedFiles.length} failed`);
            
            // Get the complete updated file list for the session
            const allSessionFiles = await fileStorageService.getSessionFiles(sessionID);
            const transformedFiles = allSessionFiles.map(file => ({
              name: file.fileName,
              type: file.fileType.replace('.', ''),
              path: file.filePath,
              size: file.fileSize
            }));
            
            // Emit completion events
            const completionMessage = failedFiles.length > 0 
              ? `ZIP extraction complete! ${successfulFiles.length} files added, ${failedFiles.length} failed.`
              : `ZIP extraction complete! ${successfulFiles.length} files added.`;
              
            io.emit("zipExtractionComplete", { 
              sessionID, 
              totalFiles: successfulFiles.length,
              files: successfulFiles,
              failedFiles: failedFiles,
              message: completionMessage
            });
            
            // Emit session update with all files
            io.emit("sessionFilesUpdated", { 
              sessionID, 
              files: transformedFiles,
              message: `Session updated: ${transformedFiles.length} total files`
            });
            
            resolve(successfulFiles);
          } catch (error) {
            console.error('❌ Error processing ZIP files:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ ZIP parsing error:', error);
          reject(error);
        });
    });
  }

  return router;
};
