const mongoose = require('mongoose');

// New SessionParticipant model for normalized participant management
const SessionParticipantSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
    ref: 'Session'
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    default: function() {
      return this.userEmail ? this.userEmail.split('@')[0] : 'Unknown';
    }
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'editor', 'viewer'],
    default: 'viewer'
  },
  status: {
    type: String,
    enum: ['active', 'invited', 'left', 'removed'],
    default: 'invited'
  },
  invitedBy: {
    type: String,
    required: true // Email of the user who sent the invitation
  },
  joinedAt: {
    type: Date,
    default: null // Set when status changes to 'active'
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  // Legacy field for backward compatibility
  legacy: {
    originalAccess: String, // Store original 'edit'/'view' values
    migrationComplete: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  collection: 'session_participants'
});

// Compound indexes for efficient queries
SessionParticipantSchema.index({ sessionId: 1, userEmail: 1 }, { unique: true });
SessionParticipantSchema.index({ userEmail: 1, status: 1 });
SessionParticipantSchema.index({ sessionId: 1, status: 1 });
SessionParticipantSchema.index({ sessionId: 1, role: 1 });

// Static method to get active participants for a session
SessionParticipantSchema.statics.getActiveParticipants = function(sessionId) {
  return this.find({ 
    sessionId, 
    status: { $in: ['active', 'invited'] } 
  }).sort({ role: 1, joinedAt: 1 });
};

// Static method to check if user has access to session
SessionParticipantSchema.statics.hasAccess = function(sessionId, userEmail) {
  return this.findOne({ 
    sessionId, 
    userEmail, 
    status: { $in: ['active', 'invited'] } 
  });
};

// Method to convert legacy 'access' values to new role system
SessionParticipantSchema.methods.convertLegacyAccess = function() {
  if (this.legacy && this.legacy.originalAccess) {
    switch (this.legacy.originalAccess) {
      case 'edit':
        this.role = 'editor';
        break;
      case 'view':
        this.role = 'viewer';
        break;
      default:
        this.role = 'viewer';
    }
  }
  return this;
};

module.exports = mongoose.model('SessionParticipant', SessionParticipantSchema);
