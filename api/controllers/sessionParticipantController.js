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

class SessionParticipantController {

  /**
   * Invite user to session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  inviteToSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { inviteeEmail, role, inviterEmail } = req.body; // Validation middleware normalizes these fields

    // Enhanced validation
    if (!SessionValidationUtils.isValidSessionId(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid session ID format" 
      });
    }

    if (!SessionValidationUtils.isValidEmail(inviteeEmail)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid invitee email is required" 
      });
    }

    if (!SessionValidationUtils.isValidEmail(inviterEmail)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid inviter email is required" 
      });
    }

    if (role && !SessionValidationUtils.isValidRole(role)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid role. Must be one of: owner, admin, editor, viewer" 
      });
    }

    // Prevent self-invitation
    if (inviteeEmail.toLowerCase() === inviterEmail.toLowerCase()) {
      return res.status(400).json({ 
        success: false,
        error: "Cannot invite yourself to a session" 
      });
    }

    try {
      // Step 1: Resolve inviter email to cognitoId
      const User = require('../models/User');
      let inviterUser = await User.findByEmail(inviterEmail.trim().toLowerCase());
      if (!inviterUser) {
        return res.status(404).json({ 
          success: false,
          error: "Inviter user not found. Please ensure you are logged in." 
        });
      }

      // Step 1.5: Check if inviter has permission to invite users
      const SessionParticipant = require('../models/SessionParticipant');
      const inviterParticipant = await SessionParticipant.findOne({ 
        sessionId, 
        cognitoId: inviterUser.cognitoId,
        status: { $in: ['active', 'invited'] }
      });

      if (!inviterParticipant) {
        return res.status(403).json({ 
          success: false,
          error: "You are not a participant in this session" 
        });
      }

      if (!inviterParticipant.hasPermission('invite')) {
        return res.status(403).json({ 
          success: false,
          error: "You don't have permission to invite users to this session. Only admins and owners can invite users." 
        });
      }

      // Check if inviter can assign the requested role
      if (!inviterParticipant.canAssignRole(role || 'editor')) {
        return res.status(403).json({ 
          success: false,
          error: `You don't have permission to assign the ${role || 'editor'} role. You can only assign roles equal to or lower than your own.` 
        });
      }

      // Step 2: Find or create invitee user
      let inviteeUser = await User.findByEmail(inviteeEmail.trim().toLowerCase());
      const userExistedBefore = !!inviteeUser;
      
      if (!inviteeUser) {
        // Create placeholder user for non-existent account
        console.log(`Creating placeholder user for invited email: ${inviteeEmail}`);
        inviteeUser = await User.createFromCognito({
          email: inviteeEmail.trim().toLowerCase(),
          name: inviteeEmail.split('@')[0],
          cognitoId: `temp_invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }

      // Step 3: Add participant using cognitoIds
      try {
        await participantService.addParticipant({
          sessionId, 
          cognitoId: inviteeUser.cognitoId,
          role: role || 'editor',
          invitedBy: inviterUser.cognitoId
        });

        res.status(200).json({ 
          success: true,
          message: userExistedBefore 
            ? "User invited to session successfully"
            : "Invitation sent to new user - they can join when they create an account",
          userExistedBefore,
          inviteeEmail: inviteeUser.email
        });

      } catch (participantError) {
        // Handle case where user is already a participant
        if (participantError.message.includes('already a participant')) {
          // Check current participant status and role
          const existingParticipant = await participantService.getParticipant(sessionId, inviteeUser.cognitoId);
          
          if (existingParticipant) {
            // User is already in the session, provide informative response
            res.status(200).json({
              success: true,
              message: `${inviteeEmail} is already a ${existingParticipant.role} in this session`,
              userExistedBefore,
              inviteeEmail: inviteeUser.email,
              currentRole: existingParticipant.role,
              alreadyParticipant: true
            });
            return;
          }
        }
        
        // Re-throw for other participant-related errors
        throw participantError;
      }
      
    } catch (error) {
      console.error("Error inviting user:", error);
      
      // Handle specific error types with appropriate status codes
      if (error.message.includes('Permission denied')) {
        res.status(403).json({ 
          success: false,
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false,
          error: "Internal server error",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
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

    // Resolve user email to cognitoId
    const User = require('../models/User');
    const user = await User.findByEmail(userEmail);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    await participantService.removeParticipant(sessionId, user.cognitoId);

    res.status(200).json({ 
      success: true,
      message: "Left session successfully" 
    });
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

    // Enhanced validation
    if (!SessionValidationUtils.isValidSessionId(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid session ID format" 
      });
    }

    if (!SessionValidationUtils.isValidEmail(participantEmail)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid participant email is required" 
      });
    }

    if (!SessionValidationUtils.isValidEmail(userEmail)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid remover email is required" 
      });
    }

    // Prevent self-removal (should use leave session instead)
    if (participantEmail.toLowerCase() === userEmail.toLowerCase()) {
      return res.status(400).json({ 
        success: false,
        error: "Use the leave session endpoint to remove yourself from a session" 
      });
    }

    try {
      // Resolve participant email to cognitoId
      const User = require('../models/User');
      const participantUser = await User.findByEmail(participantEmail.trim().toLowerCase());
      if (!participantUser) {
        return res.status(404).json({ 
          success: false,
          error: "Participant not found" 
        });
      }

      await participantService.removeParticipant(
        sessionId, 
        participantUser.cognitoId
      );

      res.status(200).json({ 
        success: true,
        message: "Participant removed successfully" 
      });
    } catch (error) {
      console.error("Error removing participant:", error);
      res.status(500).json({ 
        success: false,
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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

    // Enhanced validation
    if (!SessionValidationUtils.isValidSessionId(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid session ID format" 
      });
    }

    if (!SessionValidationUtils.isValidEmail(newOwnerEmail)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid new owner email is required" 
      });
    }

    if (!SessionValidationUtils.isValidEmail(userEmail)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid current owner email is required" 
      });
    }

    // Prevent transferring to same user
    if (newOwnerEmail.toLowerCase() === userEmail.toLowerCase()) {
      return res.status(400).json({ 
        success: false,
        error: "Cannot transfer ownership to the current owner" 
      });
    }

    try {
      // Resolve emails to cognitoIds
      const User = require('../models/User');
      const currentOwnerUser = await User.findByEmail(userEmail.trim().toLowerCase());
      if (!currentOwnerUser) {
        return res.status(404).json({ 
          success: false,
          error: "Current owner not found" 
        });
      }

      const newOwnerUser = await User.findByEmail(newOwnerEmail.trim().toLowerCase());
      if (!newOwnerUser) {
        return res.status(404).json({ 
          success: false,
          error: "New owner not found" 
        });
      }

      await participantService.transferOwnership(
        sessionId, 
        currentOwnerUser.cognitoId, 
        newOwnerUser.cognitoId
      );

      res.status(200).json({ 
        success: true,
        message: "Ownership transferred successfully" 
      });
    } catch (error) {
      console.error("Error transferring ownership:", error);
      res.status(500).json({ 
        success: false,
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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

    // Enhanced validation
    if (!SessionValidationUtils.isValidSessionId(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid session ID format" 
      });
    }

    if (!SessionValidationUtils.isValidEmail(participantEmail)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid participant email is required" 
      });
    }

    if (!SessionValidationUtils.isValidRole(newRole)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid role is required. Must be one of: owner, admin, editor, viewer" 
      });
    }

    if (!SessionValidationUtils.isValidEmail(userEmail)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid updater email is required" 
      });
    }

    try {
      // Resolve participant email to cognitoId
      const User = require('../models/User');
      const participantUser = await User.findByEmail(participantEmail.trim().toLowerCase());
      if (!participantUser) {
        return res.status(404).json({ 
          success: false,
          error: "Participant not found" 
        });
      }

      await participantService.updateParticipantRole(
        sessionId, 
        participantUser.cognitoId, 
        newRole
      );

      res.status(200).json({ 
        success: true,
        message: "Participant role updated successfully" 
      });
    } catch (error) {
      console.error("Error updating participant role:", error);
      res.status(500).json({ 
        success: false,
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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

    // Enhanced validation
    if (!SessionValidationUtils.isValidSessionId(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid session ID format" 
      });
    }

    if (!SessionValidationUtils.isValidEmail(email)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid user email is required" 
      });
    }

    try {
      // Resolve user email to cognitoId
      const User = require('../models/User');
      let user = await User.findByEmail(email.trim().toLowerCase());
      if (!user) {
        // Create user if they don't exist (for self-joining open sessions)
        user = await User.createFromCognito({
          email: email.trim().toLowerCase(),
          name: email.split('@')[0],
          cognitoId: `temp_join_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }

      const participant = await participantService.addParticipant({
        sessionId, 
        cognitoId: user.cognitoId,
        role: 'editor', // Default role for joining
        invitedBy: null // No inviter for direct joins
      });

      res.status(200).json({ 
        success: true,
        message: "Successfully joined session",
        participant: participant
      });
    } catch (error) {
      console.error("Error joining session:", error);
      
      // Handle specific error types with appropriate status codes
      if (error.message.includes('not invited') || 
          error.message.includes('already active') ||
          error.message.includes('not found')) {
        res.status(403).json({ 
          success: false,
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false,
          error: "Internal server error",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
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

    // Enhanced validation
    if (!SessionValidationUtils.isValidSessionId(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid session ID format" 
      });
    }

    try {
      const participants = await participantService.getSessionParticipants(sessionId);

      // Return participants information
      res.status(200).json({ 
        success: true,
        participants: participants,
        totalParticipants: participants.length
      });

    } catch (error) {
      console.error("Error getting session participants:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to get session participants",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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

    // Enhanced validation
    if (!SessionValidationUtils.isValidSessionId(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid session ID format" 
      });
    }

    if (!participantId) {
      return res.status(400).json({ 
        success: false,
        error: "Participant ID is required" 
      });
    }

    try {
      const participant = await participantService.getParticipant(sessionId, participantId);
      
      if (!participant) {
        return res.status(404).json({ 
          success: false,
          error: "Participant not found in this session" 
        });
      }

      // Return participant information
      res.status(200).json({ 
        success: true,
        participant: participant
      });

    } catch (error) {
      console.error("Error getting participant details:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to get participant details",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
}

module.exports = SessionParticipantController;
