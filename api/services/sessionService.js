const Session = require('../models/Session');
const SessionParticipant = require('../models/SessionParticipant');
const SessionManagement = require('../models/SessionManagement'); // Legacy model
const { generateSessionId } = require('../utils/sessionUtils');

class SessionService {
  constructor() {
    // Enable new system by default for migration completion
    this.useNewSystem = process.env.USE_NEW_SESSION_SYSTEM !== 'false';
    console.log(`📊 Session system mode: ${this.useNewSystem ? 'NEW' : 'LEGACY'}`);
  }

  /**
   * Get user sessions (created + invited)
   */
  async getUserSessions(userEmail) {
    if (this.useNewSystem) {
      return await this._getUserSessionsNew(userEmail);
    } else {
      return await this._getUserSessionsLegacy(userEmail);
    }
  }

  /**
   * Create a new session (handles both systems)
   */
  async createSession(sessionData) {
    if (this.useNewSystem) {
      return await this._createSessionNew(sessionData);
    } else {
      return await this._createSessionLegacy(sessionData);
    }
  }

  /**
   * Invite user to session (handles both systems)
   */
  async inviteUserToSession(sessionId, inviterEmail, inviteeEmail, role = 'editor') {
    if (this.useNewSystem) {
      return await this._inviteUserNew(sessionId, inviterEmail, inviteeEmail, role);
    } else {
      return await this._inviteUserLegacy(sessionId, inviterEmail, inviteeEmail, role);
    }
  }

  /**
   * Delete session (handles both systems)
   */
  async deleteSession(sessionId, userEmail) {
    if (this.useNewSystem) {
      return await this._deleteSessionNew(sessionId, userEmail);
    } else {
      return await this._deleteSessionLegacy(sessionId, userEmail);
    }
  }

  /**
   * Leave session (user leaves themselves)
   */
  async leaveSession(sessionId, userEmail) {
    if (this.useNewSystem) {
      return await this._leaveSessionNew(sessionId, userEmail);
    } else {
      return await this._leaveSessionLegacy(sessionId, userEmail);
    }
  }

  /**
   * Check if user has access to session
   */
  async checkSessionAccess(sessionId, userEmail) {
    if (this.useNewSystem) {
      return await this._checkSessionAccessNew(sessionId, userEmail);
    } else {
      return await this._checkSessionAccessLegacy(sessionId, userEmail);
    }
  }

  /**
   * Get active users in session
   */
  async getActiveUsers(sessionId) {
    if (this.useNewSystem) {
      return await this._getActiveUsersNew(sessionId);
    } else {
      return await this._getActiveUsersLegacy(sessionId);
    }
  }

  /**
   * Update user's last active timestamp
   */
  async updateLastActive(sessionId, userEmail) {
    if (this.useNewSystem) {
      await this._updateLastActiveNew(sessionId, userEmail);
    }
    // Legacy system doesn't track last active
  }

  /**
   * Get session details with participants
   */
  async getSessionDetails(sessionId) {
    if (this.useNewSystem) {
      return await this._getSessionDetailsNew(sessionId);
    } else {
      return await this._getSessionDetailsLegacy(sessionId);
    }
  }

  // =============================================================================
  // NEW SYSTEM METHODS
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
        // Lookup session details
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
    const { name, description, creator } = sessionData;
    const sessionId = generateSessionId();

