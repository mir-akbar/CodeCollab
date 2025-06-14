/**
 * @fileoverview Participant Error Handler Utilities
 * 
 * Centralized error handling for participant-related operations.
 * Provides consistent error responses and logging.
 * 
 * @version 1.0.0
 * @author CodeLab Development Team
 * @since 2025-06-14
 */

/**
 * Standardized error handling for participant operations
 */
class ParticipantErrorHandler {
  /**
   * Handle validation errors
   * @param {Object} res - Express response object
   * @param {string|Array} errors - Error message(s)
   * @returns {Object} - Express response
   */
  static validationError(res, errors) {
    const errorMessage = Array.isArray(errors) ? errors.join(', ') : errors;
    return res.status(400).json({ 
      success: false,
      error: errorMessage 
    });
  }

  /**
   * Handle user not found errors
   * @param {Object} res - Express response object
   * @param {string} email - Email that wasn't found
   * @returns {Object} - Express response
   */
  static userNotFound(res, email) {
    return res.status(404).json({ 
      success: false,
      error: `User not found: ${email}` 
    });
  }

  /**
   * Handle permission denied errors
   * @param {Object} res - Express response object
   * @param {string} action - Action that was denied
   * @returns {Object} - Express response
   */
  static permissionDenied(res, action) {
    return res.status(403).json({ 
      success: false,
      error: `Permission denied: ${action}` 
    });
  }

  /**
   * Handle service errors with consistent logging and response
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {string} action - Action being performed
   * @returns {Object} - Express response
   */
  static handleServiceError(res, error, action) {
    console.error(`Error ${action}:`, error);
    
    // Handle specific error types
    if (error.message.includes('User not found')) {
      return res.status(404).json({ 
        success: false,
        error: error.message 
      });
    }
    
    if (error.message.includes('Permission denied') || 
        error.message.includes('permission to') ||
        error.message.includes('not a participant')) {
      return res.status(403).json({ 
        success: false,
        error: error.message 
      });
    }
    
    if (error.message.includes('already a participant') ||
        error.message.includes('already active') ||
        error.message.includes('Cannot invite yourself') ||
        error.message.includes('Cannot transfer ownership to')) {
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
    
    // Generic server error
    return res.status(500).json({ 
      success: false,
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  /**
   * Handle success responses with consistent format
   * @param {Object} res - Express response object
   * @param {string} message - Success message
   * @param {Object} data - Additional response data
   * @param {number} statusCode - HTTP status code (default: 200)
   * @returns {Object} - Express response
   */
  static success(res, message, data = {}, statusCode = 200) {
    return res.status(statusCode).json({ 
      success: true,
      message,
      ...data
    });
  }

  /**
   * Handle participant already exists scenarios
   * @param {Object} res - Express response object
   * @param {string} email - Participant email
   * @param {string} role - Current role
   * @returns {Object} - Express response
   */
  static participantExists(res, email, role) {
    return res.status(200).json({
      success: true,
      message: `${email} is already a ${role} in this session`,
      alreadyParticipant: true,
      currentRole: role
    });
  }

  /**
   * Handle self-operation errors (prevent users from acting on themselves)
   * @param {Object} res - Express response object
   * @param {string} action - Action attempted
   * @returns {Object} - Express response
   */
  static selfOperationError(res, action) {
    const messages = {
      'invite': 'Cannot invite yourself to a session',
      'remove': 'Use the leave session endpoint to remove yourself from a session',
      'transfer': 'Cannot transfer ownership to the current owner'
    };
    
    return res.status(400).json({ 
      success: false,
      error: messages[action] || `Cannot perform ${action} on yourself` 
    });
  }
}

module.exports = ParticipantErrorHandler;
