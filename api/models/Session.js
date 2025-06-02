const mongoose = require('mongoose');

// New improved Session model - will replace SessionManagement
const SessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  creator: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
    index: true
  },
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    allowGuestAccess: {
      type: Boolean,
      default: false
    },
    maxParticipants: {
      type: Number,
      default: 50
    }
  },
  // Legacy fields for backward compatibility during migration
  legacy: {
    originalIds: [String], // Store original _id values from SessionManagement
    migrationComplete: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'sessions' // Explicit collection name
});

// Add indexes for better performance
SessionSchema.index({ creator: 1, status: 1 });
SessionSchema.index({ createdAt: -1 });
SessionSchema.index({ updatedAt: -1 });

// Add virtual for lastActivity (alias for updatedAt)
SessionSchema.virtual('lastActivity').get(function() {
  return this.updatedAt;
});

// Ensure virtuals are included in JSON
SessionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Session', SessionSchema);
