/**
 * Simplified File Routes for Y-WebSocket Collaboration
 * 
 * Simplified file management without complex versioning
 * Y-WebSocket handles document history and collaboration
 */

const express = require("express");
const fileStorageService = require("../services/fileStorageService");
const { asyncHandler } = require("../middleware/errorHandler");

module.exports = function () {
  const router = express.Router();

  // Get basic file information (no versioning)
  router.get("/info", asyncHandler(async (req, res) => {
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
      }
    });
  }));

  // Get file content (simplified, no version support)
  router.get("/content", asyncHandler(async (req, res) => {
    const { sessionId, filePath } = req.query;

    if (!sessionId || !filePath) {
      return res.status(400).json({ 
        error: "Session ID and file path are required" 
      });
    }

    const decodedPath = decodeURIComponent(filePath);
    const file = await fileStorageService.getFile(sessionId, decodedPath);
    
    res.set({
      'Content-Type': file.mimeType || 'text/plain',
      'Content-Length': file.content.length,
      'Cache-Control': 'no-cache'
    });
    
    res.send(file.content);
  }));

  // Get file hierarchy for session
  router.get("/hierarchy", asyncHandler(async (req, res) => {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ 
        error: "Session ID is required" 
      });
    }

    const hierarchy = await fileStorageService.getFileHierarchy(sessionId);
    
    res.json({
      sessionId,
      hierarchy
    });
  }));

  // Get storage statistics for session
  router.get("/stats", asyncHandler(async (req, res) => {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ 
        error: "Session ID is required" 
      });
    }

    const stats = await fileStorageService.getStorageStats(sessionId);
    
    res.json({
      sessionId,
      stats
    });
  }));

  // YJS document synchronization endpoints
  router.get("/yjs-state", asyncHandler(async (req, res) => {
    const { sessionId, filePath } = req.query;

    if (!sessionId || !filePath) {
      return res.status(400).json({ 
        error: "Session ID and file path are required" 
      });
    }

    const decodedPath = decodeURIComponent(filePath);
    const yjsState = await fileStorageService.getYjsDocumentFromFile(sessionId, decodedPath);
    
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': yjsState.length
    });
    
    res.send(Buffer.from(yjsState));
  }));

  router.post("/yjs-sync", asyncHandler(async (req, res) => {
    const { sessionId, filePath } = req.body;
    const yjsState = req.body.state;
    const cognitoId = req.user?.cognitoId;

    if (!sessionId || !filePath || !yjsState) {
      return res.status(400).json({ 
        error: "Session ID, file path, and YJS state are required" 
      });
    }

    const decodedPath = decodeURIComponent(filePath);
    const file = await fileStorageService.syncYjsDocumentToFile(
      sessionId, 
      decodedPath, 
      yjsState, 
      cognitoId
    );
    
    res.json({
      success: true,
      file: {
        id: file._id,
        fileName: file.fileName,
        size: file.fileSize,
        updatedAt: file.updatedAt
      }
    });
  }));

  return router;
};
