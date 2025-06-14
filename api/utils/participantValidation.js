/**
 * @fileoverview Participant Validation Utilities
 * 
 * Centralized validation logic for participant operations.
 * Reduces code duplication across participant controllers.
 * 
 * @version 1.0.0
 * @author CodeLab Development Team
 * @since 2025-06-14
 */

const SessionValidationUtils = require('./sessionValidation');
const ParticipantErrorHandler = require('./participantErrorHandler');

/**
 * Participant-specific validation and resolution utilities
 */
class ParticipantValidation {
  /**
   * Validate and resolve participants for session operations
   * @param {Object} params - Validation parameters
   * @param {string} params.sessionId - Session ID
   * @param {Array<string>} params.emails - Array of emails to validate/resolve
   * @param {string} [params.role] - Role to validate
   * @param {Object} res - Express response object
   * @returns {Promise<Object|null>} - Resolved users object or null if validation failed
   */
  static async validateAndResolveParticipants(params, res) {
    const { sessionId, emails, role } = params;
    
    // Step 1: Basic input validation
    const validationErrors = SessionValidationUtils.validateInputs({
      sessionId,
      emails,
      role
    });
    
    if (validationErrors.length > 0) {
      ParticipantErrorHandler.validationError(res, validationErrors);
      return null;
    }
    
    // Step 2: Resolve users
    try {
      const users = await SessionValidationUtils.resolveUsers(emails);
      return { users, validatedInputs: { sessionId, emails, role } };
    } catch (error) {
      ParticipantErrorHandler.userNotFound(res, error.message.split(': ')[1]);
      return null;
    }
  }

  /**
   * Validate invitation request
   * @param {Object} params - Invitation parameters
   * @param {Object} res - Express response object
   * @returns {Promise<Object|null>} - Validation result or null if failed
   */
  static async validateInvitation(params, res) {
    const { sessionId, inviteeEmail, inviterEmail, role = 'viewer' } = params;
    
    // Basic validation
    const validationErrors = SessionValidationUtils.validateInputs({
      sessionId,
      emails: [inviteeEmail, inviterEmail],
      role
    });
    
    if (validationErrors.length > 0) {
      ParticipantErrorHandler.validationError(res, validationErrors);
      return null;
    }
    
    // Prevent self-invitation
    if (inviteeEmail.toLowerCase() === inviterEmail.toLowerCase()) {
      ParticipantErrorHandler.selfOperationError(res, 'invite');
      return null;
    }
    
    // Resolve users (inviter must exist, invitee may not exist)
    try {
      const inviterUser = await SessionValidationUtils.resolveUser(inviterEmail);
      
      // For invitee, try to resolve but don't fail if not found
      let inviteeUser = null;
      try {
        inviteeUser = await SessionValidationUtils.resolveUser(inviteeEmail);
      } catch (error) {
        // Invitee doesn't exist yet - this is OK for invitations
        console.log(`Invitee ${inviteeEmail} not found - will create placeholder`);
      }
      
      return {
        sessionId,
        inviterUser,
        inviteeUser, // May be null
        role,
        validatedInputs: { sessionId, emails: [inviteeEmail, inviterEmail], role }
      };
    } catch (error) {
      // This would be if inviter is not found
      ParticipantErrorHandler.userNotFound(res, error.message.split(': ')[1]);
      return null;
    }
  }

  /**
   * Validate participant removal request
   * @param {Object} params - Removal parameters
   * @param {Object} res - Express response object
   * @returns {Promise<Object|null>} - Validation result or null if failed
   */
  static async validateParticipantRemoval(params, res) {
    const { sessionId, participantEmail, removerEmail } = params;
    
    // Prevent self-removal
    if (participantEmail.toLowerCase() === removerEmail.toLowerCase()) {
      ParticipantErrorHandler.selfOperationError(res, 'remove');
      return null;
    }
    
    // Validate and resolve users
    const result = await this.validateAndResolveParticipants({
      sessionId,
      emails: [participantEmail, removerEmail]
    }, res);
    
    if (!result) return null;
    
    const { users } = result;
    const participantUser = users[participantEmail];
    const removerUser = users[removerEmail];
    
    return {
      sessionId,
      participantUser,
      removerUser,
      validatedInputs: result.validatedInputs
    };
  }

