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
    },
    // Phase 3: Enhanced Session Controls
    allowSelfInvite: {
      type: Boolean,
      default: false // Users cannot join without invitation by default
    },
    requireApproval: {
      type: Boolean,
      default: true // Invitations require approval by default
    },
    allowRoleRequests: {
      type: Boolean,
      default: false // Users cannot request role changes by default
    },
    autoAcceptInvites: {
      type: Boolean,
      default: false // Invites require manual acceptance by default
    },
    allowedDomains: {
      type: [String],
      default: [] // Empty means all domains allowed
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

// ===== PHASE 3: ENHANCED SESSION CONTROLS =====

/**
 * Check if a user can join this session via self-invite
 * @param {string} userEmail - Email of the user wanting to join
 * @returns {boolean} - Whether self-invite is allowed
 */
SessionSchema.methods.allowsSelfInvite = function(userEmail) {
  if (!this.settings.allowSelfInvite) {
    return false;
  }

  // Check domain restrictions if configured
  if (this.settings.allowedDomains.length > 0) {
    const userDomain = userEmail.split('@')[1];
    return this.settings.allowedDomains.includes(userDomain);
  }

  return true;
};

/**
 * Check if the session has reached maximum participants
 * @param {number} currentCount - Current participant count
 * @returns {boolean} - Whether session is at capacity
 */
SessionSchema.methods.isAtCapacity = function(currentCount) {
  return currentCount >= this.settings.maxParticipants;
};

/**
 * Validate session settings
 * @returns {Object} - Validation result with success and errors
 */
SessionSchema.methods.validateSettings = function() {
  const errors = [];

  if (this.settings.maxParticipants < 1) {
    errors.push('Maximum participants must be at least 1');
  }

  if (this.settings.maxParticipants > 1000) {
    errors.push('Maximum participants cannot exceed 1000');
  }

  if (this.settings.allowedDomains) {
    for (const domain of this.settings.allowedDomains) {
      if (!domain.includes('.')) {
        errors.push(`Invalid domain format: ${domain}`);
      }
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
};

/**
 * Check if user's email domain is allowed
 * @param {string} userEmail - Email to check
 * @returns {boolean} - Whether domain is allowed
 */
SessionSchema.methods.isDomainAllowed = function(userEmail) {
  if (this.settings.allowedDomains.length === 0) {
    return true; // No restrictions
  }

  const userDomain = userEmail.split('@')[1];
  return this.settings.allowedDomains.includes(userDomain);
};

/**
 * Pre-save middleware to validate settings
 */
SessionSchema.pre('save', function(next) {
  const validation = this.validateSettings();
  if (!validation.success) {
    return next(new Error(`Session validation failed: ${validation.errors.join(', ')}`));
  }
  next();
});

module.exports = mongoose.model('Session', SessionSchema);
