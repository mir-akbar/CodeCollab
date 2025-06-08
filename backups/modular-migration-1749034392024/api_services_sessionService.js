const Session = require('../models/Session');
const SessionParticipant = require('../models/SessionParticipant');
const User = require('../models/User');
const { generateSessionId } = require('../utils/sessionUtils');
const { canJoinSession, INVITE_POLICIES } = require('../models/permissions');

class SessionService {
  constructor() {
    console.log('📊 Session system: NEW (Legacy system removed)');
  }

  /**
   * Get user sessions (created + invited)
   */
  async getUserSessions(userEmail, userObj = null) {
    return await this._getUserSessionsNew(userEmail, userObj);
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
  async inviteUserToSession(sessionId, inviterEmail, inviteeEmail, role = 'editor', inviteeUser = null) {
    return await this._inviteUserNew(sessionId, inviterEmail, inviteeEmail, role, inviteeUser);
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

  async _getUserSessionsNew(userEmail, userObj = null) {
    try {
      // Get user using enhanced method
      const user = userObj || await User.findByEmail(userEmail);
      if (!user) {
        // Return empty sessions for non-existent users
        return [];
      }

      // Find user's active participations
      const userParticipations = await SessionParticipant.find({
        user: user._id,
        status: { $in: ['active', 'invited'] }
      });

      if (userParticipations.length === 0) {
        return [];
      }

      // Get unique session IDs
      const sessionIds = [...new Set(userParticipations.map(p => p.sessionId))];

      // Get all active sessions
      const sessions = await Session.find({
        sessionId: { $in: sessionIds },
        status: 'active'
      }).populate('creator', 'email profile');

      // Get all participants for each session using enhanced method
      const sessionsWithParticipants = await Promise.all(
        sessions.map(async (session) => {
          // Use enhanced method to get active participants
          const allParticipants = await SessionParticipant.getActiveParticipants(session.sessionId);
          
          // Find current user's role in this session
          const currentUserParticipant = allParticipants.find(p => 
            p.user && p.user._id.equals(user._id)
          );
          
          return {
            id: session._id,
            sessionId: session.sessionId,
            name: session.name,
            description: session.description,
            creator: session.creator.email, // Return email for compatibility
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            status: session.status,
            isCreator: session.creator._id.equals(user._id),
            role: currentUserParticipant?.role || 'viewer', // Add current user's role
            participants: allParticipants.map(p => {
              const userProfile = p.user ? {
                displayName: p.user.profile.displayName || p.user.email.split('@')[0],
                avatar: p.user.profile.avatar || null,
                bio: p.user.profile.bio || null
              } : null;
              
              return {
                email: p.user ? p.user.email : 'unknown@email.com',
                name: userProfile ? userProfile.displayName : 'Unknown User',
                role: p.role,
                status: p.status,
                access: this._roleToAccess(p.role),
                profile: userProfile,
                userId: p.user ? p.user._id : null
              };
            })
          };
        })
      );

      return sessionsWithParticipants;

    } catch (error) {
      console.error('Error fetching user sessions (new system):', error);
      throw error;
    }
  }

  async _createSessionNew(sessionData) {
    try {
      console.log('🔄 Starting session creation with data:', sessionData);
      const { name, description, creator, sessionId: providedSessionId, user } = sessionData;
      const sessionId = providedSessionId || generateSessionId();
      console.log('🆔 Generated session ID:', sessionId);

      // Get creator user - either from provided user object or look up in database
      let creatorUser = user;
      if (!creatorUser) {
        console.log('👤 Looking up user by email:', creator);
        // Use enhanced User model methods
        creatorUser = await User.findByEmail(creator);
        if (!creatorUser) {
          console.log('➕ Creating new user from Cognito data');
          // Create from Cognito if not found (for migration compatibility)
          creatorUser = await User.createFromCognito({
            email: creator,
            name: creator.split('@')[0],
            cognitoId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });
          console.log('✅ User created:', creatorUser.email, creatorUser._id);
        } else {
          console.log('✅ User found:', creatorUser.email, creatorUser._id);
        }
      }

      console.log('📝 Creating session document...');
      // Create the session with User ObjectId reference
      const session = new Session({
        sessionId,
        name,
        description,
        creator: creatorUser._id, // Use ObjectId reference instead of email
        status: 'active'
      });

      await session.save();
      console.log('✅ Session document saved:', session._id);
      
      console.log('👥 Creating participant invitation...');
      // Add creator as owner participant using enhanced method
      const participant = await SessionParticipant.createInvitation({
        sessionId: session.sessionId,
        userId: creatorUser._id,
        invitedBy: creatorUser._id,
        role: 'owner',
        expiresInHours: 0 // No expiration for owner
      });
      console.log('✅ Participant invitation created:', participant._id);

      console.log('🤝 Accepting invitation...');
      // Immediately accept the invitation for the creator
      await participant.acceptInvitation();
      console.log('✅ Invitation accepted');

      console.log('🎉 Session creation completed successfully');
      return {
        success: true,
        sessionId,
        session: {
          id: session._id,
          sessionId: session.sessionId,
          name: session.name,
          description: session.description,
          creator: creatorUser.email, // Return email for compatibility
          createdAt: session.createdAt,
          participants: [{
            email: creatorUser.email,
            role: 'owner',
            status: 'active',
            userId: creatorUser._id
          }]
        },
        message: 'Session created successfully'
      };

    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  }

  async _inviteUserNew(sessionId, inviterEmail, inviteeEmail, role = 'editor', providedInviteeUser = null) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Get inviter user and check permissions
      const inviterUser = await User.findByEmail(inviterEmail);
      if (!inviterUser) {
        throw new Error('Inviter not found');
      }

      // Check if inviter has permission to invite users using enhanced method
      const inviterParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        user: inviterUser._id,
        status: 'active'
      });

      if (!inviterParticipant) {
        throw new Error('You are not a participant in this session');
      }

      // Use enhanced permission system
      if (!inviterParticipant.hasPermission('invite')) {
        throw new Error('Insufficient permissions to invite users');
      }

      if (!inviterParticipant.canAssignRole(role)) {
        throw new Error(`Insufficient permissions to assign ${role} role`);
      }

      // Get or create invitee user using enhanced methods
      let inviteeUser = providedInviteeUser || await User.findByEmail(inviteeEmail);
      if (!inviteeUser) {
        // Create from Cognito if not found
        inviteeUser = await User.createFromCognito({
          email: inviteeEmail,
          name: inviteeEmail.split('@')[0],
          cognitoId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }

      // Check if user is already a participant
      const existingParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        user: inviteeUser._id
      });

      if (existingParticipant) {
        if (existingParticipant.status === 'active') {
          throw new Error('User is already a participant in this session');
        } else {
          // Reactivate the participant
          await existingParticipant.acceptInvitation();
          existingParticipant.role = role;
          await existingParticipant.save();
        }
      } else {
        // Create new invitation using enhanced method
        await SessionParticipant.createInvitation({
          sessionId: session.sessionId,
          userId: inviteeUser._id,
          invitedBy: inviterUser._id,
          role,
          message: `You have been invited to join ${session.name}`,
          expiresInHours: 168 // 7 days
        });
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

      // Get user using enhanced method
      const user = await User.findByEmail(userEmail);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is session owner using enhanced method
      const isOwner = await SessionParticipant.isSessionOwner(sessionId, user._id);
      if (!isOwner) {
        throw new Error('Only session owner can delete the session');
      }

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

  async _leaveSessionNew(sessionId, userEmail) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Get user using enhanced method
      const user = await User.findByEmail(userEmail);
      if (!user) {
        throw new Error('User not found');
      }

      // Find the participant using enhanced model
      const participant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        user: user._id,
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
      participant.leftAt = new Date();
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

      // Get user using enhanced method
      const user = await User.findByEmail(userEmail);
      if (!user) {
        return { hasAccess: false, reason: 'User not found' };
      }

      // Find the participant using enhanced model
      const participant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        user: user._id,
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

      // Use enhanced method to get active participants
      const participants = await SessionParticipant.getActiveParticipants(session.sessionId);

      return participants.map(p => {
        // Use user profile data if available
        const userProfile = p.user ? {
          displayName: p.user.profile.displayName || p.user.email.split('@')[0],
          avatar: p.user.profile.avatar || null,
          bio: p.user.profile.bio || null,
        } : null;
        
        return {
          email: p.user ? p.user.email : 'unknown@email.com',
          name: userProfile ? userProfile.displayName : 'Unknown User',
          role: p.role,
          access: this._roleToAccess(p.role),
          joinedAt: p.joinedAt,
          lastActiveAt: p.lastActive,
          profile: userProfile,
          userId: p.user ? p.user._id : null
        };
      });

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

      // Get user using enhanced method
      const user = await User.findByEmail(userEmail);
      if (!user) {
        return;
      }

      // Update participant's last active time using enhanced method
      const participant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        user: user._id,
        status: 'active'
      });