  /**
   * Validate ownership transfer request
   * @param {Object} params - Transfer parameters
   * @param {Object} res - Express response object
   * @returns {Promise<Object|null>} - Validation result or null if failed
   */
  static async validateOwnershipTransfer(params, res) {
    const { sessionId, currentOwnerEmail, newOwnerEmail } = params;
    
    // Prevent self-transfer
    if (newOwnerEmail.toLowerCase() === currentOwnerEmail.toLowerCase()) {
      ParticipantErrorHandler.selfOperationError(res, 'transfer');
      return null;
    }
    
    // Validate and resolve users
    const result = await this.validateAndResolveParticipants({
      sessionId,
      emails: [currentOwnerEmail, newOwnerEmail]
    }, res);
    
    if (!result) return null;
    
    const { users } = result;
    const currentOwnerUser = users[currentOwnerEmail];
    const newOwnerUser = users[newOwnerEmail];
    
    return {
      sessionId,
      currentOwnerUser,
      newOwnerUser,
      validatedInputs: result.validatedInputs
    };
  }

  /**
   * Validate role update request
   * @param {Object} params - Role update parameters
   * @param {Object} res - Express response object
   * @returns {Promise<Object|null>} - Validation result or null if failed
   */
  static async validateRoleUpdate(params, res) {
    const { sessionId, participantEmail, updaterEmail, newRole } = params;
    
    // Validate and resolve users
    const result = await this.validateAndResolveParticipants({
      sessionId,
      emails: [participantEmail, updaterEmail],
      role: newRole
    }, res);
    
    if (!result) return null;
    
    const { users } = result;
    const participantUser = users[participantEmail];
    const updaterUser = users[updaterEmail];
    
    return {
      sessionId,
      participantUser,
      updaterUser,
      newRole,
      validatedInputs: result.validatedInputs
    };
  }

  /**
   * Validate session join request
   * @param {Object} params - Join parameters
   * @param {Object} res - Express response object
   * @returns {Promise<Object|null>} - Validation result or null if failed
   */
  static async validateSessionJoin(params, res) {
    const { sessionId, userEmail } = params;
    
    // Validate and resolve user
    const result = await this.validateAndResolveParticipants({
      sessionId,
      emails: [userEmail]
    }, res);
    
    if (!result) return null;
    
    const { users } = result;
    const user = users[userEmail];
    
    return {
      sessionId,
      user,
      validatedInputs: result.validatedInputs
    };
  }

  /**
   * Check if user has permission to perform action
   * @param {string} sessionId - Session ID
   * @param {string} cognitoId - User's Cognito ID
   * @param {string} action - Action to check
   * @param {Object} res - Express response object
   * @returns {Promise<Object|null>} - Permission result or null if denied
   */
  static async checkPermission(sessionId, cognitoId, action, res) {
    try {
      const permissionCheck = await SessionValidationUtils.checkPermission(sessionId, cognitoId, action);
      
      if (!permissionCheck.hasPermission) {
        ParticipantErrorHandler.permissionDenied(res, permissionCheck.error);
        return null;
      }
      
      return permissionCheck;
    } catch (error) {
      ParticipantErrorHandler.handleServiceError(res, error, `checking permission for ${action}`);
      return null;
    }
  }

  /**
   * Check if user can assign role
   * @param {string} sessionId - Session ID
   * @param {string} cognitoId - User's Cognito ID
   * @param {string} targetRole - Role to assign
   * @param {Object} res - Express response object
   * @returns {Promise<Object|null>} - Role assignment result or null if denied
   */
  static async checkRoleAssignment(sessionId, cognitoId, targetRole, res) {
    try {
      const roleCheck = await SessionValidationUtils.checkRoleAssignment(sessionId, cognitoId, targetRole);
      
      if (!roleCheck.hasPermission) {
        ParticipantErrorHandler.permissionDenied(res, roleCheck.error);
        return null;
      }
      
      return roleCheck;
    } catch (error) {
      ParticipantErrorHandler.handleServiceError(res, error, `checking role assignment for ${targetRole}`);
      return null;
    }
  }
}

module.exports = ParticipantValidation;
