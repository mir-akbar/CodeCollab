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
    const { name, description, creator, sessionId } = req.body;
    
    const result = await this.sessionService.createSession({
      name: name.trim(),
      description: description?.trim() || '',
      creator: creator,
      sessionId: sessionId // Pass through if provided
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
    const { inviteeEmail, role, inviterEmail } = req.body; // Validation middleware normalizes these fields

    if (!inviteeEmail) {
      return res.status(400).json({ 
        success: false,
        error: "Invitee email is required" 
      });
    }

    if (!inviterEmail) {
      return res.status(400).json({ 
        success: false,
        error: "Inviter email is required" 
      });
    }

    try {
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
    } catch (error) {
      console.error("Error inviting user:", error);
      
      // Handle specific error types with appropriate status codes
      if (error.message.includes('Permission denied') || 
          error.message.includes('already invited') ||
          error.message.includes('already a participant')) {
        res.status(403).json({ 
          success: false,
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false,
          error: "Internal server error",
          details: error.message
        });
      }
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

  /**
   * Remove participant from session
   */
  removeParticipant = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { participantEmail, removerEmail } = req.body;
    const userEmail = removerEmail || req.userEmail;

    if (!participantEmail) {
      return res.status(400).json({ 
        success: false,
        error: "Participant email is required" 
      });
    }

    try {
      const result = await this.sessionService.removeParticipant(sessionId, userEmail, participantEmail);

      if (result.success) {
        res.status(200).json({ 
          success: true,
          message: "Participant removed successfully" 
        });
      } else {
        res.status(400).json({ 
          success: false,
          error: result.error || "Failed to remove participant"
        });
      }
    } catch (error) {
      console.error("Error removing participant:", error);
      res.status(500).json({ 
        success: false,
        error: "Internal server error",
        details: error.message
      });
    }
  });

  /**
   * Transfer ownership of session
   */
  transferOwnership = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { newOwnerEmail, currentOwnerEmail } = req.body;
    const userEmail = currentOwnerEmail || req.userEmail;

    if (!newOwnerEmail) {
      return res.status(400).json({ 
        success: false,
        error: "New owner email is required" 
      });
    }

    try {
      const result = await this.sessionService.transferOwnership(sessionId, userEmail, newOwnerEmail);

      if (result.success) {
        res.status(200).json({ 
          success: true,
          message: "Ownership transferred successfully" 
        });
      } else {
        res.status(400).json({ 
          success: false,
          error: result.error || "Failed to transfer ownership"
        });
      }
    } catch (error) {
      console.error("Error transferring ownership:", error);
      res.status(500).json({ 
        success: false,
        error: "Internal server error",
        details: error.message
      });
    }
  });

  /**
   * Update participant role
   */
  updateParticipantRole = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { participantEmail, newRole, updaterEmail } = req.body;
    const userEmail = updaterEmail || req.userEmail;

    if (!participantEmail || !newRole) {
      return res.status(400).json({ 
        success: false,
        error: "Participant email and new role are required" 
      });
    }

    try {
      const result = await this.sessionService.updateParticipantRole(sessionId, userEmail, participantEmail, newRole);

      if (result.success) {
        res.status(200).json({ 
          success: true,
          message: "Participant role updated successfully" 
        });
      } else {
        res.status(400).json({ 
          success: false,
          error: result.error || "Failed to update participant role"
        });
      }
    } catch (error) {
      console.error("Error updating participant role:", error);
      res.status(500).json({ 
        success: false,
        error: "Internal server error",
        details: error.message
      });
    }
  });

  /**
   * Health check endpoint for session system
   */
  healthCheck = asyncHandler(async (req, res) => {
    try {
      // If we have a healthCheck method on the service, use it
      if (typeof this.sessionService.healthCheck === 'function') {
        const healthStatus = await this.sessionService.healthCheck();
        res.json({
          success: true,
          system: 'new',
          ...healthStatus
        });
      } else {
        // Simple health check
        res.json({
          success: true,
          system: 'new',
          status: 'healthy',
          timestamp: new Date()
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        system: 'new',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      });
    }
  });

  /**
   * DEBUG: Check for duplicate participant records
   */
  checkParticipantRecords = asyncHandler(async (req, res) => {
    const { sessionId, userEmail: targetEmail } = req.params;
    const SessionParticipant = require("../models/SessionParticipant");
    
    const participants = await SessionParticipant.find({
      sessionId,
      userEmail: targetEmail
    }).sort({ createdAt: 1 });
    
    res.json({
      success: true,
      count: participants.length,
      participants: participants.map(p => ({
        _id: p._id,
        status: p.status,
        role: p.role,
        createdAt: p.createdAt,
        leftAt: p.leftAt
      }))
    });
  });
}

module.exports = SessionController;
