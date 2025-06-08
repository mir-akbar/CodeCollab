const mongoose = require('mongoose');

/**
 * Simplified FileStorage Model for Y-WebSocket Collaboration
 * 
 * Core functionality:
 * - Store files associated with coding sessions
 * - Optimized for y-websocket real-time collaboration
 * - Simple file management without complex versioning
 * - Essential metadata only
 */

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
  filePath: {
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
  fileSize: {
    type: Number,
    required: true
  },
  content: {
    type: mongoose.Schema.Types.Buffer,
    required: true
  },
  uploadedBy: {
    type: String, // cognitoId
    required: true
  },
  parentFolder: {
    type: String,
    default: null
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'file_storage'
});

// Essential indexes for efficient queries
FileStorageSchema.index({ sessionId: 1, filePath: 1 }, { unique: true });
FileStorageSchema.index({ sessionId: 1, parentFolder: 1 });
FileStorageSchema.index({ sessionId: 1, uploadedBy: 1 });

// ===== CORE STATIC METHODS =====

/**
 * Find file by session and path
 */
FileStorageSchema.statics.findByPath = function(sessionId, filePath) {
  return this.findOne({ sessionId, filePath });
};

/**
 * Get all files for a session
 */
FileStorageSchema.statics.getSessionFiles = function(sessionId) {
  return this.find({ sessionId })
    .select('-content') // Exclude content for performance
    .sort({ parentFolder: 1, fileName: 1 });
};

/**
 * Get files in a specific folder
 */
FileStorageSchema.statics.getFolderFiles = function(sessionId, parentFolder = null) {
  return this.find({ sessionId, parentFolder })
    .select('-content')
    .sort({ fileName: 1 });
};

/**
 * Update file content
 */
FileStorageSchema.statics.updateFileContent = function(sessionId, filePath, content, uploadedBy) {
  return this.findOneAndUpdate(
    { sessionId, filePath },
    { 
      content,
      fileSize: Buffer.byteLength(content),
      uploadedBy,
      lastModified: new Date()
    },
    { new: true }
  );
};

// ===== CORE INSTANCE METHODS =====

/**
 * Get file content as string
 */
FileStorageSchema.methods.getContentAsString = function() {
  return this.content ? this.content.toString('utf8') : '';
};

/**
 * Update content
 */
FileStorageSchema.methods.updateContent = function(newContent, uploadedBy) {
  this.content = Buffer.from(newContent, 'utf8');
  this.fileSize = this.content.length;
  this.uploadedBy = uploadedBy;
  this.lastModified = new Date();
  return this.save();
};

module.exports = mongoose.model('FileStorage', FileStorageSchema);
