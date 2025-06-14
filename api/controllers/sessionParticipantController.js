/**
 * @fileoverview Session Participant Controller - User Management
 * 
 * Handles participant-related operations:
 * - User invitations to sessions
 * - Participant removal and session leaving
 * - Ownership transfer
 * - Role management
 * 
 * @version 2.0.0
 * @author CodeLab Development Team
 * @since 2025-06-04
 */

const participantService = require("../services/participantService");
const { asyncHandler } = require("../middleware/errorHandler");
const SessionValidationUtils = require("../utils/sessionValidation");
const ParticipantValidation = require("../utils/participantValidation");
const ParticipantErrorHandler = require("../utils/participantErrorHandler");

class SessionParticipantController {

  /**
   * Invite user to session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  inviteToSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { inviteeEmail, role, inviterEmail } = req.body;

    // Step 1: Validate invitation request
    const validation = await ParticipantValidation.validateInvitation({
      sessionId,
      inviteeEmail,
      inviterEmail,
      role
    }, res);
    
    if (!validation) return; // Validation failed, response already sent

    const { inviterUser, inviteeUser, role: validatedRole } = validation;

    try {
      // Step 2: Check if inviter has permission to invite users
      const permissionCheck = await ParticipantValidation.checkPermission(
        sessionId,
        inviterUser.cognitoId,
        'invite',
        res
      );
      
      if (!permissionCheck) return; // Permission denied, response already sent

      // Step 3: Check if inviter can assign the requested role
      const targetRole = validatedRole || 'viewer'; // Default to viewer for security
      const roleCheck = await ParticipantValidation.checkRoleAssignment(
        sessionId,
        inviterUser.cognitoId,
        targetRole,
        res
      );
      
      if (!roleCheck) return; // Role assignment denied, response already sent

      // Step 4: Handle case where invitee doesn't exist - create placeholder user
      let targetInviteeUser = inviteeUser;
      const userExistedBefore = !!inviteeUser;
      
      if (!inviteeUser) {
        console.log(`Creating placeholder user for invited email: ${inviteeEmail}`);
        const User = require('../models/User');
        targetInviteeUser = await User.createFromCognito({
          email: inviteeEmail.trim().toLowerCase(),
          name: inviteeEmail.split('@')[0],
          cognitoId: `temp_invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }

      // Step 5: Add participant using cognitoIds
      try {
        await participantService.addParticipant({
          sessionId, 
          cognitoId: targetInviteeUser.cognitoId,
          role: targetRole,
          invitedBy: inviterUser.cognitoId
        });

        ParticipantErrorHandler.success(res, 
          userExistedBefore 
            ? "User invited to session successfully"
            : "Invitation sent to new user - they can join when they create an account",
          {
            userExistedBefore,
            inviteeEmail: targetInviteeUser.email
          }
        );

      } catch (participantError) {
        // Handle case where user is already a participant
        if (participantError.message.includes('already a participant')) {
          const existingParticipant = await participantService.getParticipant(sessionId, targetInviteeUser.cognitoId);
          
          if (existingParticipant) {
            return ParticipantErrorHandler.participantExists(res, inviteeEmail, existingParticipant.role);
          }
        }
        
        throw participantError;
      }
      
    } catch (error) {
      ParticipantErrorHandler.handleServiceError(res, error, "inviting user");
    }
  });

  /**
   * Leave a session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  leaveSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { userEmail } = req;

    // Step 1: Validate input and resolve user
    const validation = await ParticipantValidation.validateSessionJoin({
      sessionId,
      userEmail
    }, res);
    
    if (!validation) return; // Validation failed, response already sent

    const { user } = validation;

    try {
      // Step 2: Remove participant (leave session)
      await participantService.removeParticipant(sessionId, user.cognitoId);

      ParticipantErrorHandler.success(res, "Left session successfully");
    } catch (error) {
      ParticipantErrorHandler.handleServiceError(res, error, "leaving session");
    }
  });

  /**
   * Remove participant from session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  removeParticipant = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { participantEmail, removerEmail } = req.body;
    const userEmail = removerEmail || req.userEmail;

    // Step 1: Validate removal request
    const validation = await ParticipantValidation.validateParticipantRemoval({
      sessionId,
      participantEmail,
      removerEmail: userEmail
    }, res);
    
    if (!validation) return; // Validation failed, response already sent

    const { participantUser, removerUser } = validation;

    try {
      // Step 2: Check if remover has permission to remove participants
      const permissionCheck = await ParticipantValidation.checkPermission(
        sessionId,
        removerUser.cognitoId,
        'remove',
        res
      );
      
      if (!permissionCheck) return; // Permission denied, response already sent

      // Step 3: Remove participant
      await participantService.removeParticipant(sessionId, participantUser.cognitoId);

      ParticipantErrorHandler.success(res, "Participant removed successfully");
    } catch (error) {
      ParticipantErrorHandler.handleServiceError(res, error, "removing participant");
    }
  });

  /**
   * Transfer ownership of session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  transferOwnership = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { newOwnerEmail, currentOwnerEmail } = req.body;
    const userEmail = currentOwnerEmail || req.userEmail;

    // Step 1: Validate ownership transfer request
    const validation = await ParticipantValidation.validateOwnershipTransfer({
      sessionId,
      currentOwnerEmail: userEmail,
      newOwnerEmail
    }, res);
    
    if (!validation) return; // Validation failed, response already sent

    const { currentOwnerUser, newOwnerUser } = validation;

    try {
      // Step 2: Check if current user is the owner
      const permissionCheck = await ParticipantValidation.checkPermission(
        sessionId,
        currentOwnerUser.cognitoId,
        'transfer',
        res
      );
      
      if (!permissionCheck) return; // Permission denied, response already sent

      // Step 3: Transfer ownership
      await participantService.transferOwnership(
        sessionId, 
        currentOwnerUser.cognitoId, 
        newOwnerUser.cognitoId
      );

      ParticipantErrorHandler.success(res, "Ownership transferred successfully");
    } catch (error) {
      ParticipantErrorHandler.handleServiceError(res, error, "transferring ownership");
    }
  });

  /**
   * Update participant role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  updateParticipantRole = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { participantEmail, newRole, updaterEmail } = req.body;
    const userEmail = updaterEmail || req.userEmail;

    // Step 1: Validate role update request
    const validation = await ParticipantValidation.validateRoleUpdate({
      sessionId,
      participantEmail,
      updaterEmail: userEmail,
      newRole
    }, res);
    
    if (!validation) return; // Validation failed, response already sent

    const { participantUser, updaterUser } = validation;

    try {
      // Step 2: Check if updater can assign roles
      const roleCheck = await ParticipantValidation.checkRoleAssignment(
        sessionId,
        updaterUser.cognitoId,
        newRole,
        res
      );
      
      if (!roleCheck) return; // Role assignment denied, response already sent

      // Step 3: Update participant role
      await participantService.updateParticipantRole(
        sessionId, 
        participantUser.cognitoId, 
        newRole
      );

      ParticipantErrorHandler.success(res, "Participant role updated successfully");
    } catch (error) {
      ParticipantErrorHandler.handleServiceError(res, error, "updating participant role");
    }
  });

  /**
   * Join a session (accept invitation)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  joinSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { userEmail } = req.body;
    const email = userEmail || req.userEmail;

    // Step 1: Validate session join request
    const validation = await ParticipantValidation.validateSessionJoin({
      sessionId,
      userEmail: email
    }, res);
    
    if (!validation) return; // Validation failed, response already sent

    const { user } = validation;

    try {
      // Step 2: Check if user has a pending invitation
      const SessionParticipant = require('../models/SessionParticipant');
      const pendingInvitation = await SessionParticipant.findOne({
        sessionId,
        cognitoId: user.cognitoId,
        status: 'invited'
      });

      if (!pendingInvitation) {
        return ParticipantErrorHandler.permissionDenied(res, "No pending invitation found for this session");
      }

      // Step 3: Accept the invitation
      const result = await participantService.acceptInvitation(sessionId, user.cognitoId);

      ParticipantErrorHandler.success(res, "Successfully joined session", {
        participant: result.participant
      });
    } catch (error) {
      ParticipantErrorHandler.handleServiceError(res, error, "joining session");
    }
  });

  /**
   * Get all participants in a session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  getParticipants = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    // Step 1: Validate session ID
    const validationErrors = SessionValidationUtils.validateInputs({ sessionId });
    if (validationErrors.length > 0) {
      return ParticipantErrorHandler.validationError(res, validationErrors);
    }

    try {
      // Step 2: Get participants
      const participants = await participantService.getSessionParticipants(sessionId);

      ParticipantErrorHandler.success(res, "Participants retrieved successfully", {
        participants,
        totalParticipants: participants.length
      });
    } catch (error) {
      ParticipantErrorHandler.handleServiceError(res, error, "getting session participants");
    }
  });

  /**
   * Get specific participant details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  getParticipant = asyncHandler(async (req, res) => {
    const { sessionId, participantId } = req.params;

    // Step 1: Validate inputs
    const validationErrors = SessionValidationUtils.validateInputs({ sessionId });
    if (validationErrors.length > 0 || !participantId) {
      const errors = validationErrors.length > 0 ? validationErrors : ["Participant ID is required"];
      return ParticipantErrorHandler.validationError(res, errors);
    }

    try {
      // Step 2: Get participant details
      const participant = await participantService.getParticipant(sessionId, participantId);
      
      if (!participant) {
        return ParticipantErrorHandler.userNotFound(res, "Participant not found in this session");
      }

      ParticipantErrorHandler.success(res, "Participant details retrieved successfully", {
        participant
      });
    } catch (error) {
      ParticipantErrorHandler.handleServiceError(res, error, "getting participant details");
    }
  });
}

module.exports = SessionParticipantController;
