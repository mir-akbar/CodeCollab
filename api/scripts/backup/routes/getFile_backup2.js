const express = require("express");
const path = require("path");
const fileStorageService = require("../services/fileStorageService");
const SessionManagement = require("../models/SessionManagement");

module.exports = function (io) {
  const router = express.Router();

  router.get("/get-file", async (req, res) => {
    let filePath = req.query.path;
    const sessionId = req.query.sessionId;

    if (!filePath) {
      return res.status(400).json({ error: "File path is required" });
    }

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    try {
      filePath = decodeURIComponent(filePath).replace(/\\/g, "/");
      
      const file = await fileStorageService.getFile(sessionId, filePath);
      
      res.set({
        'Content-Type': file.mimeType,
        'Content-Length': file.content.length,
        'Cache-Control': 'no-cache'
      });
      
      res.send(file.content);

    } catch (error) {
      console.error("Error retrieving file:", error);
      if (error.message === 'File not found') {
        res.status(404).json({ error: "File not found" });
      } else {
        res.status(500).json({ error: "Failed to retrieve file" });
      }
    }
  });

  // Fetch files for a session
  router.get("/by-session", async (req, res) => {
    const sessionId = req.query.session;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    try {
      const files = await fileStorageService.getSessionFiles(sessionId);
      
      if (files.length === 0) {
        return res.json([]);
      }

      // Transform to match expected format
      const transformedFiles = files.map(file => ({
        name: file.fileName,
        type: file.fileType.replace('.', ''),
        path: file.filePath,
        size: file.fileSize,
        lastModified: file.lastModified
      }));

      res.json(transformedFiles);
    } catch (error) {
      console.error("Error reading session files:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  });

  // Get file hierarchy for a session
  router.get("/hierarchy/:sessionId", async (req, res) => {
    const { sessionId } = req.params;

    try {
      const hierarchy = await fileStorageService.getFileHierarchy(sessionId);
      res.json(hierarchy);
    } catch (error) {
      console.error("Error getting file hierarchy:", error);
      res.status(500).json({ error: "Failed to get file hierarchy" });
    }
  });

  // Delete file or folder
  router.delete("/delete-file", async (req, res) => {
    const { path: filePath, sessionId, type } = req.body;
    
    if (!filePath || !sessionId) {
      return res.status(400).json({ error: "File path and session ID are required" });
    }

    try {
      let deletedCount = 0;

      if (type === 'folder') {
        deletedCount = await fileStorageService.deleteFolder(sessionId, filePath);
      } else {
        const deleted = await fileStorageService.deleteFile(sessionId, filePath);
        deletedCount = deleted ? 1 : 0;
      }

      if (deletedCount === 0) {
        return res.status(404).json({ error: "File not found" });
      }

      // Get updated file hierarchy
      const updatedHierarchy = await fileStorageService.getFileHierarchy(sessionId);

      res.json({ 
        message: "Deleted successfully", 
        deletedPath: filePath,
        deletedCount,
        updatedFiles: updatedHierarchy
      });

      io.emit("fileDeleted", { deletedFile: filePath, sessionId });
      io.emit("fileUpdated", { sessionId, files: updatedHierarchy });

    } catch (error) {
      console.error("Error deleting:", error);
      res.status(500).json({ error: "Failed to delete" });
    }
  });

  // Update file content
  router.put("/update-file", async (req, res) => {
    const { sessionId, filePath, content } = req.body;

    if (!sessionId || !filePath || content === undefined) {
      return res.status(400).json({ error: "Session ID, file path, and content are required" });
    }

    try {
      const contentBuffer = Buffer.from(content, 'utf8');
      const updatedFile = await fileStorageService.updateFileContent(sessionId, filePath, contentBuffer);

      res.json({
        message: "File updated successfully",
        file: {
          name: updatedFile.fileName,
          type: updatedFile.fileType.replace('.', ''),
          path: updatedFile.filePath,
          size: updatedFile.fileSize,
          lastModified: updatedFile.lastModified
        }
      });

      io.emit("fileContentUpdated", { 
        sessionId, 
        filePath, 
        lastModified: updatedFile.lastModified 
      });

    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ error: "Failed to update file", details: error.message });
    }
  });

  // Get storage statistics for a session
  router.get("/storage-stats/:sessionId", async (req, res) => {
    const { sessionId } = req.params;

    try {
      const stats = await fileStorageService.getStorageStats(sessionId);
      res.json(stats);
    } catch (error) {
      console.error("Error getting storage stats:", error);
      res.status(500).json({ error: "Failed to get storage statistics" });
    }
  });

  return router;
};
