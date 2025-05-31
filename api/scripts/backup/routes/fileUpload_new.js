const express = require("express");
const multer = require("multer");
const path = require("path");
const unzipper = require("unzipper");
const cors = require("cors");
const { Readable } = require("stream");
const fileStorageService = require("../services/fileStorageService");

const router = express.Router();
const SessionManagement = require("../models/SessionManagement");

router.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

// Use memory storage for processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

module.exports = (io) => {
  router.post("/file-upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { sessionID, email } = req.body;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const allowedExtensions = [".js", ".java", ".py"];

    console.log("sessionID ===", sessionID);

    try {
      let fileResponse;

      if (fileExt === ".zip") {
        // Handle ZIP file extraction
        const extractedFiles = await handleZipFile(req.file, sessionID);
        
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

        console.log("✅ ZIP file updated in MongoDB.");

        fileResponse = {
          message: "ZIP file uploaded and extracted successfully",
          files: extractedFiles,
          sessionID
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
      io.emit("fileUploaded", fileResponse);

    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ 
        error: "File processing failed", 
        details: error.message 
      });
    }
  });

  async function handleZipFile(zipFile, sessionID) {
    const extractedFiles = [];
    
    return new Promise((resolve, reject) => {
      const readable = Readable.from(zipFile.buffer);
      
      readable
        .pipe(unzipper.Parse())
        .on('entry', async (entry) => {
          const fileName = entry.path;
          const fileExtension = path.extname(fileName).toLowerCase();
          
          if (['.js', '.java', '.py'].includes(fileExtension)) {
            const chunks = [];
            
            entry.on('data', (chunk) => chunks.push(chunk));
            entry.on('end', async () => {
              try {
                const content = Buffer.concat(chunks);
                const parentFolder = path.dirname(fileName) !== '.' ? path.dirname(fileName) : null;
                
                const savedFile = await fileStorageService.storeFile({
                  sessionId: sessionID,
                  fileName: path.basename(fileName),
                  fileType: fileExtension,
                  content,
                  mimeType: 'text/plain',
                  parentFolder,
                  filePath: fileName
                });
                
                extractedFiles.push({
                  name: savedFile.fileName,
                  type: savedFile.fileType.replace('.', ''),
                  path: savedFile.filePath,
                  size: savedFile.fileSize
                });
              } catch (error) {
                console.error('Error storing extracted file:', error);
              }
            });
          } else {
            entry.autodrain();
          }
        })
        .on('close', () => resolve(extractedFiles))
        .on('error', reject);
    });
  }

  return router;
};
