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
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
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
    maxlength: 100
  },
  
  // Unique username from Cognito (preferred_username)
  username: {
    type: String,
    unique: true,
    sparse: true, // Allow null values but enforce uniqueness when present
    trim: true,
    lowercase: true,
    maxlength: 50,
    validate: {
      validator: function(username) {
        // Allow alphanumeric, underscore, hyphen, and dot
        return !username || /^[a-z0-9._-]+$/.test(username);
      },
      message: 'Username can only contain lowercase letters, numbers, dots, underscores, and hyphens'
    }
  },
  
  // Minimal activity tracking
  lastActiveAt: {
    type: Date,
    default: Date.now
  },

  // Account status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true,
  collection: 'users'
});

// No additional indexes needed - unique constraints on cognitoId, email, and username provide sufficient indexing

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

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
