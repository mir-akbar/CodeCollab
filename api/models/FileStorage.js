const mongoose = require('mongoose');

const FileStorageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: { // Original size
    type: Number,
    required: true
  },
  compressedSize: { // Compressed size (if compressed)
    type: Number,
    required: false
  },
  content: {
    type: Buffer,
    required: true
  },
  parentFolder: {
    type: String,
    default: null
  },
  filePath: {
    type: String,
    required: true
  },
  storageType: {
    type: String,
    default: 'document'
  },
  isCompressed: {
    type: Boolean,
    default: false
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
FileStorageSchema.index({ sessionId: 1, filePath: 1 }, { unique: true });
FileStorageSchema.index({ sessionId: 1, parentFolder: 1 });

module.exports = mongoose.model('FileStorage', FileStorageSchema);
