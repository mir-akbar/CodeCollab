/**
 * Simplified Participant Service
 * Single responsibility: Session participant management
 * Aligned with simplified SessionParticipant model
 */

const SessionParticipant = require('../models/SessionParticipant');
const Session = require('../models/Session');
const User = require('../models/User');

class ParticipantService {
  /**
   * Get all participants for a session
   * Note: Returns only ACTIVE participants (excludes pending invitations)
   * For invited participants, use the pending invitations endpoint
   */
  async getSessionParticipants(sessionId) {
    try {
      const participants = await SessionParticipant.find({ 
        sessionId,
        status: 'active'  // Only return active participants
      });
      return participants;
    } catch (error) {
      console.error('Error getting session participants:', error);
      throw error;
    }
  }

  /**
   * Get ALL participants for a session (including invited)
   * Use this for admin/management purposes only
   */
  async getAllSessionParticipants(sessionId) {
    try {
      const participants = await SessionParticipant.find({ sessionId });
      return participants;
    } catch (error) {
      console.error('Error getting all session participants:', error);
      throw error;
    }
  }

  /**
   * Add participant to session (invite)
   */
  async addParticipant({ sessionId, cognitoId, role = 'viewer', invitedBy }) {
    try {
      // Check if participant already exists
      const existing = await SessionParticipant.findOne({ sessionId, cognitoId });
      if (existing) {
        throw new Error('User is already a participant in this session');
      }

      // Get user information for participant record
      const user = await User.findOne({ cognitoId });
      if (!user) {
        throw new Error('User not found');
      }

      // Create new participant with user information
      const participant = new SessionParticipant({
        sessionId,
        cognitoId,
        role,
        status: 'invited',
        invitedBy,
        username: user.username,
        displayName: user.displayName,
        name: user.name,
        email: user.email,
        invitedAt: new Date()
      });

      await participant.save();

      // Update session participant count
      const session = await Session.findOne({ sessionId });
      if (session) {
        await session.updateActivity();
      }

      return { success: true, participant };
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }

  /**
   * Update participant role
   */
  async updateParticipantRole(sessionId, cognitoId, newRole) {
    try {
      const participant = await SessionParticipant.findOne({ sessionId, cognitoId });
      if (!participant) {
        throw new Error('Participant not found');
      }

      participant.role = newRole;
      await participant.save();

      // Update session participant count (in case role affects active count)
      const session = await Session.findOne({ sessionId });
      if (session) {
        await session.updateActivity();
      }
      
      return { success: true, participant };
    } catch (error) {
      console.error('Error updating participant role:', error);
      throw error;
    }
  }

  /**
   * Remove participant from session
   */
  async removeParticipant(sessionId, cognitoId) {
    try {
      const result = await SessionParticipant.deleteOne({ sessionId, cognitoId });
      if (result.deletedCount === 0) {
        throw new Error('Participant not found');
      }

      // Update session participant count
      const session = await Session.findOne({ sessionId });
      if (session) {
        await session.updateActivity();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }  /**
   * Transfer ownership to another participant
   */
  async transferOwnership(sessionId, currentOwnerCognitoId, newOwnerCognitoId) {
    try {
      // Verify current owner
      const currentOwner = await SessionParticipant.findOne({ 
        sessionId, 
        cognitoId: currentOwnerCognitoId, 
        role: 'owner' 
      });
      if (!currentOwner) {
        throw new Error('Current user is not the owner');
      }

      // Verify new owner exists as participant
      const newOwner = await SessionParticipant.findOne({ 
        sessionId, 
        cognitoId: newOwnerCognitoId 
      });
      if (!newOwner) {
        throw new Error('New owner must be a session participant');
      }

      // Update roles
      currentOwner.role = 'admin'; // Demote current owner to admin
      newOwner.role = 'owner';
      
      await currentOwner.save();
      await newOwner.save();

      // Also update session creator field
      await Session.updateOne(
        { sessionId },
        { creator: newOwnerCognitoId }
      );

      // Update session participant count (roles might affect counting logic)
      const session = await Session.findOne({ sessionId });
      if (session) {
        await session.updateActivity();
      }

      return { success: true };
    } catch (error) {
      console.error('Error transferring ownership:', error);
      throw error;
    }
  }

  /**
   * Accept invitation (change status from invited to active)
   */
  async acceptInvitation(sessionId, cognitoId) {
    try {
      const participant = await SessionParticipant.findOne({ sessionId, cognitoId });
      if (!participant) {
        throw new Error('Invitation not found');
      }

      if (participant.status === 'active') {
        return { success: true, message: 'Already active participant' };
      }

      participant.status = 'active';
      participant.joinedAt = new Date();
      await participant.save();

      // Update session participant count
      const session = await Session.findOne({ sessionId });
      if (session) {
        await session.updateActivity();
      }

      return { success: true, participant };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Get participant by session and cognitoId
   */
  async getParticipant(sessionId, cognitoId) {
    try {
      const participant = await SessionParticipant.findOne({ sessionId, cognitoId });
      if (!participant) {
        throw new Error('Participant not found');
      }
      return participant;
    } catch (error) {
      console.error('Error getting participant:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific role or higher in session
   */
  async hasPermission(sessionId, cognitoId, requiredRole) {
    try {
      const participant = await SessionParticipant.findOne({ sessionId, cognitoId });
      if (!participant) {
        return false;
      }

      // Role hierarchy: owner > admin > editor > viewer
      const roleHierarchy = { viewer: 0, editor: 1, admin: 2, owner: 3 };
      const userLevel = roleHierarchy[participant.role] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 0;

      return userLevel >= requiredLevel;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }
}

module.exports = new ParticipantService();
