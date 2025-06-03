const Session = require('../models/Session');
const SessionParticipant = require('../models/SessionParticipant');
const { generateSessionId } = require('../utils/sessionUtils');

class SessionService {
  constructor() {
    console.log('📊 Session system: NEW (Legacy system removed)');
  }

  /**
   * Get user sessions (created + invited)
   */
  async getUserSessions(userEmail) {
    return await this._getUserSessionsNew(userEmail);
  }

  /**
   * Create a new session
   */
  async createSession(sessionData) {
    return await this._createSessionNew(sessionData);
  }

  /**
   * Invite user to session
   */
  async inviteUserToSession(sessionId, inviterEmail, inviteeEmail, role = 'editor') {
    return await this._inviteUserNew(sessionId, inviterEmail, inviteeEmail, role);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId, userEmail) {
    return await this._deleteSessionNew(sessionId, userEmail);
  }

  /**
   * Leave session (user leaves themselves)
   */
  async leaveSession(sessionId, userEmail) {
    return await this._leaveSessionNew(sessionId, userEmail);
  }

  /**
   * Check if user has access to session
   */
  async checkSessionAccess(sessionId, userEmail) {
    return await this._checkSessionAccessNew(sessionId, userEmail);
  }

  /**
   * Get active users in session
   */
  async getActiveUsers(sessionId) {
    return await this._getActiveUsersNew(sessionId);
  }

  /**
   * Update user's last active timestamp
   */
  async updateLastActive(sessionId, userEmail) {
    await this._updateLastActiveNew(sessionId, userEmail);
  }

  /**
   * Get session details with participants
   */
  async getSessionDetails(sessionId) {
    return await this._getSessionDetailsNew(sessionId);
  }

  /**
   * Remove participant from session
   */
  async removeParticipant(sessionId, removerEmail, participantEmail) {
    return await this._removeParticipantNew(sessionId, removerEmail, participantEmail);
  }

  /**
   * Transfer session ownership
   */
  async transferOwnership(sessionId, currentOwnerEmail, newOwnerEmail) {
    return await this._transferOwnershipNew(sessionId, currentOwnerEmail, newOwnerEmail);
  }

  /**
   * Update participant role
   */
  async updateParticipantRole(sessionId, updaterEmail, participantEmail, newRole) {
    return await this._updateParticipantRoleNew(sessionId, updaterEmail, participantEmail, newRole);
  }

  /**
   * Self-invite to session (if allowed by session settings)
   */
  async selfInviteToSession(sessionId, userEmail, requestedRole = 'viewer') {
    return await this._selfInviteNew(sessionId, userEmail, requestedRole);
  }

  /**
   * Request role change (if allowed by session settings)
   */
  async requestRoleChange(sessionId, userEmail, requestedRole) {
    return await this._requestRoleChangeNew(sessionId, userEmail, requestedRole);
  }

  /**
   * Update session settings
   */
  async updateSessionSettings(sessionId, updaterEmail, newSettings) {
    return await this._updateSessionSettingsNew(sessionId, updaterEmail, newSettings);
  }

  // =============================================================================
  // NEW SYSTEM IMPLEMENTATION
  // =============================================================================

  async _getUserSessionsNew(userEmail) {
    try {
      // Single aggregation pipeline to get all data at once
      const results = await SessionParticipant.aggregate([
        // Match user's participations
        {
          $match: {
            userEmail,
            status: { $in: ['active', 'invited'] }
          }
        },
        // Lookup session details using sessionId string
        {
          $lookup: {
            from: 'sessions',
            localField: 'sessionId',
            foreignField: 'sessionId',
            as: 'session'
          }
        },
        // Filter active sessions only
        {
          $match: {
            'session.status': 'active'
          }
        },
        // Unwind session array
        {
          $unwind: '$session'
        },
        // Lookup all participants for each session
        {
          $lookup: {
            from: 'session_participants',
            localField: 'sessionId',
            foreignField: 'sessionId',
            as: 'allParticipants',
            pipeline: [
              {
                $match: {
                  status: { $in: ['active', 'invited'] }
                }
              }
            ]
          }
        },
        // Group by session to avoid duplicates
        {
          $group: {
            _id: '$sessionId',
            session: { $first: '$session' },
            allParticipants: { $first: '$allParticipants' }
          }
        }
      ]);

      // Transform results to match expected format
      const sessionsWithParticipants = results.map((result) => {
        const session = result.session;
        const participants = result.allParticipants;
        
        return {
          id: session._id,
          sessionId: session.sessionId,
          name: session.name,
          description: session.description,
          creator: session.creator,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          status: session.status,
          isCreator: session.creator === userEmail,
          participants: participants.map(p => ({
            email: p.userEmail,
            name: p.userName,
            role: p.role,
            status: p.status,
            access: this._roleToAccess(p.role) // For backward compatibility
          }))
        };
      });

      return sessionsWithParticipants;

    } catch (error) {
      console.error('Error fetching user sessions (new system):', error);
      throw error;
    }
  }

