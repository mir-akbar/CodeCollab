const mongoose = require('mongoose');

/**
 * Simplified User Model for Cognito Integration
 * Focuses only on session relationships and minimal backend data
 * All user profile data is managed by AWS Cognito standard attributes
 */
const UserSchema = new mongoose.Schema({
  // Core identity (from Cognito)
  cognitoId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    index: true,
    validate: {
      validator: function(email) {
        // Allow standard email format and cognito.local placeholder emails
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /^[^\s@]+@cognito\.local$/.test(email);
      },
      message: 'Invalid email format'
    }
  },

  // User display information (from Cognito standard attributes)
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 100,
    index: true // For searching users in session UI
  },
  
  // Unique username from Cognito (preferred_username)
  username: {
    type: String,
    unique: true,
    sparse: true, // Allow null values but enforce uniqueness when present
    trim: true,
    lowercase: true,
    maxlength: 50,
    index: true,
    validate: {
      validator: function(username) {
        // Allow alphanumeric, underscore, hyphen, and dot
        return !username || /^[a-z0-9._-]+$/.test(username);
      },
      message: 'Username can only contain lowercase letters, numbers, dots, underscores, and hyphens'
    }
  },
  
  // Session relationships
  createdSessions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  }],
  participatingSessions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  }],

  // Minimal activity tracking
  lastActiveAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Account status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes for performance
UserSchema.index({ cognitoId: 1, status: 1 });
UserSchema.index({ email: 1, status: 1 });
UserSchema.index({ lastActiveAt: -1 });

// Static method to find user by email
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find user by Cognito ID
UserSchema.statics.findByCognitoId = function(cognitoId) {
  return this.findOne({ cognitoId });
};

// Static method to find user by username
UserSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase() });
};

// Static method to find active users
UserSchema.statics.findActiveUsers = function() {
  return this.find({ status: 'active' });
};

// Static method to create user from Cognito data
UserSchema.statics.createFromCognito = function(cognitoData) {
  // Extract name information from Cognito standard attributes
  const name = cognitoData.name || 
               (cognitoData.given_name && cognitoData.family_name ? 
                `${cognitoData.given_name} ${cognitoData.family_name}` : '') ||
               cognitoData.given_name ||
               cognitoData.email.split('@')[0];
               
  const displayName = cognitoData.name || 
                      cognitoData.given_name ||
                      cognitoData.email.split('@')[0];

  // Extract username from preferred_username or fallback to email prefix
  const username = cognitoData.preferred_username || 
                   cognitoData.email.split('@')[0].toLowerCase();

  return this.create({
    cognitoId: cognitoData.cognitoId || cognitoData.sub,
    email: cognitoData.email.toLowerCase(),
    name: name,
    displayName: displayName,
    username: username,
    status: 'active',
    lastActiveAt: new Date()
  });
};

// Instance method to update activity
UserSchema.methods.updateActivity = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Backward compatibility method for updateLastActive
UserSchema.methods.updateLastActive = function() {
  return this.updateActivity();
};

// Instance method to add session relationship
UserSchema.methods.addSession = function(sessionId, isCreator = false) {
  const sessionObjectId = new mongoose.Types.ObjectId(sessionId);
  
  if (isCreator && !this.createdSessions.includes(sessionObjectId)) {
    this.createdSessions.push(sessionObjectId);
  }
  
  if (!this.participatingSessions.includes(sessionObjectId)) {
    this.participatingSessions.push(sessionObjectId);
  }
  
  return this.save();
};

// Instance method to remove session relationship
UserSchema.methods.removeSession = function(sessionId) {
  const sessionObjectId = new mongoose.Types.ObjectId(sessionId);
  
  this.createdSessions = this.createdSessions.filter(
    id => !id.equals(sessionObjectId)
  );
  this.participatingSessions = this.participatingSessions.filter(
    id => !id.equals(sessionObjectId)
  );
  
  return this.save();
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
