const express = require("express");
const fileStorageService = require("../services/fileStorageService");

module.exports = function (io) {
  const router = express.Router();

  // Get file content from MongoDB
  router.get("/get-file", async (req, res) => {
    try {
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

    } catch (error) {
      console.error('Error retrieving file:', error);
      if (error.message === 'File not found') {
        res.status(404).json({ error: 'File not found' });
      } else {
        res.status(500).json({ error: 'Failed to retrieve file' });
      }
    }
  });

  // Get all files for a session
  router.get("/by-session", async (req, res) => {
    try {
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
    } catch (error) {
      console.error('Error retrieving session files:', error);
      res.status(500).json({ error: 'Failed to retrieve session files' });
    }
  });

  // Get file hierarchy for a session
  router.get("/hierarchy", async (req, res) => {
    try {
      const sessionId = req.query.session;

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const hierarchy = await fileStorageService.getFileHierarchy(sessionId);
      res.json(hierarchy);
    } catch (error) {
      console.error('Error retrieving file hierarchy:', error);
      res.status(500).json({ error: 'Failed to retrieve file hierarchy' });
    }
  });

  // Delete file or folder
  router.delete("/delete-file", async (req, res) => {
    try {
      const { path: filePath, sessionId } = req.body;
      
      if (!filePath || !sessionId) {
        return res.status(400).json({ error: "File path and session ID are required" });
      }

      const deleted = await fileStorageService.deleteFile(sessionId, filePath);
      
      if (!deleted) {
        return res.status(404).json({ error: "File not found" });
      }

      res.json({ message: "File deleted successfully", deletedPath: filePath });

      // Emit file deletion event
      io.emit("fileDeleted", { deletedFile: filePath, sessionId });

    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // Get storage statistics for a session
  router.get("/stats", async (req, res) => {
    try {
      const sessionId = req.query.session;

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const stats = await fileStorageService.getStorageStats(sessionId);
      res.json(stats);
    } catch (error) {
      console.error('Error retrieving storage stats:', error);
      res.status(500).json({ error: 'Failed to retrieve storage stats' });
    }
  });

  return router;
};