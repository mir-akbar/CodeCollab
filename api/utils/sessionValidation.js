/**
 * @fileoverview Session Validation Utilities
 * 
 * Shared validation and sanitization utilities for session operations.
 * Extracted from SessionController to promote reusability across controllers.
 * 
 * @version 1.0.0
 * @author CodeLab Development Team
 * @since 2025-06-04
 */

/**
 * Session validation utilities for input sanitization and validation
 */
const SessionValidationUtils = {
  /**
   * Sanitize and validate session input data
   * @param {string} input - Input string to sanitize
   * @returns {string} - Sanitized input
   */
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return '';
    return input.trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes to prevent injection
      .substring(0, 1000); // Limit length
  },

  /**
   * Validate email format with enhanced security
   * @param {string} email - Email to validate
   * @returns {boolean} - True if valid email
   */
  isValidEmail: (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
  },

  /**
   * Validate session role
   * @param {string} role - Role to validate
   * @returns {boolean} - True if valid role
   */
  isValidRole: (role) => {
    const validRoles = ['owner', 'admin', 'editor', 'viewer'];
    return validRoles.includes(role);
  },

  /**
   * Validate session ID format
   * @param {string} sessionId - Session ID to validate
   * @returns {boolean} - True if valid format
   */
  isValidSessionId: (sessionId) => {
    if (!sessionId || typeof sessionId !== 'string') return false;
    // Allow alphanumeric, hyphens, underscores (common session ID patterns)
    return /^[a-zA-Z0-9_-]{1,100}$/.test(sessionId);
  },

  /**
   * Validate multiple inputs at once
   * @param {Object} inputs - Object with validation rules
   * @returns {Array} - Array of error messages
   */
  validateInputs: (inputs) => {
    const errors = [];
    
    if (inputs.sessionId && !SessionValidationUtils.isValidSessionId(inputs.sessionId)) {
      errors.push("Invalid session ID format");
    }
    
    if (inputs.emails) {
      const emailList = Array.isArray(inputs.emails) ? inputs.emails : [inputs.emails];
      emailList.forEach(email => {
        if (email && !SessionValidationUtils.isValidEmail(email)) {
          errors.push(`Invalid email format: ${email}`);
        }
      });
    }
    
    if (inputs.role && !SessionValidationUtils.isValidRole(inputs.role)) {
      errors.push("Invalid role. Must be one of: owner, admin, editor, viewer");
    }
    
    return errors;
  },

  /**
   * Resolve single user by email
   * @param {string} email - User email to resolve
   * @returns {Promise<Object>} - User object or throws error
   */
  resolveUser: async (email) => {
    const User = require('../models/User');
    const user = await User.findByEmail(email.trim().toLowerCase());
    if (!user) {
      throw new Error(`User not found: ${email}`);
    }
    return user;
  },

  /**
   * Resolve multiple users by email
   * @param {Array<string>} emails - Array of emails to resolve
   * @returns {Promise<Object>} - Object with email keys and user values
   */
  resolveUsers: async (emails) => {
    const User = require('../models/User');
    const users = {};
    
    for (const email of emails) {
      const normalizedEmail = email.trim().toLowerCase();
      const user = await User.findByEmail(normalizedEmail);
      if (!user) {
        throw new Error(`User not found: ${email}`);
      }
      users[email] = user;
    }
    
    return users;
  },

  /**
   * Check if user has permission to perform action in session
   * @param {string} sessionId - Session ID
   * @param {string} cognitoId - User's Cognito ID
   * @param {string} requiredAction - Required permission action
   * @returns {Promise<Object>} - Permission check result
   */
  checkPermission: async (sessionId, cognitoId, requiredAction) => {
    const SessionParticipant = require('../models/SessionParticipant');
    
    const participant = await SessionParticipant.findOne({ 
      sessionId, 
      cognitoId,
      status: { $in: ['active', 'invited'] }
    });

    if (!participant) {
      return {
        hasPermission: false,
        error: "You are not a participant in this session",
        participant: null
      };
    }

    const hasPermission = participant.hasPermission(requiredAction);
    
    return {
      hasPermission,
      error: hasPermission ? null : `You don't have permission to ${requiredAction}. Required role: ${requiredAction}`,
      participant
    };
  },

  /**
   * Check if user can assign a specific role
   * @param {string} sessionId - Session ID
   * @param {string} cognitoId - User's Cognito ID
   * @param {string} targetRole - Role to assign
   * @returns {Promise<Object>} - Role assignment check result
   */
  checkRoleAssignment: async (sessionId, cognitoId, targetRole) => {
    // First check if user has changeRoles permission (owner or admin)
    const permissionCheck = await SessionValidationUtils.checkPermission(sessionId, cognitoId, 'changeRoles');
    
    if (!permissionCheck.hasPermission) {
      return permissionCheck;
    }

    // Then check if they can assign this specific role
    const canAssign = permissionCheck.participant.canAssignRole(targetRole);
    
    if (!canAssign) {
      return {
        hasPermission: false,
        error: `You cannot assign the ${targetRole} role. Owners can assign admin/editor/viewer roles, admins can assign editor/viewer roles.`,
        participant: permissionCheck.participant
      };
    }
    
    return {
      hasPermission: true,
      error: null,
      participant: permissionCheck.participant
    };
  }
};

module.exports = SessionValidationUtils;