      if (participant) {
        await participant.updateActivity('general');
      }

    } catch (error) {
      console.error('Error updating last active:', error);
    }
  }

  async _getSessionDetailsNew(sessionId) {
    try {
      // Find the session
      const session = await Session.findOne({ sessionId }).populate('creator', 'email profile');
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Use enhanced method to get participants
      const participants = await SessionParticipant.getActiveParticipants(session.sessionId);
      
      return {
        id: session._id,
        sessionId: session.sessionId,
        name: session.name,
        description: session.description,
        creator: session.creator.email, // Return email for compatibility
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        status: session.status,
        participants: participants.map(p => {
          // Use user profile data if available
          const userProfile = p.user ? {
            displayName: p.user.profile.displayName || p.user.email.split('@')[0],
            avatar: p.user.profile.avatar || null,
            bio: p.user.profile.bio || null
          } : null;
          
          return {
            email: p.user ? p.user.email : 'unknown@email.com',
            name: userProfile ? userProfile.displayName : 'Unknown User',
            role: p.role,
            status: p.status,
            access: this._roleToAccess(p.role),
            joinedAt: p.joinedAt,
            profile: userProfile,
            userId: p.user ? p.user._id : null
          };
        })
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

      // Get remover user using enhanced method
      const removerUser = await User.findByEmail(removerEmail);
      if (!removerUser) {
        throw new Error('Remover user not found');
      }

      // Get participant user using enhanced method
      const participantUser = await User.findByEmail(participantEmail);
      if (!participantUser) {
        throw new Error('Participant user not found');
      }

      // Check if remover has permission to remove participants
      const remover = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        user: removerUser._id,
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
        user: participantUser._id,
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
      participant.leftAt = new Date();
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

      // Get current owner user using enhanced method
      const currentOwnerUser = await User.findByEmail(currentOwnerEmail);
      if (!currentOwnerUser) {
        throw new Error('Current owner user not found');
      }

      // Get new owner user using enhanced method
      const newOwnerUser = await User.findByEmail(newOwnerEmail);
      if (!newOwnerUser) {
        throw new Error('New owner user not found');
      }

      // Verify current owner
      const currentOwner = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        user: currentOwnerUser._id,
        role: 'owner',
        status: 'active'
      });

      if (!currentOwner) {
        throw new Error('Current user is not the owner');
      }

      // Find new owner participant
      const newOwner = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        user: newOwnerUser._id,
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

      // Update session creator to use ObjectId reference
      session.creator = newOwnerUser._id;
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

      // Get updater user using enhanced method
      const updaterUser = await User.findByEmail(updaterEmail);
      if (!updaterUser) {
        throw new Error('Updater user not found');
      }

      // Get participant user using enhanced method
      const participantUser = await User.findByEmail(participantEmail);
      if (!participantUser) {
        throw new Error('Participant user not found');
      }

      // Check if updater has permission to change roles
      const updater = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        user: updaterUser._id,
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
        user: participantUser._id,
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

      // Use enhanced permission system to check if user can join
      const joinCheck = canJoinSession(userEmail, session.settings);
      if (!joinCheck.allowed) {
        throw new Error(joinCheck.reason);
      }

      // Check session capacity
      const currentParticipantCount = await SessionParticipant.countDocuments({
        sessionId: session.sessionId,
        status: { $in: ['active', 'invited'] }
      });

      if (session.isAtCapacity(currentParticipantCount)) {
        throw new Error('Session has reached maximum participant capacity');
      }

      // Get or create user using enhanced methods
      let user = await User.findByEmail(userEmail);
      if (!user) {
        // Create from Cognito if not found
        user = await User.createFromCognito({
          email: userEmail,
          name: userEmail.split('@')[0],
          cognitoId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }

      // Check if user is already a participant
      const existingParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        user: user._id
      });

      if (existingParticipant) {
        if (existingParticipant.status === 'active') {
          throw new Error('User is already a participant in this session');
        } else {
          // Reactivate the participant
          await existingParticipant.acceptInvitation();
          existingParticipant.role = requestedRole;
          await existingParticipant.save();
        }
      } else {
        // Create new invitation using enhanced method
        await SessionParticipant.createInvitation({
          sessionId: session.sessionId,
          userId: user._id,
          invitedBy: user._id, // Self-invite
          role: requestedRole,
          message: `Self-invited to ${session.name}`,
          expiresInHours: 0 // No expiration for self-invites
        });

        // Immediately accept the self-invitation
        const participant = await SessionParticipant.findOne({
          sessionId: session.sessionId,
          user: user._id
        });
        await participant.acceptInvitation();
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

      // Get user using enhanced method
      const user = await User.findByEmail(userEmail);
      if (!user) {
        throw new Error('User not found');
      }

      // Find the participant
      const participant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        user: user._id,
        status: 'active'
      });

      if (!participant) {
        throw new Error('User is not a participant in this session');
      }
      
      // Use enhanced permission system to check requestRole action
      const permResult = participant.hasPermissionWithSettings('requestRole', session.settings, userEmail);
      if (!permResult.allowed) {
        throw new Error(permResult.reason || 'Role requests are not allowed for this session');
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

      // Get updater user using enhanced method
      const updaterUser = await User.findByEmail(updaterEmail);
      if (!updaterUser) {
        throw new Error('Updater user not found');
      }

      // Check if updater has permission to update settings
      const updater = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        user: updaterUser._id,
        status: 'active'
      }).populate('user', 'email');

      if (!updater) {
        throw new Error('You are not a participant in this session');
      }

      // Use unified permission system with session settings context
      const permissionResult = updater.hasPermissionWithSettings(
        'manageSession', 
        session.settings,
        updaterUser.email
      );
      
      if (!permissionResult.allowed) {
        throw new Error(permissionResult.reason || 'Insufficient permissions to update session settings');
      }
      
      // Validate and modify each setting individually
      if (newSettings.settings) {
        const updatedSettings = {};
        const currentSettings = session.settings || {};
        
        for (const settingName of Object.keys(newSettings.settings)) {
          // Check permission for this specific setting
          if (!updater.canModifySessionSetting(settingName)) {
            throw new Error(`Insufficient permissions to modify setting: ${settingName}`);
          }
          
          const newValue = newSettings.settings[settingName];
          
          // Perform setting-specific validation
          switch(settingName) {
            case 'invitePolicy': {
              // Validate invite policy against session privacy
              if (newValue === INVITE_POLICIES.OPEN && 
                  (currentSettings.isPrivate || newSettings.settings.isPrivate)) {
                throw new Error('Private sessions cannot have open invite policy');
              }
              // Validate against allowed domains
              if ((newValue === INVITE_POLICIES.SELF_INVITE || newValue === INVITE_POLICIES.OPEN) &&
                  !currentSettings.allowedDomains?.length && 
                  !newSettings.settings.allowedDomains?.length) {
                console.warn('Warning: Open/self-invite policy without domain restrictions');
              }
              break;
            }
            
            case 'allowedDomains': {
              // Ensure array format
              if (newValue && !Array.isArray(newValue)) {
                throw new Error('allowedDomains must be an array');
              }
              break;
            }
              
            case 'maxParticipants': {
              // Ensure positive number
              if (typeof newValue !== 'number' || newValue < 1) {
                throw new Error('maxParticipants must be a positive number');
              }
              
              // Check against current participant count
              const participantCount = await SessionParticipant.countDocuments({
                sessionId: session.sessionId,
                status: { $in: ['active', 'invited'] }
              });
              
              if (newValue < participantCount) {
                throw new Error(`Cannot set maxParticipants below current count (${participantCount})`);
              }
              break;
            }
          }
          
          // Add validated setting to updates
          updatedSettings[settingName] = newValue;
        }
        
        // Update the settings (validated individually)
        session.settings = { ...session.settings, ...updatedSettings };
      }
      
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
  
  /**
   * Utility method to enrich participant data with user profile information
   * @param {Object} participant - Session participant object
   * @return {Object} - Enhanced participant with user profile data
   */
  async _enrichParticipantWithUserProfile(participant) {
    try {
      // If participant is already populated, use the populated user data
      if (participant.user && participant.user.email) {
        const user = participant.user;
        
        const userProfile = {
          displayName: user.profile.displayName || user.email.split('@')[0],
          avatar: user.profile.avatar || null,
          bio: user.profile.bio || null,
          timezone: user.profile.timezone || null,
          language: user.profile.language || null
        };
        
        return {
          email: user.email,
          name: userProfile.displayName,
          role: participant.role,
          status: participant.status,
          access: this._roleToAccess(participant.role),
          joinedAt: participant.joinedAt,
          lastActiveAt: participant.lastActive,
          profile: userProfile,
          userId: user._id
        };
      }
      
      // If not populated, find the user by ObjectId
      const user = await User.findById(participant.user);
      
      if (!user) {
        return {
          email: 'unknown@example.com',
          name: 'Unknown User',
          role: participant.role,
          status: participant.status,
          access: this._roleToAccess(participant.role),
          joinedAt: participant.joinedAt,
          lastActiveAt: participant.lastActive,
          userId: participant.user
        };
      }
      
      // Extract profile information
      const userProfile = {
        displayName: user.profile.displayName || user.email.split('@')[0],
        avatar: user.profile.avatar || null,
        bio: user.profile.bio || null,
        timezone: user.profile.timezone || null,
        language: user.profile.language || null
      };
      
      // Return enhanced participant data
      return {
        email: user.email,
        name: userProfile.displayName,
        role: participant.role,
        status: participant.status,
        access: this._roleToAccess(participant.role),
        joinedAt: participant.joinedAt,
        lastActiveAt: participant.lastActive,
        profile: userProfile,
        userId: user._id
      };
    } catch (error) {
      console.error('Error enriching participant data:', error);
      return {
        email: 'error@example.com',
        name: 'Error Loading User',
        role: participant.role,
        status: participant.status,
        access: this._roleToAccess(participant.role),
        joinedAt: participant.joinedAt,
        lastActiveAt: participant.lastActive,
        userId: participant.user
      };
    }
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