/**
 * Simplified File Routes for Y-WebSocket Collaboration
 * 
 * Simplified file management without complex versioning
 * Y-WebSocket handles document history and collaboration
 */

const express = require("express");
const fileStorageService = require("../services/fileStorageService");

module.exports = function (io) {
  const router = express.Router();

  // Get basic file information (no versioning)
  router.get("/info", async (req, res) => {
    try {
      const { sessionId, filePath } = req.query;

      if (!sessionId || !filePath) {
        return res.status(400).json({ 
          error: "Session ID and file path are required" 
        });
      }

      const decodedPath = decodeURIComponent(filePath);
      const file = await fileStorageService.getFile(sessionId, decodedPath);
      
      res.json({
        filePath: decodedPath,
        info: {
          id: file._id,
          fileName: file.fileName,
          fileType: file.fileType,
          size: file.fileSize,
          mimeType: file.mimeType,
          uploadedBy: file.uploadedBy,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt
        }))
      });

    } catch (error) {
      console.error('Error retrieving version history:', error);
      res.status(500).json({ error: 'Failed to retrieve version history' });
    }
  });

  // Get specific version of a file
  router.get("/version/:version", async (req, res) => {
    try {
      const { sessionId, filePath } = req.query;
      const { version } = req.params;

      if (!sessionId || !filePath) {
        return res.status(400).json({ 
          error: "Session ID and file path are required" 
        });
      }

      const decodedPath = decodeURIComponent(filePath);
      const file = await fileStorageService.getFileVersion(
        sessionId, 
        decodedPath, 
        parseInt(version)
      );
      
      res.set({
        'Content-Type': file.mimeType || 'text/plain',
        'Content-Length': file.content.length,
        'Cache-Control': 'no-cache',
        'X-File-Version': version.toString(),
        'X-Content-Hash': file.contentHash
      });
      
      res.send(file.content);

    } catch (error) {
      console.error('Error retrieving file version:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to retrieve file version' });
      }
    }
  });

  // Compare two versions of a file
  router.get("/diff", async (req, res) => {
    try {
      const { sessionId, filePath, fromVersion, toVersion } = req.query;

      if (!sessionId || !filePath || !fromVersion || !toVersion) {
        return res.status(400).json({ 
          error: "Session ID, file path, fromVersion, and toVersion are required" 
        });
      }

      const decodedPath = decodeURIComponent(filePath);
      const diff = await fileStorageService.generateVersionDiff(
        sessionId, 
        decodedPath, 
        parseInt(fromVersion), 
        parseInt(toVersion)
      );
      
      res.json({
        filePath: decodedPath,
        comparison: diff
      });

    } catch (error) {
      console.error('Error generating diff:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to generate diff' });
      }
    }
  });

  // Create a new version manually (useful for API clients)
  router.post("/create", async (req, res) => {
    try {
      const { 
        sessionId, 
        filePath, 
        content,
        changeDescription,
        maxVersions,
        retentionDays 
      } = req.body;

      if (!sessionId || !filePath || content === undefined) {
        return res.status(400).json({ 
          error: "Session ID, file path, and content are required" 
        });
      }

      // Get existing file metadata
      const currentFile = await fileStorageService.getFile(sessionId, filePath);
      
      const fileData = {
        sessionId,
        fileName: currentFile.fileName,
        fileType: currentFile.fileType,
        content: Buffer.from(content, 'utf8'),
        mimeType: currentFile.mimeType,
        parentFolder: currentFile.parentFolder,
        filePath
      };

      const options = {
        changeDescription: changeDescription || 'Manual version creation',
        maxVersions: maxVersions || fileStorageService.DEFAULT_MAX_VERSIONS,
        retentionDays: retentionDays || fileStorageService.DEFAULT_RETENTION_DAYS
      };

      const newVersion = await fileStorageService.createFileVersion(fileData, options);
      
      // Notify connected clients about the file update
      io.to(sessionId).emit('fileVersionCreated', {
        filePath,
        version: newVersion.version,
        changeDescription: changeDescription,
        timestamp: newVersion.createdAt
      });

      res.json({
        success: true,
        version: {
          id: newVersion._id,
          version: newVersion.version,
          size: newVersion.fileSize,
          isLatest: newVersion.isLatest,
          changeDescription: newVersion.changeDescription,
          contentHash: newVersion.contentHash,
          createdAt: newVersion.createdAt
        }
      });

    } catch (error) {
      console.error('Error creating file version:', error);
      if (error.message === 'File not found') {
        res.status(404).json({ error: 'File not found' });
      } else {
        res.status(500).json({ error: 'Failed to create file version' });
      }
    }
  });

  // Cleanup old versions manually
  router.post("/cleanup", async (req, res) => {
    try {
      const { sessionId, filePath, maxVersions, retentionDays } = req.body;

      if (!sessionId || !filePath) {
        return res.status(400).json({ 
          error: "Session ID and file path are required" 
        });
      }

      await fileStorageService.cleanupFileVersions(
        sessionId,
        filePath,
        maxVersions || fileStorageService.DEFAULT_MAX_VERSIONS,
        retentionDays || fileStorageService.DEFAULT_RETENTION_DAYS
      );
      
      res.json({
        success: true,
        message: `Cleanup completed for ${filePath}`
      });

    } catch (error) {
      console.error('Error during cleanup:', error);
      res.status(500).json({ error: 'Failed to cleanup versions' });
    }
  });

  // Get versioning statistics for a session
  router.get("/stats", async (req, res) => {
    try {
      const { sessionId } = req.query;

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      // Get version counts per file
      const versionStats = await fileStorageService.getVersioningStats(sessionId);
      
      res.json({
        sessionId,
        statistics: versionStats
      });

    } catch (error) {
      console.error('Error retrieving versioning stats:', error);
      res.status(500).json({ error: 'Failed to retrieve versioning statistics' });
    }
  });

  return router;
};
