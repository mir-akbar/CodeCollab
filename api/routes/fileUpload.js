const express = require("express");
const multer = require("multer");
const path = require("path");
const unzipper = require("unzipper");
const cors = require("cors");
const { Readable } = require("stream");
const { Buffer } = require("buffer");
const fileStorageService = require("../services/fileStorageService");

const router = express.Router();
const SessionManagement = require("../models/SessionManagement");
const SessionService = require("../services/sessionService");

// Initialize session service
const sessionService = new SessionService();

router.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

// Use memory storage for processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Helper: Get file/folder hierarchy (updated for MongoDB)
const getFileHierarchy = async (sessionId) => {
  return await fileStorageService.getFileHierarchy(sessionId);
};

module.exports = (io) => {
  router.post("/file-upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { sessionID, email } = req.body;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const allowedExtensions = [".js", ".java", ".py"];

    console.log("sessionID ===", sessionID);

    // Validate session access
    if (!email) {
      return res.status(400).json({ error: "User email is required" });
    }

    try {
      const accessInfo = await sessionService.checkSessionAccess(sessionID, email);
      if (!accessInfo.hasAccess) {
        return res.status(403).json({ 
          error: "Access denied: User does not have access to this session" 
        });
      }

      // Check if user has upload permissions (edit access)
      if (accessInfo.access !== 'edit') {
        return res.status(403).json({ 
          error: "Access denied: User does not have upload permissions for this session" 
        });
      }

      console.log(`✅ Session access validated for user ${email} in session ${sessionID}`);
      
      // Update user activity
      sessionService.updateLastActive(sessionID, email);

    } catch (error) {
      console.error("Session validation error:", error);
      return res.status(500).json({ 
        error: "Failed to validate session access", 
        details: error.message 
      });
    }

    try {
      let fileResponse;

      if (fileExt === ".zip") {
        // Handle ZIP file extraction with progressive updates
        console.log(`📦 Starting ZIP extraction for ${req.file.originalname}...`);
        
        // Emit initial upload event
        io.emit("zipUploadStarted", { 
          sessionID, 
          fileName: req.file.originalname,
          message: "ZIP file processing started..." 
        });
        
        const extractedFiles = await handleZipFile(req.file, sessionID, io);
        
        // Update MongoDB session record
        await SessionManagement.findOneAndUpdate(
          { email, session_id: sessionID },
          {
            $set: {
              file_name: req.file.originalname,
              file_path: `mongodb://${sessionID}` // Indicate MongoDB storage
            }
          },
          { upsert: true, new: true }
        );

        console.log(`✅ ZIP file extraction completed: ${extractedFiles.length} files processed`);

        fileResponse = {
          message: "ZIP file uploaded and extracted successfully",
          files: extractedFiles,
          sessionID,
          totalFiles: extractedFiles.length
        };

      } else if (allowedExtensions.includes(fileExt)) {
        // Handle individual file
        const savedFile = await fileStorageService.storeFile({
          sessionId: sessionID,
          fileName: req.file.originalname,
          fileType: fileExt,
          content: req.file.buffer,
          mimeType: req.file.mimetype,
          parentFolder: null,
          filePath: req.file.originalname
        });

        // Update MongoDB session record
        await SessionManagement.findOneAndUpdate(
          { email, session_id: sessionID },
          {
            $set: {
              file_name: req.file.originalname,
              file_path: `mongodb://${sessionID}` // Indicate MongoDB storage
            }
          },
          { upsert: true, new: true }
        );

        console.log("✅ Single file updated in MongoDB.");

        fileResponse = {
          message: "File uploaded successfully",
          files: [
            {
              name: savedFile.fileName,
              type: savedFile.fileType.replace('.', ''),
              path: savedFile.filePath,
              size: savedFile.fileSize
            }
          ],
          sessionID
        };

      } else {
        return res.status(400).json({ error: "Unsupported file type" });
      }

      res.json(fileResponse);
      
      // Emit socket events for real-time updates
      console.log(`📡 Emitting final socket events for session ${sessionID}`);
      
      if (fileExt === ".zip") {
        // For ZIP files, the comprehensive events are already emitted in handleZipFile
        // Just emit a final confirmation
        io.emit("zipUploadComplete", {
          ...fileResponse,
          message: `ZIP upload complete: ${fileResponse.files.length} files added`
        });
        
      } else {
        // For single files, emit standard events
        io.emit("fileUploaded", fileResponse);
        
        // Also emit to session-specific room for any listeners
        io.to(sessionID).emit("filesChanged", { 
          sessionId: sessionID, 
          files: fileResponse.files,
          action: "single_upload"
        });
      }
      
      console.log(`✅ Socket events emitted successfully for session ${sessionID}`);

    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ 
        error: "File processing failed", 
        details: error.message 
      });
    }
  });

  // Helper function to check if file should be ignored
  function shouldIgnoreFile(filePath) {
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);
    
    // Ignore macOS system files
    if (fileName.startsWith('._') || fileName === '.DS_Store') {
      return true;
    }
    
    // Ignore __MACOSX directory and its contents
    if (dirName.includes('__MACOSX') || filePath.includes('__MACOSX/')) {
      return true;
    }
    
    // Ignore other common system/hidden files
    const ignoredPatterns = [
      '.git/', 'node_modules/', '.vscode/', '.idea/',
      'Thumbs.db', 'desktop.ini', '.env', '.env.local'
    ];
    
    return ignoredPatterns.some(pattern => 
      filePath.includes(pattern) || fileName === pattern.replace('/', '')
    );
  }

  async function handleZipFile(zipFile, sessionID, io) {
    const extractedFiles = [];
    const filePromises = [];
    let totalFiles = 0;
    let processedFiles = 0;
    
    console.log(`📦 Starting ZIP extraction for session ${sessionID}`);
    
    return new Promise((resolve, reject) => {
      const readable = Readable.from(zipFile.buffer);
      
      readable
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          const fileName = entry.path;
          const fileExtension = path.extname(fileName).toLowerCase();
          
          // Skip unwanted system files
          if (shouldIgnoreFile(fileName)) {
            console.log(`🚫 Skipping system file: ${fileName}`);
            entry.autodrain();
            return;
          }
          
          if (['.js', '.java', '.py'].includes(fileExtension)) {
            totalFiles++;
            console.log(`📄 Found valid file ${totalFiles}: ${fileName}`);
            
            // Create a promise for each file processing
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
                    filePath: normalizedFilePath
                  });
                  
                  const fileInfo = {
                    name: savedFile.fileName,
                    type: savedFile.fileType.replace('.', ''),
                    path: savedFile.filePath,
                    size: savedFile.fileSize
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
                  rejectFile(error);
                }
              });
              
              entry.on('error', (error) => {
                console.error(`❌ Error reading file ${fileName}:`, error);
                rejectFile(error);
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
            
            // Wait for all files to be processed
            await Promise.all(filePromises);
            
            console.log(`🎉 All ${extractedFiles.length} files processed successfully!`);
            
            // Get the complete updated file list for the session
            const allSessionFiles = await fileStorageService.getSessionFiles(sessionID);
            const transformedFiles = allSessionFiles.map(file => ({
              name: file.fileName,
              type: file.fileType.replace('.', ''),
              path: file.filePath,
              size: file.fileSize
            }));
            
            // Emit completion event with comprehensive file list
            io.emit("zipExtractionComplete", { 
              sessionID, 
              totalFiles: extractedFiles.length,
              files: extractedFiles,
              message: `ZIP extraction complete! ${extractedFiles.length} files added.` 
            });
            
            // Emit session update with all files (most important for sidebar)
            io.emit("sessionFilesUpdated", { 
              sessionID, 
              files: transformedFiles,
              message: `Session updated: ${transformedFiles.length} total files`
            });
            
            resolve(extractedFiles);
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
