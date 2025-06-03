const mongoose = require('mongoose');
const { 
  hasPermission, 
  canAssignRole, 
  canTransitionStatus, 
  normalizeRole,
  getValidRoles,
  getValidStatuses 
} = require('./permissions');

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

// ===== PHASE 1: PERMISSION SYSTEM METHODS =====

/**
 * Check if this participant has permission for a specific action
 * @param {string} action - The action to check permission for
 * @returns {boolean} - Whether participant has permission
 */
SessionParticipantSchema.methods.hasPermission = function(action) {
  return hasPermission(this.role, action);
};

/**
 * Check if this participant can assign a specific role to another user
 * @param {string} targetRole - The role being assigned
 * @returns {boolean} - Whether this participant can assign the role
 */
SessionParticipantSchema.methods.canAssignRole = function(targetRole) {
  return canAssignRole(this.role, targetRole);
};

/**
 * Check if this participant can transition to a new status
 * @param {string} newStatus - The target status
 * @returns {boolean} - Whether the status transition is valid
 */
SessionParticipantSchema.methods.canTransitionTo = function(newStatus) {
  return canTransitionStatus(this.status, newStatus);
};

/**
 * Normalize and validate role value (handles legacy roles)
 * @param {string} role - Role to normalize
 * @returns {string} - Normalized role
 */
SessionParticipantSchema.statics.normalizeRole = function(role) {
  return normalizeRole(role);
};

// ===== PHASE 1: VALIDATION MIDDLEWARE =====

/**
 * Pre-save middleware to enforce business rules
 */
SessionParticipantSchema.pre('save', async function(next) {
  try {
    // Normalize role if it's a legacy value
    this.role = normalizeRole(this.role);
    
    // Validate role is in allowed enum
    if (!getValidRoles().includes(this.role)) {
      throw new Error(`Invalid role: ${this.role}`);
    }
    
    // Validate status is in allowed enum
    if (!getValidStatuses().includes(this.status)) {
      throw new Error(`Invalid status: ${this.status}`);
    }
    
    // Enforce owner uniqueness per session
    if (this.role === 'owner') {
      const existingOwner = await this.constructor.findOne({
        sessionId: this.sessionId,
        role: 'owner',
        _id: { $ne: this._id } // Exclude current document
      });
      
      if (existingOwner) {
        throw new Error(`Session ${this.sessionId} already has an owner: ${existingOwner.userEmail}`);
      }
    }
    
    // Set joinedAt when status becomes active
    if (this.status === 'active' && !this.joinedAt) {
      this.joinedAt = new Date();
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Static method to find session owner
 * @param {string} sessionId - Session to find owner for
 * @returns {Promise<SessionParticipant|null>} - The session owner or null
 */
SessionParticipantSchema.statics.findSessionOwner = function(sessionId) {
  return this.findOne({ sessionId, role: 'owner' });
};

/**
 * Static method to check if user is session owner
 * @param {string} sessionId - Session ID
 * @param {string} userEmail - User email to check
 * @returns {Promise<boolean>} - Whether user is the session owner
 */
SessionParticipantSchema.statics.isSessionOwner = function(sessionId, userEmail) {
  return this.findOne({ sessionId, userEmail, role: 'owner' }).then(doc => !!doc);
};

/** @returns {Object} - The participant's permissions */
SessionParticipantSchema.methods.getPermissions = function() {
  const actions = ['edit', 'invite', 'remove', 'changeRoles', 'delete', 'transfer'];
  const permissions = {};

  actions.forEach(action => {
    permissions[action] = this.hasPermission(action);
  });

  return permissions;
};

module.exports = mongoose.model('SessionParticipant', SessionParticipantSchema);
