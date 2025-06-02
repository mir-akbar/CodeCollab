/**
 * Session Controller
 * Handles session-related HTTP requests and responses
 */

const SessionService = require("../services/sessionService");
const { asyncHandler } = require("../middleware/errorHandler");

class SessionController {
  constructor() {
    this.sessionService = new SessionService();
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions = asyncHandler(async (req, res) => {
    const { userEmail } = req;
    
    const sessions = await this.sessionService.getUserSessions(userEmail);
    
    res.json({
      success: true,
      sessions: sessions,
      total: sessions.length,
      userEmail: userEmail
    });
  });

  /**
   * Get a specific session by ID
   */
  getSessionById = asyncHandler(async (req, res) => {
    const { sessionId, userEmail } = req;

    const session = await this.sessionService.getSessionDetails(sessionId);
    
    if (!session) {
      return res.status(404).json({ 
        success: false,
        error: "Session not found" 
      });
    }

    res.json({
      success: true,
      session: session
    });
  });

  /**
   * Create a new session
   */
  createSession = asyncHandler(async (req, res) => {
    const { name, description, creator } = req.body;
    
    const result = await this.sessionService.createSession({
      name: name.trim(),
      description: description?.trim() || '',
      creator: creator
    });

    if (result.success) {
      res.status(201).json({ 
        success: true,
        message: "Session created successfully",
        session: result.session,
        sessionId: result.session.sessionId
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: "Failed to create session",
        details: result.error 
      });
    }
  });

  /**
   * Invite user to session
   */
  inviteToSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { email: inviteeEmail, access = 'edit' } = req.body;
    const inviterEmail = req.body.inviterEmail || req.userEmail;

    // Convert legacy access to role
    const role = access === 'edit' ? 'editor' : 'viewer';
    
    const result = await this.sessionService.inviteUserToSession(
      sessionId, 
      inviterEmail, 
      inviteeEmail, 
      role
    );

    if (result.success) {
      res.status(200).json({ 
        success: true,
        message: "Invitation sent successfully",
        action: result.action 
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: "Failed to send invitation",
        details: result.error 
      });
    }
  });

  /**
   * Leave a session
   */
  leaveSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { userEmail } = req;

    const result = await this.sessionService.leaveSession(sessionId, userEmail);

    if (result.success) {
      res.status(200).json({ 
        success: true,
        message: "Left session successfully" 
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: "Failed to leave session",
        details: result.error 
      });
    }
  });

  /**
   * Delete a session
   */
  deleteSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { userEmail } = req;

    const result = await this.sessionService.deleteSession(sessionId, userEmail);

    if (result.success) {
      res.status(200).json({ 
        success: true,
        message: "Session deleted successfully" 
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: "Failed to delete session",
        details: result.error 
      });
    }
  });

  /**
   * Check session access
   */
  checkAccess = asyncHandler(async (req, res) => {
    const { sessionId, email } = req.query;

    if (!sessionId || !email) {
      return res.status(400).json({ 
        error: "Session ID and email are required" 
      });
    }

    const accessInfo = await this.sessionService.checkSessionAccess(sessionId, email);
    res.json(accessInfo);
  });

  /**
   * Get active users in session
   */
  getActiveUsers = asyncHandler(async (req, res) => {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ error: "session_id is required" });
    }

    const activeUsers = await this.sessionService.getActiveUsers(session_id);
    res.json(activeUsers);
  });

  /**
   * Update user activity in session
   */
  updateActivity = asyncHandler(async (req, res) => {
    const { sessionId, email } = req.body;

    if (!sessionId || !email) {
      return res.status(400).json({ 
        error: "Session ID and email are required" 
      });
    }

    await this.sessionService.updateLastActive(sessionId, email);
    res.status(200).json({ message: "Activity updated" });
  });

  /**
   * Get migration status
   */
  getMigrationStatus = asyncHandler(async (req, res) => {
    const status = await this.sessionService.checkMigrationStatus();
    res.json(status);
  });

  /**
   * Enable new system
   */
  enableNewSystem = asyncHandler(async (req, res) => {
    this.sessionService.enableNewSystem();
    res.json({ 
      message: "Switched to new session system",
      systemActive: "new"
    });
  });

  /**
   * Enable legacy system
   */
  enableLegacySystem = asyncHandler(async (req, res) => {
    this.sessionService.enableLegacySystem();
    res.json({ 
      message: "Switched to legacy session system",
      systemActive: "legacy"
    });
  });
}

module.exports = SessionController;