    try {
      // Create session
      const session = new Session({
        sessionId,
        name,
        description,
        creator,
        status: 'active'
      });

      await session.save();

      // Add creator as owner
      const ownerParticipant = new SessionParticipant({
        sessionId,
        userEmail: creator,
        role: 'owner',
        status: 'active',
        invitedBy: creator,
        joinedAt: new Date()
      });

      await ownerParticipant.save();

      return {
        success: true,
        session: {
          id: session._id,
          sessionId: session.sessionId,
          name: session.name,
          description: session.description,
          creator: session.creator,
          createdAt: session.createdAt,
          isCreator: true,
          participants: [{
            email: creator,
            name: creator.split('@')[0],
            role: 'owner',
            access: 'edit'
          }]
        }
      };

    } catch (error) {
      console.error('Error creating session (new system):', error);
      throw error;
    }
  }

  async _inviteUserNew(sessionId, inviterEmail, inviteeEmail, role = 'editor') {
    try {
      // Check if inviter has permission
      const inviterParticipant = await SessionParticipant.findOne({
        sessionId,
        userEmail: inviterEmail,
        status: 'active',
        role: { $in: ['owner', 'admin'] }
      });

      if (!inviterParticipant) {
        throw new Error('Permission denied: Only owners and admins can invite users');
      }

      // Check if user is already invited/active
      const existingParticipant = await SessionParticipant.findOne({
        sessionId,
        userEmail: inviteeEmail
      });

      if (existingParticipant) {
        if (existingParticipant.status === 'active') {
          throw new Error('User is already a participant in this session');
        } else if (existingParticipant.status === 'invited') {
          throw new Error('User is already invited to this session');
        } else {
          // Reactivate removed user
          existingParticipant.status = 'invited';
          existingParticipant.role = role;
          existingParticipant.invitedBy = inviterEmail;
          await existingParticipant.save();
          return { success: true, action: 'reactivated' };
        }
      }

      // Create new invitation
      const newParticipant = new SessionParticipant({
        sessionId,
        userEmail: inviteeEmail,
        role,
        status: 'invited',
        invitedBy: inviterEmail
      });

      await newParticipant.save();

      return { success: true, action: 'invited' };

    } catch (error) {
      console.error('Error inviting user (new system):', error);
      throw error;
    }
  }

  async _deleteSessionNew(sessionId, userEmail) {
    try {
      // Check if user is the owner OR has admin privileges
      const session = await Session.findOne({ sessionId, status: 'active' });
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Check permissions - allow owners and admin participants
      const participant = await SessionParticipant.findOne({
        sessionId,
        userEmail,
        status: 'active',
        role: { $in: ['owner', 'admin'] }
      });

      if (!participant && session.creator !== userEmail) {
        throw new Error('Permission denied - only owners and admins can delete sessions');
      }

      // Mark session as deleted
      session.status = 'deleted';
      await session.save();

      // Mark all participants as removed
      await SessionParticipant.updateMany(
        { sessionId, status: { $in: ['active', 'invited'] } },
        { status: 'removed' }
      );

      return { success: true };

    } catch (error) {
      console.error('Error deleting session (new system):', error);
      throw error;
    }
  }

  async _leaveSessionNew(sessionId, userEmail) {
    try {
      const participant = await SessionParticipant.findOne({
        sessionId,
        userEmail,
        status: 'active'
      });
      
      if (!participant) {
        throw new Error('User not found in session or already left');
      }
      
      if (participant.role === 'owner') {
        throw new Error('Session owner cannot leave. Transfer ownership or delete the session instead.');
      }
      
      participant.status = 'left';
      participant.leftAt = new Date();
      await participant.save();
      
      return { success: true, message: 'Left session successfully' };
      
    } catch (error) {
      console.error('Error leaving session (new system):', error);
      throw error;
    }
  }

  async _checkSessionAccessNew(sessionId, userEmail) {
    try {
      const participant = await SessionParticipant.findOne({
        sessionId,
        userEmail,
        status: { $in: ['active', 'invited'] }
      });
      
      return participant ? {
        hasAccess: true,
        role: participant.role,
        status: participant.status,
        access: this._roleToAccess(participant.role)
      } : {
        hasAccess: false,
        role: null,
        status: null,
        access: null
      };
    } catch (error) {
      console.error('Error checking session access (new system):', error);
      return { hasAccess: false, role: null, status: null, access: null };
    }
  }

  async _getActiveUsersNew(sessionId) {
    try {
      const participants = await SessionParticipant.find({
        sessionId,
        status: 'active',
        lastActive: { 
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }).sort({ lastActive: -1 }).lean();
      
      return participants.map(p => ({
        email: p.userEmail,
        name: p.userName,
        role: p.role,
        access: this._roleToAccess(p.role),
        lastActive: p.lastActive
      }));
    } catch (error) {
      console.error('Error getting active users (new system):', error);
      return [];
    }
  }

  async _updateLastActiveNew(sessionId, userEmail) {
    try {
      await SessionParticipant.updateOne(
        { sessionId, userEmail, status: 'active' },
        { 
          lastActive: new Date(),
          $setOnInsert: { 
            // Only set these if document doesn't exist (shouldn't happen, but safety)
            joinedAt: new Date(),
            status: 'active' 
          }
        },
        { upsert: false } // Don't create if doesn't exist
      );
    } catch (error) {
      console.error('Error updating last active (new system):', error);
      // Don't throw error for this operation
    }
  }

  async _getSessionDetailsNew(sessionId) {
    try {
      // Get session and all its participants
      const sessionDetails = await Session.aggregate([
        // Match the specific session
        {
          $match: {
            sessionId: sessionId,
            status: 'active'
          }
        },
        // Lookup all participants
        {
          $lookup: {
            from: 'sessionparticipants',
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

      if (!sessionDetails || sessionDetails.length === 0) {
        return null;
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
      console.error('Error fetching session details (new system):', error);
      throw error;
    }
  }

  // =============================================================================
  // LEGACY SYSTEM METHODS (Keep existing logic)
  // =============================================================================

  async _getUserSessionsLegacy(userEmail) {
    // This is the existing complex logic from sessionManage.js
    try {
      const myResults = await SessionManagement.find({ email: userEmail });
      const sharedResults = await SessionManagement.find({ invited_email: userEmail });

      const sessionsMap = {};

      // Process "my sessions"
      for (const row of myResults) {
        const { session_id, _id: id, name, description, uploaded_at, email, invited_email, access } = row;

        if (!sessionsMap[session_id]) {
          sessionsMap[session_id] = {
            id,
            sessionId: session_id,
            name,
            createdAt: uploaded_at,
            isCreator: email === userEmail,
            status: "active",
            type: "mySessions",
            access: "edit",
            description,
            participants: [],
            creator: email
          };
        }

        if (invited_email) {
          sessionsMap[session_id].participants.push({
            email: invited_email,
            name: invited_email.split("@")[0],
            access
          });
        }

        if (!sessionsMap[session_id].participants.some(p => p.email === email)) {
          sessionsMap[session_id].participants.unshift({
            email,
            name: email.split("@")[0],
            access
          });
        }
      }

      // Process shared sessions
      for (const row of sharedResults) {
        const { session_id, _id: id, name, description, uploaded_at, email, invited_email, access } = row;

        if (!sessionsMap[session_id]) {
          sessionsMap[session_id] = {
            id,
            sessionId: session_id,
            name,
            createdAt: uploaded_at,
            isCreator: false,
            status: "active",
            type: "sharedFromOthers",
            access,
            description,
            participants: [],
            creator: email
          };
        }

        if (invited_email) {
          sessionsMap[session_id].participants.push({
            email: invited_email,
            name: invited_email.split("@")[0],
            access
          });
        }

        if (!sessionsMap[session_id].participants.some(p => p.email === email)) {
          sessionsMap[session_id].participants.unshift({
            email,
            name: email.split("@")[0],
            access
          });
        }
      }

      return Object.values(sessionsMap);

    } catch (error) {
      console.error('Error fetching user sessions (legacy system):', error);
      throw error;
    }
  }

  async _createSessionLegacy(sessionData) {
    // Existing legacy creation logic
    const { name, description, creator } = sessionData;
    const sessionId = generateSessionId();

    const sessionRecord = new SessionManagement({
      name,
      description,
      email: creator,
      session_id: sessionId,
      access: 'edit'
    });

    await sessionRecord.save();

    return {
      success: true,
      session: {
        id: sessionRecord._id,
        sessionId: sessionId,
        name,
        description,
        creator,
        createdAt: sessionRecord.uploaded_at,
        isCreator: true,
        participants: [{
          email: creator,
          name: creator.split('@')[0],
          access: 'edit'
        }]
      }
    };
  }

  async _inviteUserLegacy(sessionId, inviterEmail, inviteeEmail, access = 'edit') {
    // Existing legacy invite logic
    const existing = await SessionManagement.findOne({ 
      session_id: sessionId, 
      invited_email: inviteeEmail 
    });

    if (existing) {
      throw new Error('User already invited to this session');
    }

    const sourceSession = await SessionManagement.findOne({ 
      session_id: sessionId, 
      email: inviterEmail 
    });

    if (!sourceSession) {
      throw new Error('Session not found or permission denied');
    }

    const inviteRecord = new SessionManagement({
      name: sourceSession.name,
      email: sourceSession.email,
      invited_email: inviteeEmail,
      description: sourceSession.description,
      file_name: sourceSession.file_name,
      file_path: sourceSession.file_path,
      session_id: sessionId,
      access
    });

    await inviteRecord.save();
    return { success: true };
  }

  async _deleteSessionLegacy(sessionId, userEmail) {
    // Existing legacy delete logic
    const result = await SessionManagement.deleteMany({ session_id: sessionId });
    return { success: result.deletedCount > 0 };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  _roleToAccess(role) {
    switch (role) {
      case 'owner':
      case 'admin':
      case 'editor':
        return 'edit';
      case 'viewer':
        return 'view';
      default:
        return 'view';
    }
  }

  _accessToRole(access) {
    switch (access) {
      case 'edit':
        return 'editor';
      case 'view':
        return 'viewer';
      default:
        return 'viewer';
    }
  }

  /**
   * Switch to new system (for gradual migration)
   */
  enableNewSystem() {
    this.useNewSystem = true;
    console.log('✅ Switched to new session system');
  }

  /**
   * Switch back to legacy system
   */
  enableLegacySystem() {
    this.useNewSystem = false;
    console.log('🔄 Switched to legacy session system');
  }

  /**
   * Check if migration is needed
   */
  async checkMigrationStatus() {
    const totalLegacySessions = await SessionManagement.distinct('session_id').then(ids => 
      ids.filter(id => id != null).length
    );
    
    const migratedSessions = await Session.countDocuments({ 'legacy.migrationComplete': true });
    
    return {
      totalLegacySessions,
      migratedSessions,
      migrationComplete: migratedSessions >= totalLegacySessions,
      migrationProgress: totalLegacySessions > 0 ? (migratedSessions / totalLegacySessions * 100).toFixed(1) : 100
    };
  }
}

module.exports = SessionService;
