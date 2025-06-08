const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * Simplified Session Schema for CodeLab collaborative editing
 * @description Core session management focused on y-websocket collaboration
 * @version 3.0.0 - Simplified for core collaboration features
 */

// ===== ENUMS & CONSTANTS =====

const SESSION_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived'
};

const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

// ===== SCHEMA DEFINITION =====

const SessionSchema = new mongoose.Schema({
  /**
   * Unique session identifier
   */
  sessionId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4(),
    index: true
  },

  /**
   * Session name
   */
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  /**
   * Optional description
   */
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },

  /**
   * Session creator (always becomes owner)
   */
  creator: {
    type: String, // cognitoId from AWS Cognito
    required: true,
    index: true
  },

  /**
   * Session status
   */
  status: {
    type: String,
    enum: Object.values(SESSION_STATUS),
    default: SESSION_STATUS.ACTIVE,
    index: true
  },

  /**
   * Core settings for collaboration
   */
  settings: {
    /**
     * Maximum participants (simplified)
     */
    maxParticipants: {
      type: Number,
      min: 1,
      max: 50,
      default: 10
    },

    /**
     * Whether session is discoverable
     */
    isPrivate: {
      type: Boolean,
      default: false
    },

    /**
     * Programming language for syntax highlighting
     */
    language: {
      type: String,
      default: 'javascript',
      trim: true
    },

    /**
     * Domain restrictions for participants (empty = no restriction)
     */
    allowedDomains: {
      type: [String],
      default: []
    }
  },

  /**
   * Activity tracking
   */
  activity: {
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true
    },
    
    participantCount: {
      type: Number,
      min: 0,
      default: 0
    }
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'sessions'
});

// ===== INDEXES =====

SessionSchema.index({ creator: 1, status: 1 });
SessionSchema.index({ status: 1, 'settings.isPrivate': 1, createdAt: -1 });
SessionSchema.index({ name: 'text', description: 'text' });

// ===== METHODS =====

/**
 * Check if user can join session based on simple rules
 */
SessionSchema.methods.canUserJoin = function(userEmail) {
  if (this.status !== SESSION_STATUS.ACTIVE) {
    return { allowed: false, reason: 'Session is not active' };
  }

  if (this.activity.participantCount >= this.settings.maxParticipants) {
    return { allowed: false, reason: 'Session is at maximum capacity' };
  }

  // Check domain restrictions
  if (this.settings.allowedDomains.length > 0) {
    const userDomain = userEmail.split('@')[1];
    if (!this.settings.allowedDomains.includes(userDomain)) {
      return { allowed: false, reason: 'Domain not allowed' };
    }
  }

  return { allowed: true };
};

/**
 * Update session activity
 */
SessionSchema.methods.updateActivity = async function() {
  const SessionParticipant = mongoose.model('SessionParticipant');
  
  const count = await SessionParticipant.countDocuments({
    sessionId: this.sessionId,
    status: 'active'
  });
  
  this.activity.lastActivity = new Date();
  this.activity.participantCount = count;
  
  return this.save();
};

/**
 * Archive session
 */
SessionSchema.methods.archive = async function() {
  const SessionParticipant = mongoose.model('SessionParticipant');
  
  this.status = SESSION_STATUS.ARCHIVED;
  await this.save();

  await SessionParticipant.updateMany(
    { sessionId: this.sessionId, status: 'active' },
    { status: 'left', leftAt: new Date() }
  );

  return { success: true };
};

module.exports = mongoose.model('Session', SessionSchema);
