/**
 * File Controller
 * Handles file-related HTTP requests and responses
 */

const fileStorageService = require("../services/fileStorageService");
const accessService = require("../services/accessService");
const { asyncHandler } = require("../middleware/errorHandler");

class FileController {

  /**
   * Get file content
   */
  getFile = asyncHandler(async (req, res) => {
    const { path: filePath, sessionId } = req.query;

    if (!filePath || !sessionId) {
      return res.status(400).json({ error: "File path and session ID are required" });
    }

    const decodedPath = decodeURIComponent(filePath);
    const file = await fileStorageService.getFile(sessionId, decodedPath);
    
    res.set({
      'Content-Type': file.mimeType || 'text/plain',
      'Content-Length': file.content.length,
      'Cache-Control': 'no-cache'
    });
    
    res.send(file.content);
  });

  /**
   * Get files by session
   */
  getSessionFiles = asyncHandler(async (req, res) => {
    const sessionId = req.query.session;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const files = await fileStorageService.getSessionFiles(sessionId);
    
    // Transform to match frontend expectations
    const transformedFiles = files.map(file => ({
      name: file.fileName,
      type: file.fileType.replace('.', ''),
      path: file.filePath,
      size: file.fileSize
    }));

    res.json(transformedFiles);
  });

  /**
   * Get file hierarchy
   */
  getFileHierarchy = asyncHandler(async (req, res) => {
    const sessionId = req.query.session;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const hierarchy = await fileStorageService.getFileHierarchy(sessionId);
    res.json(hierarchy);
  });

  /**
   * Delete file
   */
  deleteFile = asyncHandler(async (req, res) => {
    const { path: filePath, sessionId } = req.body;
    
    if (!filePath || !sessionId) {
      return res.status(400).json({ error: "File path and session ID are required" });
    }

    const deleted = await fileStorageService.deleteFile(sessionId, filePath);
    
    if (!deleted) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({ message: "File deleted successfully", deletedPath: filePath });
  });

  /**
   * Upload file
   */
  uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { sessionID, email } = req.body;

    // Validate session access
    const hasAccess = await accessService.checkSessionAccess(sessionID, email);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to session" });
    }

    // Process file upload
    const result = await this.processFileUpload(req.file, sessionID);
    
    res.json(result);
  });

  /**
   * Process file upload (helper method)
   */
  async processFileUpload(file, sessionID) {
    const fileExt = require('path').extname(file.originalname).toLowerCase();
    
    if (fileExt === ".zip") {
      // Handle ZIP file extraction
      return await this.handleZipFile(file, sessionID);
    } else {
      // Handle regular file
      const fileResult = await fileStorageService.saveFile(
        sessionID,
        file.originalname,
        file.buffer,
        file.mimetype || 'application/octet-stream'
      );

      return {
        message: "File uploaded successfully",
        sessionID,
        fileName: file.originalname,
        filePath: file.originalname,
        fileSize: file.size,
        fileId: fileResult._id
      };
    }
  }

  /**
   * Handle ZIP file extraction
   */
  async handleZipFile(zipFile, sessionID) {
    const unzipper = require("unzipper");
    const { Readable } = require("stream");
    
    const extractedFiles = [];
    const stream = Readable.from(zipFile.buffer);
    
    return new Promise((resolve, reject) => {
      stream
        .pipe(unzipper.Parse())
        .on('entry', async (entry) => {
          const fileName = entry.path;
          const type = entry.type;
          
          if (type === 'File' && !fileName.startsWith('__MACOSX/')) {
            try {
              const chunks = [];
              entry.on('data', (chunk) => chunks.push(chunk));
              entry.on('end', async () => {
                const buffer = Buffer.concat(chunks);
                
                const result = await fileStorageService.saveFile(
                  sessionID,
                  fileName,
                  buffer,
                  'application/octet-stream'
                );
                
                extractedFiles.push({
                  name: fileName,
                  path: fileName,
                  size: buffer.length,
                  fileId: result._id
                });
              });
            } catch (error) {
              console.error(`Error processing ${fileName}:`, error);
            }
          } else {
            entry.autodrain();
          }
        })
        .on('close', () => {
          resolve({
            message: "ZIP file extracted successfully",
            sessionID,
            extractedFiles,
            totalFiles: extractedFiles.length
          });
        })
        .on('error', reject);
    });
  }
}

module.exports = FileController;
