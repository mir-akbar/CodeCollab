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
    required: true
  },

  /**
   * Session status
   */
  status: {
    type: String,
    enum: Object.values(SESSION_STATUS),
    default: SESSION_STATUS.ACTIVE
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
      default: Date.now
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

// Only keep essential compound indexes based on actual query patterns
SessionSchema.index({ creator: 1, status: 1 }); // For getUserSessions query

// ===== METHODS =====

/**
 * Check if user can join session based on simple rules
 */
SessionSchema.methods.canUserJoin = async function(userEmail) {
  if (this.status !== SESSION_STATUS.ACTIVE) {
    return { allowed: false, reason: 'Session is not active' };
  }

  // Ensure participant count is up to date
  await this.updateActivity();

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
    status: { $in: ['active', 'invited'] }  // Count both active and invited participants
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

  // Remove all participant records when session is archived
  // Since the session no longer exists for collaboration, 
  // there's no need to keep participant records
  await SessionParticipant.deleteMany({
    sessionId: this.sessionId
  });

  return { success: true };
};

module.exports = mongoose.model('Session', SessionSchema);
