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

      session.status = 'archived';
      await session.save();
      
      return { success: true, message: 'Session archived successfully' };
    } catch (error) {
      console.error('Error archiving session:', error);
      throw error;
    }
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions() {
    try {
      return await Session.find({ status: 'active' }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw error;
    }
  }

  /**
   * Get sessions for a specific user by email
   */
  async getUserSessions(userEmail) {
    try {
      console.log('SessionService.getUserSessions called with email:', userEmail);
      
      // Find user by email to get their cognitoId
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        console.log('User not found for email:', userEmail);
        return [];
      }

      console.log('Found user:', user.email, 'cognitoId:', user.cognitoId);

      // Find sessions where user is the creator
      const createdSessions = await Session.find({ 
        creator: user.cognitoId, 
        status: 'active' 
      }).sort({ createdAt: -1 });

      console.log('Found', createdSessions.length, 'sessions created by user');

      // Transform sessions to include user role and other metadata
      const sessionsWithMetadata = createdSessions.map(session => ({
        id: session._id,
        sessionId: session.sessionId,
        name: session.name,
        description: session.description,
        creator: userEmail, // Use email for frontend compatibility
        isCreator: true,
        status: session.status,
        createdAt: session.createdAt,
        userRole: 'owner', // Creator is always owner
        participants: [{ 
          email: userEmail, 
          role: 'owner', 
          status: 'active' 
        }]
      }));

      console.log('Returning', sessionsWithMetadata.length, 'sessions with metadata');
      return sessionsWithMetadata;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw error;
    }
  }
}

module.exports = new SessionService();