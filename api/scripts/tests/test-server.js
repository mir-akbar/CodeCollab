const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const fileStorageService = require('./services/fileStorageService');

// Simple test server
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Connect to MongoDB using shared config
const { connectDB } = require('../../config/database');
connectDB()
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Test endpoint to upload files
app.post('/test-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const sessionId = 'test-session-' + Date.now();
    console.log(`\n📤 Testing upload: ${req.file.originalname} (${req.file.size} bytes)`);

    // Store the file
    const savedFile = await fileStorageService.storeFile({
      sessionId,
      fileName: req.file.originalname,
      fileType: path.extname(req.file.originalname).toLowerCase() || '.txt',
      content: req.file.buffer,
      mimeType: req.file.mimetype,
      parentFolder: null,
      filePath: req.file.originalname
    });

    console.log(`✅ File stored successfully: ${savedFile.fileName}`);

    res.json({
      success: true,
      file: {
        name: savedFile.fileName,
        size: savedFile.fileSize,
        type: savedFile.fileType,
        sessionId: sessionId
      }
    });

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test endpoint to get storage stats
app.get('/test-stats/:sessionId', async (req, res) => {
  try {
    const stats = await fileStorageService.getStorageStats(req.params.sessionId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3013;
app.listen(PORT, () => {
  console.log(`\n🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📤 Upload test files to: POST http://localhost:${PORT}/test-upload`);
  console.log(`📊 Get stats: GET http://localhost:${PORT}/test-stats/{sessionId}`);
});

module.exports = app;
