/**
 * Simplified Session Service
 * Single responsibility: Core session CRUD operations
 * Aligned with simplified Session model
 */

const Session = require('../models/Session');
const User = require('../models/User');
const { generateSessionId } = require('../utils/sessionUtils');

class SessionService {
  /**
   * Create a new session
   */
  async createSession(sessionData) {
    try {
      const { name, description, creator, sessionId: providedSessionId, user } = sessionData;
      const sessionId = providedSessionId || generateSessionId();

      // Get or create user
      let creatorUser = user;
      if (!creatorUser) {
        creatorUser = await User.findByEmail(creator);
        if (!creatorUser) {
          creatorUser = await User.createFromCognito({
            email: creator,
            name: creator.split('@')[0],
            cognitoId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });
        }
      }

      // Create session
      const session = new Session({
        sessionId,
        name,
        description,
        creator: creatorUser.cognitoId, // Use cognitoId as per simplified model
        status: 'active'
      });

      await session.save();
      
      // Add creator as owner participant with user information
      const SessionParticipant = require('../models/SessionParticipant');
      await SessionParticipant.create({
        sessionId,
        cognitoId: creatorUser.cognitoId,
        role: 'owner',
        status: 'active',
        invitedBy: creatorUser.cognitoId, // Self-created
        username: creatorUser.username,
        displayName: creatorUser.displayName,
        name: creatorUser.name,
        email: creatorUser.email,
        joinedAt: new Date()
      });
      
      // Update session participant count to reflect the new creator
      await session.updateActivity();
      
      return {
        success: true,
        session,
        sessionId
      };

    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    try {
      const session = await Session.findOne({ sessionId, status: 'active' });
      if (!session) {
        throw new Error('Session not found');
      }
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      throw error;
    }
  }

  /**
   * Update session basic info
   */
  async updateSession(sessionId, updates) {
    try {
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Only allow updating name and description
      if (updates.name !== undefined) session.name = updates.name;
      if (updates.description !== undefined) session.description = updates.description;

      await session.save();
      return { success: true, session };
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  /**
   * Archive session (simplified delete)
   */
  async archiveSession(sessionId) {
    try {
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      // Use the session's archive method to properly clean up participants
      await session.archive();
      
      return { success: true, message: 'Session archived successfully' };
    } catch (error) {
      console.error('Error archiving session:', error);
      throw error;
    }
  }



  /**
   * Get sessions for a specific user by email
   */
  async getUserSessions(userEmail) {
    try {
      // console.log('SessionService.getUserSessions called with email:', userEmail);
      
      // Find user by email to get their cognitoId
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        // console.log('User not found for email:', userEmail);
        return [];
      }

      // console.log('Found user:', user.email, 'cognitoId:', user.cognitoId);

      // Find sessions where user is the creator
      const createdSessions = await Session.find({ 
        creator: user.cognitoId, 
        status: 'active' 
      }).sort({ createdAt: -1 });

      // console.log('Found', createdSessions.length, 'sessions created by user');

      // Find sessions where user is a participant
      const SessionParticipant = require('../models/SessionParticipant');
      const participantRecords = await SessionParticipant.find({
        cognitoId: user.cognitoId,
        status: { $in: ['active', 'invited'] } // Include both active and invited participants
      });

      // console.log('Found', participantRecords.length, 'participant records for user');

      // Get unique session IDs from participant records (where user didn't create the session)
      const participatedSessionIds = [];
      for (const record of participantRecords) {
        // Find the actual session to check if user is the creator
        const sessionDoc = await Session.findOne({ sessionId: record.sessionId, status: 'active' });
        if (sessionDoc && sessionDoc.creator !== user.cognitoId) {
          participatedSessionIds.push(record.sessionId);
        }
      }

      // Find sessions where user participates (but didn't create)
      const participatedSessions = await Session.find({
        sessionId: { $in: participatedSessionIds },
        status: 'active'
      }).sort({ createdAt: -1 });

      // console.log('Found', participatedSessions.length, 'sessions where user participates');

      // CONSISTENCY FIX: Create a standardized session transformation function
      const transformSessionForResponse = async (session, isUserCreator, userParticipant = null) => {
        // Use cached participant count from session.activity if available, otherwise count
        const participantCount = session.activity?.participantCount ?? await SessionParticipant.countDocuments({
          sessionId: session.sessionId,
          status: { $in: ['active', 'invited'] }
        });

        // Get basic participant info for UI (name, email, role only)
        const basicParticipants = await SessionParticipant.find({
          sessionId: session.sessionId,
          status: { $in: ['active', 'invited'] }
        }).select('email name displayName role status').lean();

        // CONSISTENCY FIX: Always get creator email for consistency
        let creatorEmail;
        if (isUserCreator) {
          creatorEmail = userEmail; // Current user is creator
        } else {
          // Look up creator email from User collection
          const creatorUser = await User.findOne({ cognitoId: session.creator });
          creatorEmail = creatorUser?.email || session.creator;
        }

        return {
          id: session._id,
          sessionId: session.sessionId,
          name: session.name,
          description: session.description,
          creator: creatorEmail, // CONSISTENCY FIX: Always email format
          isCreator: isUserCreator, // CONSISTENCY FIX: Properly calculated
          status: session.status,
          createdAt: session.createdAt,
          userRole: isUserCreator ? 'owner' : (userParticipant?.role || 'viewer'),
          participantCount: participantCount, // Direct field for frontend compatibility
          activity: session.activity, // Include full activity object
          participants: basicParticipants // Include basic participant info for avatars
        };
      };

      // Transform created sessions with standardized format
      const createdSessionsWithMetadata = await Promise.all(
        createdSessions.map(session => transformSessionForResponse(session, true))
      );

      // Transform participated sessions with standardized format
      const participatedSessionsWithMetadata = await Promise.all(
        participatedSessions.map(async (session) => {
          // Get user's role in this session
          const userParticipant = participantRecords.find(p => p.sessionId === session.sessionId);
          return transformSessionForResponse(session, false, userParticipant);
        })
      );

      // Combine both arrays
      const allSessions = [...createdSessionsWithMetadata, ...participatedSessionsWithMetadata];
      
      // console.log('Returning', allSessions.length, 'total sessions (', createdSessionsWithMetadata.length, 'created +', participatedSessionsWithMetadata.length, 'participated)');
      
      return allSessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw error;
    }
  }
}

module.exports = new SessionService();