  async _createSessionNew(sessionData) {
    try {
      const { name, description, creator, sessionId: providedSessionId } = sessionData;
      const sessionId = providedSessionId || generateSessionId();

      // Create the session
      const session = new Session({
        sessionId,
        name,
        description,
        creator,
        status: 'active'
      });

      await session.save();

      // Add creator as owner participant
      const participant = new SessionParticipant({
        sessionId: session.sessionId, // Use sessionId instead of _id for consistency
        userEmail: creator,
        userName: creator.split('@')[0], // Extract username from email
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
        invitedBy: creator // Creator invites themselves
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

    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  async _inviteUserNew(sessionId, inviterEmail, inviteeEmail, role = 'editor') {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Check if inviter has permission to invite users
      const inviterParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId, // Use sessionId string for consistency
        userEmail: inviterEmail,
        status: 'active'
      });

      if (!inviterParticipant) {
        throw new Error('You are not a participant in this session');
      }

      // Use new permission system to check invite permission
      if (!inviterParticipant.hasPermission('invite')) {
        throw new Error('Insufficient permissions to invite users');
      }

      // Check if inviter can assign the requested role
      if (!inviterParticipant.canAssignRole(role)) {
        throw new Error(`Insufficient permissions to assign ${role} role`);
      }

      // Check if user is already a participant
      const existingParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId, // Use sessionId string for consistency
        userEmail: inviteeEmail
      });

      if (existingParticipant) {
        if (existingParticipant.status === 'active') {
          throw new Error('User is already a participant in this session');
        } else {
          // Reactivate the participant
          existingParticipant.status = 'active';
          existingParticipant.role = role;
          existingParticipant.joinedAt = new Date();
          await existingParticipant.save();
        }
      } else {
        // Create new participant
        const participant = new SessionParticipant({
          sessionId: session.sessionId, // Use sessionId string for consistency
          userEmail: inviteeEmail,
          userName: inviteeEmail.split('@')[0], // Extract username from email
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

      // Check if user has permission to delete the session (must be current owner)
      const userParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: userEmail,
        status: 'active'
      });

      if (!userParticipant) {
        throw new Error('You are not a participant in this session');
      }

      if (!userParticipant.hasPermission('delete')) {
        throw new Error('Only session owner can delete the session');
      }

      // Mark session as deleted
      session.status = 'deleted';
      await session.save();

      // Remove all participants
      await SessionParticipant.updateMany(
        { sessionId: session.sessionId }, // Use sessionId string for consistency
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

  async _leaveSessionNew(sessionId, userEmail) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Find the participant
      const participant = await SessionParticipant.findOne({
        sessionId: session.sessionId, // Use sessionId string for consistency
        userEmail: userEmail,
        status: 'active'
      });

      if (!participant) {
        throw new Error('User is not a participant in this session');
      }

      // If user is the owner, they cannot leave (must transfer ownership first)
      if (participant.role === 'owner') {
        throw new Error('Session owner cannot leave. Transfer ownership first.');
      }

      // Remove the participant
      participant.status = 'left';
      await participant.save();

      return {
        success: true,
        message: 'Left session successfully'
      };

    } catch (error) {
      console.error('Error leaving session:', error);
      throw error;
    }
  }

  async _checkSessionAccessNew(sessionId, userEmail) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId, status: 'active' });
      if (!session) {
        return { hasAccess: false, reason: 'Session not found or inactive' };
      }

      // Find the participant
      const participant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: userEmail,
        status: 'active'
      });

      if (!participant) {
        return { hasAccess: false, reason: 'User is not a participant' };
      }

      return {
        hasAccess: true,
        role: participant.role,
        access: this._roleToAccess(participant.role),
        sessionData: {
          id: session._id,
          sessionId: session.sessionId,
          name: session.name,
          description: session.description,
          creator: session.creator
        }
      };

    } catch (error) {
      console.error('Error checking session access:', error);
      return { hasAccess: false, reason: 'Error checking access' };
    }
  }

  async _getActiveUsersNew(sessionId) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        return [];
      }

      // Get active participants
      const participants = await SessionParticipant.find({
        sessionId: session.sessionId,
        status: 'active'
      });

      return participants.map(p => ({
        email: p.userEmail,
        name: p.userName,
        role: p.role,
        access: this._roleToAccess(p.role),
        joinedAt: p.joinedAt,
        lastActiveAt: p.lastActiveAt
      }));

    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  async _updateLastActiveNew(sessionId, userEmail) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        return;
      }

      // Update participant's last active time
      await SessionParticipant.updateOne(
        {
          sessionId: session.sessionId,
          userEmail: userEmail,
          status: 'active'
        },
        {
          lastActiveAt: new Date()
        }
      );

    } catch (error) {
      console.error('Error updating last active:', error);
    }
  }

  async _getSessionDetailsNew(sessionId) {
    try {
      // Find session with participants
      const sessionDetails = await Session.aggregate([
        { $match: { sessionId: sessionId, status: 'active' } },
        {
          $lookup: {
            from: 'session_participants',
            localField: 'sessionId',
            foreignField: 'sessionId',
            as: 'participants',
            pipeline: [
              {
                $match: {
                  status: { $in: ['active', 'invited'] }
                }
              }
            ]
          }
        }
      ]);

      if (!sessionDetails.length) {
        throw new Error('Session not found');
      }

      const session = sessionDetails[0];
      
      return {
        id: session._id,
        sessionId: session.sessionId,
        name: session.name,
        description: session.description,
        creator: session.creator,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        status: session.status,
        participants: session.participants.map(p => ({
          email: p.userEmail,
          name: p.userName,
          role: p.role,
          status: p.status,
          access: this._roleToAccess(p.role),
          joinedAt: p.joinedAt
        }))
      };

    } catch (error) {
      console.error('Error fetching session details:', error);
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

      // Check if remover has permission to remove participants
      const remover = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: removerEmail,
        status: 'active'
      });

      if (!remover) {
        throw new Error('You are not a participant in this session');
      }

      // Use new permission system to check remove permission
      if (!remover.hasPermission('remove')) {
        throw new Error('Insufficient permissions to remove participants');
      }

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

  async _transferOwnershipNew(sessionId, currentOwnerEmail, newOwnerEmail) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Verify current owner
      const currentOwner = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: currentOwnerEmail,
        role: 'owner',
        status: 'active'
      });

      if (!currentOwner) {
        throw new Error('Current user is not the owner');
      }

      // Find new owner participant
      const newOwner = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: newOwnerEmail,
        status: 'active'
      });

      if (!newOwner) {
        throw new Error('New owner is not a participant in this session');
      }

      // Update roles
      currentOwner.role = 'admin';
      await currentOwner.save();

      newOwner.role = 'owner';
      await newOwner.save();

      // Update session creator
      session.creator = newOwnerEmail;
      await session.save();

      return {
        success: true,
        message: 'Ownership transferred successfully'
      };

    } catch (error) {
      console.error('Error transferring ownership:', error);
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

      // Check if updater has permission to change roles
      const updater = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: updaterEmail,
        status: 'active'
      });

      if (!updater) {
        throw new Error('You are not a participant in this session');
      }

      // Use new permission system to check role change permission
      if (!updater.hasPermission('changeRoles')) {
        throw new Error('Insufficient permissions to update roles');
      }

      // Check if updater can assign the new role
      if (!updater.canAssignRole(newRole)) {
        throw new Error(`Insufficient permissions to assign ${newRole} role`);
      }

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

      // Validate new role
      const validRoles = ['viewer', 'editor', 'admin'];
      if (!validRoles.includes(newRole)) {
        throw new Error('Invalid role');
      }

      participant.role = newRole;
      await participant.save();

      return {
        success: true,
        message: 'Role updated successfully'
      };

    } catch (error) {
      console.error('Error updating participant role:', error);
      throw error;
    }
  }

  async _selfInviteNew(sessionId, userEmail, requestedRole = 'viewer') {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Phase 3: Check if self-invite is allowed by session settings
      if (!session.allowsSelfInvite(userEmail)) {
        if (!session.settings.allowSelfInvite) {
          throw new Error('Self-invitation is not allowed for this session');
        } else {
          throw new Error('Your email domain is not allowed for this session');
        }
      }

      // Check session capacity
      const currentParticipantCount = await SessionParticipant.countDocuments({
        sessionId: session.sessionId,
        status: { $in: ['active', 'invited'] }
      });

      if (session.isAtCapacity(currentParticipantCount)) {
        throw new Error('Session has reached maximum participant capacity');
      }

      // Check if user is already a participant
      const existingParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: userEmail
      });

      if (existingParticipant) {
        if (existingParticipant.status === 'active') {
          throw new Error('User is already a participant in this session');
        } else {
          // Reactivate the participant
          existingParticipant.status = 'active';
          existingParticipant.role = requestedRole;
          existingParticipant.joinedAt = new Date();
          await existingParticipant.save();
        }
      } else {
        // Create new participant
        const participant = new SessionParticipant({
          sessionId: session.sessionId,
          userEmail: userEmail,
          userName: userEmail.split('@')[0], // Extract username from email
          role: requestedRole,
          status: 'active',
          joinedAt: new Date(),
          invitedBy: userEmail // Self-invite
        });

        await participant.save();
      }

      return {
        success: true,
        message: 'Self-invited to session successfully'
      };

    } catch (error) {
      console.error('Error self-inviting to session:', error);
      throw error;
    }
  }

  async _requestRoleChangeNew(sessionId, userEmail, requestedRole) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Phase 3: Check if role requests are allowed by session settings
      if (!session.settings.allowRoleRequests) {
        throw new Error('Role requests are not allowed for this session');
      }

      // Find the participant
      const participant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: userEmail,
        status: 'active'
      });

      if (!participant) {
        throw new Error('User is not a participant in this session');
      }

      // Validate the requested role
      const validRoles = ['viewer', 'editor']; // Users can only request lower-level roles
      if (!validRoles.includes(requestedRole)) {
        throw new Error(`Cannot request ${requestedRole} role. Only viewer and editor roles can be requested.`);
      }

      // Cannot request a role higher than current role
      const currentRoleLevel = { viewer: 1, editor: 2, admin: 3, owner: 4 };
      if (currentRoleLevel[requestedRole] > currentRoleLevel[participant.role]) {
        throw new Error('Cannot request a role higher than your current role');
      }

      // For now, auto-approve role requests (in production, this could create pending requests)
      participant.role = requestedRole;
      await participant.save();

      return {
        success: true,
        message: 'Role change applied successfully'
      };

    } catch (error) {
      console.error('Error requesting role change:', error);
      throw error;
    }
  }

  async _updateSessionSettingsNew(sessionId, updaterEmail, newSettings) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Check if updater has permission to update settings
      const updater = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: updaterEmail,
        status: 'active'
      });

      if (!updater) {
        throw new Error('You are not a participant in this session');
      }

      // Use new permission system to check settings update permission
      if (!updater.hasPermission('manageSession')) {
        throw new Error('Insufficient permissions to update session settings');
      }

      // Validate the new settings
      const tempSession = { ...session.toObject(), settings: { ...session.settings, ...newSettings.settings } };
      const validation = session.validateSettings.call({ settings: tempSession.settings });
      if (!validation.success) {
        throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
      }

      // Update session settings
      if (newSettings.settings) {
        Object.assign(session.settings, newSettings.settings);
      }
      if (newSettings.name) session.name = newSettings.name;
      if (newSettings.description) session.description = newSettings.description;
      
      await session.save();

      return {
        success: true,
        message: 'Session settings updated successfully'
      };

    } catch (error) {
      console.error('Error updating session settings:', error);
      throw error;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  _roleToAccess(role) {
    const roleMap = {
      'owner': 'edit',
      'admin': 'edit',
      'editor': 'edit',
      'viewer': 'view'
    };
    return roleMap[role] || 'view';
  }

  // Migration status check (always returns complete since legacy is removed)
  async checkMigrationStatus() {
    return {
      isComplete: true,
      canSafelyRemoveLegacy: true,
      newSystemActive: true,
      legacySystemActive: false,
      message: 'Migration complete - legacy system removed'
    };
  }
}

module.exports = SessionService;