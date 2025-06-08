const mongoose = require('mongoose');

/**
 * Simplified SessionParticipant Model for Y-WebSocket Collaboration
 * 
 * Core functionality:
 * - Manages user participation in coding sessions
 * - Simple 4-role permission system: owner → admin → editor → viewer
 * - Streamlined for y-websocket real-time collaboration
 * - Minimal invitation system
 * - Essential activity tracking
 */

const SessionParticipantSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
    ref: 'Session'
  },
  cognitoId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'editor', 'viewer'],
    default: 'viewer',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'invited'],
    default: 'invited',
    required: true
  },
  invitedBy: {
    type: String, // cognitoId of inviter
    required: true
  },
  joinedAt: {
    type: Date,
    default: null
  },
  lastActive: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'session_participants'
});

// Compound indexes for efficient queries
SessionParticipantSchema.index({ sessionId: 1, cognitoId: 1 }, { unique: true });
SessionParticipantSchema.index({ cognitoId: 1, status: 1 });
SessionParticipantSchema.index({ sessionId: 1, status: 1 });
SessionParticipantSchema.index({ sessionId: 1, role: 1 });

// ===== CORE STATIC METHODS =====

/**
 * Get active participants for a session
 */
SessionParticipantSchema.statics.getActiveParticipants = function(sessionId) {
  return this.find({ 
    sessionId, 
    status: { $in: ['active', 'invited'] } 
  }).sort({ role: 1, joinedAt: 1 });
};

/**
 * Check if user has access to session
 */
SessionParticipantSchema.statics.hasAccess = function(sessionId, cognitoId) {
  return this.findOne({ 
    sessionId, 
    cognitoId, 
    status: { $in: ['active', 'invited'] } 
  });
};

/**
 * Find session owner
 */
SessionParticipantSchema.statics.findSessionOwner = function(sessionId) {
  return this.findOne({ 
    sessionId, 
    role: 'owner',
    status: { $in: ['active', 'invited'] }
  });
};

/**
 * Check if user is session owner
 */
SessionParticipantSchema.statics.isSessionOwner = function(sessionId, cognitoId) {
  return this.findOne({ 
    sessionId,
    cognitoId, 
    role: 'owner',
    status: { $in: ['active', 'invited'] }
  }).then(doc => !!doc);
};

/**
 * Create invitation
 */
SessionParticipantSchema.statics.createInvitation = function({ sessionId, cognitoId, invitedBy, role = 'viewer' }) {
  return this.create({
    sessionId,
    cognitoId,
    role,
    status: 'invited',
    invitedBy
  });
};

// ===== CORE INSTANCE METHODS =====

/**
 * Simple permission check based on 4-role hierarchy
 */
SessionParticipantSchema.methods.hasPermission = function(action) {
  const permissions = {
    'view': ['owner', 'admin', 'editor', 'viewer'],
    'edit': ['owner', 'admin', 'editor'],
    'invite': ['owner', 'admin'],
    'remove': ['owner', 'admin'],
    'changeRoles': ['owner'],
    'delete': ['owner'],
    'transfer': ['owner']
  };

  return permissions[action]?.includes(this.role) || false;
};

/**
 * Can assign role check (can only assign roles equal or lower)
 */
SessionParticipantSchema.methods.canAssignRole = function(targetRole) {
  const roleHierarchy = {
    'owner': 4,
    'admin': 3,
    'editor': 2,
    'viewer': 1
  };

  return roleHierarchy[this.role] >= roleHierarchy[targetRole];
};

/**
 * Accept invitation
 */
SessionParticipantSchema.methods.acceptInvitation = function() {
  if (this.status !== 'invited') {
    throw new Error('Can only accept invitations with invited status');
  }

  this.status = 'active';
  this.joinedAt = new Date();
  
  return this.save();
};

/**
 * Update last activity
 */
SessionParticipantSchema.methods.updateActivity = function() {
  this.lastActive = new Date();
  return this.save();
};

// ===== VALIDATION MIDDLEWARE =====

/**
 * Pre-save validation
 */
SessionParticipantSchema.pre('save', async function(next) {
  try {
    // Enforce owner uniqueness per session
    if (this.role === 'owner') {
      const existingOwner = await this.constructor.findOne({
        sessionId: this.sessionId,
        role: 'owner',
        _id: { $ne: this._id }
      });
      
      if (existingOwner) {
        throw new Error(`Session ${this.sessionId} already has an owner`);
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

module.exports = mongoose.model('SessionParticipant', SessionParticipantSchema);
