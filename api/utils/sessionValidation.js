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
  }
};

module.exports = SessionValidationUtils;
