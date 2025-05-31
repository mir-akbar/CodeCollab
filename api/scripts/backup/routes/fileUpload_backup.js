const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
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

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Helper: Get file/folder hierarchy
const getFileHierarchy = (dir) => {
  const items = fs.readdirSync(dir);
  const folders = [];
  const files = [];

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const isDirectory = fs.lstatSync(fullPath).isDirectory();

    if (isDirectory) {
      folders.push({
        name: item,
        type: "folder",
        children: getFileHierarchy(fullPath),
      });
    } else {
      files.push({
        name: item,
        type: "file",
        path: fullPath.replace(path.resolve(__dirname, "../uploads/extracted"), "/uploads/extracted"),
      });
    }
  }

  return [...folders, ...files];
};

module.exports = (io) => {
  router.post("/file-upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { sessionID, email } = req.body;
  const filePath = req.file.path;
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  const allowedExtensions = [".js", ".java", ".py"];
  const extractBasePath = path.join(__dirname, "../uploads/extracted", sessionID);
  console.log("sessionID ===", sessionID);

  try {
    if (!fs.existsSync(extractBasePath)) {
      fs.mkdirSync(extractBasePath, { recursive: true });
    }

    let fileResponse;

    if (fileExt === ".zip") {
      const extractPath = path.join(extractBasePath, path.parse(req.file.originalname).name);

      if (!fs.existsSync(extractPath)) {
        fs.mkdirSync(extractPath, { recursive: true });
      }

      await fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .promise();

      fs.unlinkSync(filePath);

      const extractedFiles = getFileHierarchy(extractPath);

      // Update MongoDB
      await SessionManagement.findOneAndUpdate(
        { email, session_id: sessionID },
        {
          $set: {
            file_name: req.file.originalname,
            file_path: extractPath.replace(path.resolve(__dirname, "../uploads/extracted"), "/uploads/extracted")
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
      const newFilePath = path.join(extractBasePath, req.file.originalname);

      fs.renameSync(filePath, newFilePath);

      const relativePath = newFilePath.replace(path.resolve(__dirname, "../uploads/extracted"), "/uploads/extracted");

      // Update MongoDB
      await SessionManagement.findOneAndUpdate(
        { email, session_id: sessionID },
        {
          $set: {
            file_name: req.file.originalname,
            file_path: relativePath
          }
        },
        { upsert: true, new: true }
      );

      console.log("✅ Single file updated in MongoDB.");

      fileResponse = {
        message: "File uploaded successfully",
        files: [
          {
            name: req.file.originalname,
            type: "file",
            path: relativePath
          }
        ],
        sessionID
      };

    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: "Unsupported file type" });
    }

    res.json(fileResponse);
    io.emit("fileUploaded", fileResponse);

  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: "File processing failed" });
  }
});

  // router.post("/get-uploaded-files", (req, res) => {
  //   const { sessionID } = req.body;
  //   console.log(req.body);
  
  //   if (!sessionID) {
  //     return res.status(400).json({ error: "Missing sessionID or email" });
  //   }
  
  //   const selectQuery = "SELECT * FROM uploaded_files WHERE session_id = ? ORDER BY id ASC LIMIT 1";
  
  //   db.query(selectQuery, [sessionID], (err, results) => {
  //     if (err) {
  //       console.error("Error fetching uploaded files:", err);
  //       return res.status(500).json({ error: "Failed to fetch uploaded files" });
  //     }
  
  //     res.status(200).json({ files: results, sessionID });
  //   });
  // });
  

  return router;
};
