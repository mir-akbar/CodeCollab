const Session = require('../models/Session');
const SessionParticipant = require('../models/SessionParticipant');
const { generateSessionId } = require('../utils/sessionUtils');
const { validateEmail, validateRole, validateSessionData } = require('../utils/validators');
const permissions = require('../utils/permissions');
const mongoose = require('mongoose');

class SessionService {
  constructor() {
    console.log('📊 Session system: NEW (Legacy system removed)');
  }

  // =============================================================================
  // INPUT VALIDATION HELPERS
  // =============================================================================

  _validateSessionData(sessionData) {
    const { name, description, creator } = sessionData;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Session name is required and must be a non-empty string');
    }
    
    if (!creator || !validateEmail(creator)) {
      throw new Error('Valid creator email is required');
    }
    
    if (description && typeof description !== 'string') {
      throw new Error('Description must be a string');
    }
    
    return {
      name: name.trim(),
      description: description?.trim() || '',
      creator: creator.toLowerCase().trim()
    };
  }

  _validateRole(role) {
    const validRoles = permissions.getValidRoles();
    const normalizedRole = permissions.normalizeRole(role);
    
    if (!validRoles.includes(normalizedRole)) {
      throw new Error(`Invalid role: ${role}. Valid roles are: ${validRoles.join(', ')}`);
    }
    
    return normalizedRole;
  }

  _extractUsername(email) {
    if (!email || !validateEmail(email)) {
      throw new Error('Invalid email format');
    }
    return email.split('@')[0];
  }

  // =============================================================================
  // PERMISSION CHECKING HELPERS
  // =============================================================================

  async _checkUserPermission(sessionId, userEmail, requiredAction) {
    const participant = await SessionParticipant.findOne({
      sessionId,
      userEmail,
      status: 'active'
    });

    if (!participant) {
      throw new Error('You are not an active participant in this session');
    }

    if (!permissions.hasPermission(participant.role, requiredAction)) {
      throw new Error(`Insufficient permissions. Required: ${requiredAction}, Your role: ${participant.role}`);
    }

    return participant;
  }

  async _validateRoleAssignment(sessionId, assignerEmail, targetRole) {
    const assigner = await SessionParticipant.findOne({
      sessionId,
      userEmail: assignerEmail,
      status: 'active'
    });

    if (!assigner) {
      throw new Error('You are not an active participant in this session');
    }

    if (!permissions.canAssignRole(assigner.role, targetRole)) {
      throw new Error(`You cannot assign ${targetRole} role. Your role: ${assigner.role}`);
    }

    return assigner;
  }

  // =============================================================================
  // CORE METHODS
  // =============================================================================

  /**
   * Get user sessions (created + invited)
   */
  async getUserSessions(userEmail) {
    if (!validateEmail(userEmail)) {
      throw new Error('Valid email is required');
    }
    return await this._getUserSessionsNew(userEmail.toLowerCase().trim());
  }

  /**
   * Create a new session with transaction safety
   */
  async createSession(sessionData) {
    const validatedData = this._validateSessionData(sessionData);
    
    const session = await mongoose.connection.transaction(async () => {
      return await this._createSessionNew(validatedData);
    });
    
    return session;
  }

  /**
   * Invite user to session
   */
  async inviteUserToSession(sessionId, inviterEmail, inviteeEmail, role = 'editor') {
    if (!sessionId || !validateEmail(inviterEmail) || !validateEmail(inviteeEmail)) {
      throw new Error('Valid sessionId and emails are required');
    }
    
    const validatedRole = this._validateRole(role);
    
    return await this._inviteUserNew(
      sessionId,
      inviterEmail.toLowerCase().trim(),
      inviteeEmail.toLowerCase().trim(),
      validatedRole
    );
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId, userEmail) {
    if (!sessionId || !validateEmail(userEmail)) {
      throw new Error('Valid sessionId and email are required');
    }
    
    return await this._deleteSessionNew(sessionId, userEmail.toLowerCase().trim());
  }

  /**
   * Leave session (user leaves themselves)
   */
  async leaveSession(sessionId, userEmail) {
    if (!sessionId || !validateEmail(userEmail)) {
      throw new Error('Valid sessionId and email are required');
    }
    
    return await this._leaveSessionNew(sessionId, userEmail.toLowerCase().trim());
  }

  /**
   * Check if user has access to session
   */
  async checkSessionAccess(sessionId, userEmail) {
    try {
      if (!sessionId || !validateEmail(userEmail)) {
        return { hasAccess: false, reason: 'Invalid parameters' };
      }
      
      return await this._checkSessionAccessNew(sessionId, userEmail.toLowerCase().trim());
    } catch (error) {
      console.error('Error checking session access:', error);
      return { hasAccess: false, reason: 'Error checking access' };
    }
  }

  /**
   * Update participant role
   */
  async updateParticipantRole(sessionId, updaterEmail, participantEmail, newRole) {
    if (!sessionId || !validateEmail(updaterEmail) || !validateEmail(participantEmail)) {
      throw new Error('Valid sessionId and emails are required');
    }

    const validatedRole = this._validateRole(newRole);
    
    return await this._updateParticipantRoleNew(
      sessionId,
      updaterEmail.toLowerCase().trim(),
      participantEmail.toLowerCase().trim(),
      validatedRole
    );
  }

  /**
   * Remove participant from session
   */
  async removeParticipant(sessionId, removerEmail, participantEmail) {
    if (!sessionId || !validateEmail(removerEmail) || !validateEmail(participantEmail)) {
      throw new Error('Valid sessionId and emails are required');
    }
    
    return await this._removeParticipantNew(
      sessionId,
      removerEmail.toLowerCase().trim(),
      participantEmail.toLowerCase().trim()
    );
  }

  // =============================================================================
  // IMPLEMENTATION METHODS (with proper permission integration)
  // =============================================================================

  async _createSessionNew(sessionData) {
    const session = await mongoose.connection.transaction(async () => {
      const { name, description, creator, sessionId: providedSessionId } = sessionData;
      const sessionId = providedSessionId || generateSessionId();

      // Create the session
      const session = new Session({
        sessionId,
        name,
        description,
        creator,
        status: 'active',
        settings: {
          maxParticipants: 50,
          allowSelfInvite: false,
          allowRoleRequests: false,
          allowedDomains: []
        }
      });

      await session.save();

      // Add creator as owner participant
      const participant = new SessionParticipant({
        sessionId: session.sessionId,
        userEmail: creator,
        userName: this._extractUsername(creator),
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
        invitedBy: creator
      });

      await participant.save();

      return {
        success: true,
        sessionId,
        session: {
          id: session._id,
          sessionId: session.sessionId,
          name: session.name,
          description: session.description,
          creator: session.creator,
          createdAt: session.createdAt,
          participants: [{
            email: creator,
            role: 'owner',
            status: 'active'
          }]
        },
        message: 'Session created successfully'
      };
    });

    return session;
  }

  async _inviteUserNew(sessionId, inviterEmail, inviteeEmail, role = 'editor') {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Check permissions using the permission system
      await this._checkUserPermission(sessionId, inviterEmail, 'invite');
      
      // Validate role assignment
      await this._validateRoleAssignment(sessionId, inviterEmail, role);

      // Check if user is already a participant
      const existingParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: inviteeEmail
      });

      if (existingParticipant) {
        if (existingParticipant.status === 'active') {
          throw new Error('User is already a participant in this session');
        } else if (permissions.canTransitionStatus(existingParticipant.status, 'active')) {
          // Reactivate the participant
          existingParticipant.status = 'active';
          existingParticipant.role = role;
          existingParticipant.joinedAt = new Date();
          existingParticipant.invitedBy = inviterEmail;
          await existingParticipant.save();
        } else {
          throw new Error(`Cannot reactivate participant with status: ${existingParticipant.status}`);
        }
      } else {
        // Create new participant
        const participant = new SessionParticipant({
          sessionId: session.sessionId,
          userEmail: inviteeEmail,
          userName: this._extractUsername(inviteeEmail),
          role,
          status: 'active',
          joinedAt: new Date(),
          invitedBy: inviterEmail
        });

        await participant.save();
      }

      return {
        success: true,
        message: 'User invited successfully'
      };

    } catch (error) {
      console.error('Error inviting user:', error);
      throw error;
    }
  }

  async _deleteSessionNew(sessionId, userEmail) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Check permissions using the permission system
      await this._checkUserPermission(sessionId, userEmail, 'delete');

      // Mark session as deleted
      session.status = 'deleted';
      await session.save();

      // Remove all participants
      await SessionParticipant.updateMany(
        { sessionId: session.sessionId },
        { status: 'removed' }
      );

      return {
        success: true,
        message: 'Session deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  async _updateParticipantRoleNew(sessionId, updaterEmail, participantEmail, newRole) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Check permissions
      await this._checkUserPermission(sessionId, updaterEmail, 'changeRoles');
      await this._validateRoleAssignment(sessionId, updaterEmail, newRole);

      // Find the participant to update
      const participant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: participantEmail,
        status: 'active'
      });

      if (!participant) {
        throw new Error('Participant not found');
      }

      // Cannot change owner role
      if (participant.role === 'owner') {
        throw new Error('Cannot change owner role');
      }

      participant.role = newRole;
      await participant.save();

      return {
        success: true,
        message: 'Role updated successfully',
        participant: {
          email: participant.userEmail,
          role: participant.role,
          permissions: permissions.ROLE_PERMISSIONS[participant.role]
        }
      };

    } catch (error) {
      console.error('Error updating participant role:', error);
      throw error;
    }
  }

  async _removeParticipantNew(sessionId, removerEmail, participantEmail) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Check permissions
      await this._checkUserPermission(sessionId, removerEmail, 'remove');

      // Find and remove the participant
      const participant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: participantEmail,
        status: 'active'
      });

      if (!participant) {
        throw new Error('Participant not found');
      }

      // Cannot remove the owner
      if (participant.role === 'owner') {
        throw new Error('Cannot remove the session owner');
      }

      // Validate status transition
      if (!permissions.canTransitionStatus(participant.status, 'removed')) {
        throw new Error(`Cannot remove participant with status: ${participant.status}`);
      }

      participant.status = 'removed';
      await participant.save();

      return {
        success: true,
        message: 'Participant removed successfully'
      };

    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }

  async _checkSessionAccessNew(sessionId, userEmail) {
    try {
      const session = await Session.findOne({ 
        sessionId, 
        status: 'active' 
      }).lean();
      
      if (!session) {
        return { hasAccess: false, reason: 'Session not found or inactive' };
      }

      const participant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: userEmail,
        status: 'active'
      }).lean();

      if (!participant) {
        return { hasAccess: false, reason: 'User is not a participant' };
      }

      return {
        hasAccess: true,
        role: participant.role,
        permissions: permissions.ROLE_PERMISSIONS[participant.role],
        sessionData: {
          id: session._id,
          sessionId: session.sessionId,
          name: session.name,
          description: session.description,
          creator: session.creator,
          settings: session.settings
        }
      };

    } catch (error) {
      console.error('Error checking session access:', error);
      return { hasAccess: false, reason: 'Error checking access' };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get user's effective permissions for a session
   */
  async getUserPermissions(sessionId, userEmail) {
    try {
      const participant = await SessionParticipant.findOne({
        sessionId,
        userEmail,
        status: 'active'
      });

      if (!participant) {
        return { permissions: [], role: null };
      }

      return {
        permissions: permissions.ROLE_PERMISSIONS[participant.role] || [],
        role: participant.role,
        canAssignRoles: permissions.ROLE_CHANGE_RULES[participant.role] || []
      };
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return { permissions: [], role: null };
    }
  }

  /**
   * Check if user can perform specific action
   */
  async canUserPerformAction(sessionId, userEmail, action) {
    try {
      const participant = await SessionParticipant.findOne({
        sessionId,
        userEmail,
        status: 'active'
      });

      if (!participant) {
        return false;
      }

      return permissions.hasPermission(participant.role, action);
    } catch (error) {
      console.error('Error checking user action permission:', error);
      return false;
    }
  }

  // Migration status check
  async checkMigrationStatus() {
    return {
      isComplete: true,
      canSafelyRemoveLegacy: true,
      newSystemActive: true,
      legacySystemActive: false,
      message: 'Migration complete - legacy system removed'
    };
  }

  // Health check method
  async healthCheck() {
    try {
      const sessionCount = await Session.countDocuments({ status: 'active' });
      const participantCount = await SessionParticipant.countDocuments({ status: 'active' });
      
      return {
        status: 'healthy',
        activeSessions: sessionCount,
        activeParticipants: participantCount,
        supportedRoles: permissions.getValidRoles(),
        supportedStatuses: permissions.getValidStatuses(),
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = SessionService;