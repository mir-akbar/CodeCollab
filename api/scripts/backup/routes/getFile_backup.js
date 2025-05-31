const express = require("express");
const path = require("path");
const fs = require("fs");
const SessionManagement = require("../models/SessionManagement");
const SessionManagementFiles = require("../models/SessionManagementFiles");

module.exports = function (io) {
  const router = express.Router();

router.get("/get-file", (req, res) => {
  let filePath = req.query.path;

  if (!filePath) {
    return res.status(400).json({ error: "File path is required" });
  }

  filePath = decodeURIComponent(filePath).replace(/\\/g, "/");
  const fullPath = path.join(__dirname, "../", filePath);

  fs.access(fullPath, fs.constants.R_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: "File not found or not accessible" });
    }

    fs.readFile(fullPath, "utf8", (err, data) => {
      if (err) {
        return res.status(500).json({ error: "Error reading file" });
      }

      res.send(data);
    });
  });
});




  // Fetch first file for a session
router.get("/by-session", async (req, res) => {
  const sessionId = req.query.session;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  try {
    const sessionDir = path.join(__dirname, "..", "uploads", "extracted", sessionId);

    if (!fs.existsSync(sessionDir)) {
      return res.json([]); // Session folder not found
    }

    const files = fs.readdirSync(sessionDir).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === ".js" || ext === ".java" || ext === ".py";
    });

    if (files.length === 0) {
      return res.json([]);
    }

    // Return only the first file (as per original logic)
    const firstFile = files[0];

    const filePath = `/uploads/extracted/${sessionId}/${firstFile}`;
    const fileType = path.extname(firstFile).replace(".", ""); // e.g., "js"

    res.json([{
      name: firstFile,
      type: fileType,
      path: filePath
    }]);
  } catch (err) {
    console.error("Error reading session files:", err);
    res.status(500).json({ error: "File system error", details: err });
  }
});

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

  // Delete file or folder
  router.delete("/delete-file", (req, res) => {
  const filePath = req.body.path;
  if (!filePath) {
    return res.status(400).json({ error: "File path is required" });
  }

  const fullPath = path.join(__dirname, "../", filePath);
  const normalizedPath = path.normalize(fullPath);

  if (!fs.existsSync(normalizedPath)) {
    return res.status(404).json({ error: `File not found: ${normalizedPath}` });
  }

  try {
    const stats = fs.statSync(normalizedPath);
    const parentFolder = path.dirname(normalizedPath);

    if (stats.isDirectory()) {
      fs.rmSync(normalizedPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(normalizedPath);
    }

    const updatedFiles = getFileHierarchy(parentFolder);

    res.json({ message: "Deleted successfully", deletedPath: filePath, updatedFiles });

    io.emit("fileDeleted", { deletedFile: filePath });
    io.emit("fileUpdated", { parentFolder, files: updatedFiles });

  } catch (error) {
    console.error("Error deleting:", error);
    res.status(500).json({ error: "Failed to delete" });
  }
});


  return router;
};
