/**
 * @fileoverview User Controller - Enhanced user management with comprehensive validation
 * 
 * This controller provides secure user management operations including:
 * - Profile management with validation
 * - Preference updates with type checking  
 * - User search with security filtering
 * - Activity tracking with business rules
 * - Statistics retrieval with performance optimization
 * 
 * Enhanced Features:
 * - Input validation and sanitization
 * - Cross-field consistency validation
 * - Business rule enforcement
 * - Comprehensive error handling
 * - Performance optimizations
 * 
 * @version 2.0.0
 * @author CodeLab Development Team
 * @since 2025-06-04
 */

const userService = require('../services/userService');

/**
 * Enhanced validation utilities for user operations
 */
const ValidationUtils = {
  /**
   * Validate profile update data
   * @param {Object} updates - Profile updates to validate
   * @returns {Object} - Validation result with isValid boolean and errors array
   */
  validateProfileUpdate: (updates) => {
    const errors = [];
    
    // Validate displayName
    if (updates['profile.displayName'] !== undefined) {
      const displayName = updates['profile.displayName'];
      if (typeof displayName !== 'string') {
        errors.push('Display name must be a string');
      } else if (displayName.length < 1 || displayName.length > 100) {
        errors.push('Display name must be between 1 and 100 characters');
      } else if (!/^[a-zA-Z0-9\s\-_.]+$/.test(displayName.trim())) {
        errors.push('Display name contains invalid characters. Only letters, numbers, spaces, hyphens, underscores, and periods are allowed');
      }
    }
    
    // Validate bio
    if (updates['profile.bio'] !== undefined) {
      const bio = updates['profile.bio'];
      if (bio !== null && typeof bio !== 'string') {
        errors.push('Bio must be a string or null');
      } else if (bio && bio.length > 500) {
        errors.push('Bio must not exceed 500 characters');
      }
    }
    
    // Validate timezone
    if (updates['profile.timezone'] !== undefined) {
      const timezone = updates['profile.timezone'];
      if (typeof timezone !== 'string') {
        errors.push('Timezone must be a string');
      } else {
        // Basic timezone validation (could be enhanced with actual timezone list)
        const timezoneRegex = /^[A-Za-z_/+-]+$/;
        if (!timezoneRegex.test(timezone)) {
          errors.push('Invalid timezone format');
        }
      }
    }
    
    // Validate language
    if (updates['profile.language'] !== undefined) {
      const language = updates['profile.language'];
      const allowedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'];
      if (!allowedLanguages.includes(language)) {
        errors.push(`Language must be one of: ${allowedLanguages.join(', ')}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate preferences update data
   * @param {Object} preferences - Preferences to validate
   * @returns {Object} - Validation result with isValid boolean and errors array
   */
  validatePreferences: (preferences) => {
    const errors = [];
    
    // Validate theme
    if (preferences.theme !== undefined) {
      const allowedThemes = ['light', 'dark', 'system'];
      if (!allowedThemes.includes(preferences.theme)) {
        errors.push(`Theme must be one of: ${allowedThemes.join(', ')}`);
      }
    }
    
    // Validate notifications structure
    if (preferences.notifications !== undefined) {
      const notifications = preferences.notifications;
      if (typeof notifications !== 'object' || notifications === null) {
        errors.push('Notifications must be an object');
      } else {
        // Validate email notifications
        if (notifications.email !== undefined) {
          const emailNotifs = notifications.email;
          if (typeof emailNotifs !== 'object' || emailNotifs === null) {
            errors.push('Email notifications must be an object');
          } else {
            const emailFields = ['sessionInvites', 'sessionActivity', 'weeklyDigest', 'roleChanges', 'systemUpdates'];
            emailFields.forEach(field => {
              if (emailNotifs[field] !== undefined && typeof emailNotifs[field] !== 'boolean') {
                errors.push(`Email notification ${field} must be a boolean`);
              }
            });
          }
        }
        
        // Validate push notifications
        if (notifications.push !== undefined) {
          const pushNotifs = notifications.push;
          if (typeof pushNotifs !== 'object' || pushNotifs === null) {
            errors.push('Push notifications must be an object');
          } else {
            const pushFields = ['realTimeUpdates', 'collaboratorJoined', 'sessionShared'];
            pushFields.forEach(field => {
              if (pushNotifs[field] !== undefined && typeof pushNotifs[field] !== 'boolean') {
                errors.push(`Push notification ${field} must be a boolean`);
              }
            });
          }
        }
      }
    }
    
    // Validate editor preferences
    if (preferences.editor !== undefined) {
      const editor = preferences.editor;
      if (typeof editor !== 'object' || editor === null) {
        errors.push('Editor preferences must be an object');
      } else {
        // Validate fontSize
        if (editor.fontSize !== undefined) {
          if (typeof editor.fontSize !== 'number' || editor.fontSize < 10 || editor.fontSize > 24) {
            errors.push('Font size must be a number between 10 and 24');
          }
        }
        
        // Validate fontFamily
        if (editor.fontFamily !== undefined) {
          const allowedFonts = ['Monaco', 'Consolas', 'Source Code Pro', 'Fira Code', 'JetBrains Mono'];
          if (!allowedFonts.includes(editor.fontFamily)) {
            errors.push(`Font family must be one of: ${allowedFonts.join(', ')}`);
          }
        }
        
        // Validate tabSize
        if (editor.tabSize !== undefined) {
          if (typeof editor.tabSize !== 'number' || editor.tabSize < 1 || editor.tabSize > 8) {
            errors.push('Tab size must be a number between 1 and 8');
          }
        }
        
        // Validate boolean fields
        const booleanFields = ['wordWrap', 'minimap', 'lineNumbers', 'autoSave'];
        booleanFields.forEach(field => {
          if (editor[field] !== undefined && typeof editor[field] !== 'boolean') {
            errors.push(`Editor ${field} must be a boolean`);
          }
        });
      }
    }
    
    // Validate collaboration preferences
    if (preferences.collaboration !== undefined) {
      const collab = preferences.collaboration;
      if (typeof collab !== 'object' || collab === null) {
        errors.push('Collaboration preferences must be an object');
      } else {
        // Validate autoSaveInterval
        if (collab.autoSaveInterval !== undefined) {
          if (typeof collab.autoSaveInterval !== 'number' || 
              collab.autoSaveInterval < 5000 || 
              collab.autoSaveInterval > 300000) {
            errors.push('Auto save interval must be a number between 5000 and 300000 milliseconds');
          }
        }
        
        // Validate boolean fields
        const booleanFields = ['showCursors', 'showUserNames', 'sharePresence'];
        booleanFields.forEach(field => {
          if (collab[field] !== undefined && typeof collab[field] !== 'boolean') {
            errors.push(`Collaboration ${field} must be a boolean`);
          }
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate search query parameters
   * @param {string} query - Search query
   * @param {string} exclude - Comma-separated list of emails to exclude
   * @returns {Object} - Validation result with isValid boolean and errors array
   */
  validateSearchQuery: (query, exclude) => {
    const errors = [];
    
    // Validate query
    if (!query || typeof query !== 'string') {
      errors.push('Search query is required and must be a string');
    } else if (query.length < 2) {
      errors.push('Search query must be at least 2 characters');
    } else if (query.length > 100) {
      errors.push('Search query must not exceed 100 characters');
    } else if (!/^[a-zA-Z0-9@.\s\-_]+$/.test(query)) {
      errors.push('Search query contains invalid characters');
    }
    
    // Validate exclude parameter
    if (exclude !== undefined && exclude !== null) {
      if (typeof exclude !== 'string') {
        errors.push('Exclude parameter must be a string');
      } else {
        const excludeEmails = exclude.split(',');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        excludeEmails.forEach(email => {
          const trimmedEmail = email.trim();
          if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
            errors.push(`Invalid email format in exclude list: ${trimmedEmail}`);
          }
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Sanitize and normalize user input data
   * @param {Object} data - Data to sanitize
   * @returns {Object} - Sanitized data
   */
  sanitizeUserData: (data) => {
    const sanitized = {};
    
    Object.keys(data).forEach(key => {
      let value = data[key];
      
      if (typeof value === 'string') {
        // Trim whitespace and normalize
        value = value.trim();
        
        // Specific field sanitization
        if (key.includes('displayName') || key.includes('name')) {
          // Normalize multiple spaces to single space
          value = value.replace(/\s+/g, ' ');
        } else if (key.includes('bio')) {
          // Normalize line breaks and multiple spaces
          value = value.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
        } else if (key.includes('timezone')) {
          // Normalize timezone format
          value = value.replace(/\s+/g, '');
        }
      }
      
      sanitized[key] = value;
    });
    
    return sanitized;
  }
};

/**
 * User Controller - Handles user profile and data management
 */

/**
 * Get current user profile
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return safe user data (excluding sensitive information)
    const userProfile = {
      id: user._id,
      email: user.email,
      profile: user.profile,
      preferences: user.preferences,
      activity: {
        lastLogin: user.activity.lastLogin,
        lastActiveAt: user.activity.lastActiveAt,
        loginCount: user.activity.loginCount,
        sessionsCreated: user.activity.sessionsCreated,
        sessionsJoined: user.activity.sessionsJoined,
        totalCollaborationTime: user.activity.totalCollaborationTime,
        favoriteLanguages: user.activity.favoriteLanguages
      },
      status: user.status,
      verified: user.verified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({
      error: 'Failed to retrieve user profile',
      details: error.message
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Validate allowed updates
    const allowedFields = [
      'profile.displayName',
      'profile.bio',
      'profile.timezone',
      'profile.language'
    ];

    const updateData = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = updates[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        allowedFields
      });
    }

    // Validate profile update data
    const { isValid, errors } = ValidationUtils.validateProfileUpdate(updateData);
    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid profile update data',
        details: errors
      });
    }

    // Sanitize input data
    const sanitizedData = ValidationUtils.sanitizeUserData(updateData);

    const updatedUser = await userService.updateProfile(userId, sanitizedData);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        profile: updatedUser.profile
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      details: error.message
    });
  }
};

/**
 * Update user preferences with enhanced validation
 * @param {Object} req - Express request object
 * @param {Object} req.body - Preferences update data
 * @param {string} [req.body.theme] - UI theme preference (light, dark, system)
 * @param {Object} [req.body.notifications] - Notification preferences with email and push settings
 * @param {Object} [req.body.editor] - Editor preferences (fontSize, fontFamily, tabSize, etc.)
 * @param {Object} [req.body.collaboration] - Collaboration preferences (cursors, auto-save, etc.)
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response with updated preferences or error details
 * 
 * @example
 * // Request body:
 * {
 *   "theme": "dark",
 *   "notifications": {
 *     "email": { "sessionInvites": true, "weeklyDigest": false },
 *     "push": { "realTimeUpdates": true }
 *   },
 *   "editor": {
 *     "fontSize": 16,
 *     "fontFamily": "JetBrains Mono",
 *     "tabSize": 4
 *   }
 * }
 * 
 * @throws {ValidationError} When preference validation fails
 * @throws {NotFoundError} When user is not found
 * @throws {DatabaseError} When database operation fails
 */
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const preferences = req.body;

    // Validate preference structure
    const allowedPreferences = [
      'theme',
      'notifications',
      'editor',
      'collaboration'
    ];

    const validPreferences = {};
    Object.keys(preferences).forEach(key => {
      if (allowedPreferences.includes(key)) {
        validPreferences[key] = preferences[key];
      }
    });

    if (Object.keys(validPreferences).length === 0) {
      return res.status(400).json({
        error: 'No valid preferences to update',
        allowedPreferences
      });
    }

    // Validate preferences update data
    const { isValid, errors } = ValidationUtils.validatePreferences(validPreferences);
    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid preferences data',
        details: errors
      });
    }

    // Sanitize input data
    const sanitizedPreferences = ValidationUtils.sanitizeUserData(validPreferences);

    const updatedUser = await userService.updatePreferences(userId, sanitizedPreferences);
    
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedUser.preferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      details: error.message
    });
  }
};

/**
 * Get user statistics and analytics with performance optimization
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response with comprehensive user statistics
 * 
 * @example
 * // Response:
 * {
 *   "success": true,
 *   "stats": {
 *     "profile": {
 *       "name": "John Doe",
 *       "email": "john@example.com",
 *       "joinedAt": "2025-01-01T00:00:00.000Z",
 *       "lastActive": "2025-06-04T12:00:00.000Z",
 *       "activityLevel": "very_active"
 *     },
 *     "activity": {
 *       "sessionsCreated": 25,
 *       "sessionsJoined": 50,
 *       "totalCollaborationTime": 1200,
 *       "favoriteLanguages": ["javascript", "python", "typescript"]
 *     },
 *     "relationships": {
 *       "frequentCollaborators": 8,
 *       "topCollaborators": [...]
 *     }
 *   }
 * }
 * 
 * @throws {NotFoundError} When user is not found
 * @throws {DatabaseError} When database operation fails
 */
const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const stats = await userService.getUserStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve user statistics',
      details: error.message
    });
  }
};

/**
 * Search users with enhanced validation and security filtering
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.q - Search query (2-100 chars, alphanumeric + @.-_ )
 * @param {string} [req.query.exclude] - Comma-separated emails to exclude from results
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response with matching users or error details
 * 
 * @example
 * // GET /api/users/search?q=john&exclude=john@example.com,jane@example.com
 * // Response:
 * {
 *   "success": true,
 *   "users": [
 *     {
 *       "email": "johnny@example.com",
 *       "name": "Johnny Doe",
 *       "displayName": "Johnny",
 *       "avatar": { "url": "...", "provider": "gravatar" }
 *     }
 *   ]
 * }
 * 
 * @throws {ValidationError} When search parameters are invalid
 * @throws {DatabaseError} When database operation fails
 */
const searchUsers = async (req, res) => {
  try {
    const { q: query, exclude } = req.query;
    
    // Validate search query
    const { isValid, errors } = ValidationUtils.validateSearchQuery(query, exclude);
    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid search query',
        details: errors
      });
    }

    const excludeEmails = exclude ? exclude.split(',') : [req.user.email];
    const users = await userService.searchUsers(query, excludeEmails);
    
    res.json({
      success: true,
      users: users.map(user => ({
        email: user.email,
        name: user.profile.name,
        displayName: user.profile.displayName,
        avatar: user.profile.avatar
      }))
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      error: 'Failed to search users',
      details: error.message
    });
  }
};

/**
 * Get current user's frequent collaborators with ranking
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user object with relationships
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response with top 10 frequent collaborators
 * 
 * @example
 * // Response:
 * {
 *   "success": true,
 *   "collaborators": [
 *     {
 *       "user": "60a1234567890abcdef123456",
 *       "collaborationCount": 15,
 *       "lastCollaborated": "2025-06-03T10:30:00.000Z",
 *       "totalTimeCollaborated": 450
 *     }
 *   ]
 * }
 * 
 * @throws {NotFoundError} When user is not found
 * @throws {DatabaseError} When database operation fails
 */
const getFrequentCollaborators = async (req, res) => {
  try {
    const user = req.user;
    const collaborators = user.relationships.frequentCollaborators
      .sort((a, b) => b.collaborationCount - a.collaborationCount)
      .slice(0, 10);
    
    res.json({
      success: true,
      collaborators
    });
  } catch (error) {
    console.error('Error getting frequent collaborators:', error);
    res.status(500).json({
      error: 'Failed to retrieve collaborators',
      details: error.message
    });
  }
};

/**
 * Update user avatar with validation
 * @param {Object} req - Express request object
 * @param {Object} req.body - Avatar update data
 * @param {string} req.body.avatarUrl - URL of the new avatar image
 * @param {string} [req.body.provider] - Avatar provider (upload, gravatar, oauth, generated)
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response with updated avatar data
 * 
 * @example
 * // Request body:
 * {
 *   "avatarUrl": "https://example.com/avatar.jpg",
 *   "provider": "upload"
 * }
 * 
 * @throws {ValidationError} When avatar URL is missing or invalid
 * @throws {NotFoundError} When user is not found
 * @throws {DatabaseError} When database operation fails
 */
const updateAvatar = async (req, res) => {
  try {
    const userId = req.user._id;
    const { avatarUrl, provider = 'upload' } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({
        error: 'Avatar URL is required'
      });
    }

    const updateData = {
      'profile.avatar.url': avatarUrl,
      'profile.avatar.provider': provider
    };

    const updatedUser = await userService.updateProfile(userId, updateData);
    
    res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: updatedUser.profile.avatar
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({
      error: 'Failed to update avatar',
      details: error.message
    });
  }
};

/**
 * Delete user account with GDPR compliance
 * @param {Object} req - Express request object
 * @param {Object} req.body - Deletion confirmation data
 * @param {string} req.body.confirmation - Deletion confirmation string (must be "DELETE_MY_ACCOUNT")
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response confirming account deletion initiation
 * 
 * @example
 * // Request body:
 * {
 *   "confirmation": "DELETE_MY_ACCOUNT"
 * }
 * 
 * @description
 * This performs a soft delete by:
 * - Marking user status as 'deleted'
 * - Anonymizing personal data
 * - Setting GDPR retention date
 * - Preserving data integrity for existing sessions
 * 
 * @throws {ValidationError} When confirmation string is incorrect
 * @throws {NotFoundError} When user is not found
 * @throws {DatabaseError} When database operation fails
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        error: 'Account deletion requires confirmation'
      });
    }

    await userService.deleteUserData(userId);
    
    res.json({
      success: true,
      message: 'Account has been marked for deletion'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      error: 'Failed to delete account',
      details: error.message
    });
  }
};

module.exports = {
  getCurrentUser,
  updateProfile,
  updatePreferences,
  getUserStats,
  searchUsers,
  getFrequentCollaborators,
  updateAvatar,
  deleteAccount
};
