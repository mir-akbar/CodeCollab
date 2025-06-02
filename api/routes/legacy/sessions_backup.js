const express = require("express");
const router = express.Router();
const SessionService = require("../services/sessionService");
const SessionController = require("../controllers/sessionController");
const { requireAuth, validateSessionAccess } = require("../middleware/auth");
const { validateSessionCreation, validateSessionInvitation } = require("../middleware/validation");

// Initialize service and controller
const service = new SessionService();
const sessionController = new SessionController();

// =============================================================================
// NEW SESSION MANAGEMENT ROUTES (Using Controller Pattern)
// =============================================================================

// GET ALL SESSIONS FOR USER (main endpoint)
router.get("/", requireAuth, sessionController.getUserSessions);

// GET SPECIFIC SESSION BY ID
router.get("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const userEmail = req.query.email;

  if (!sessionId) {
    return res.status(400).json({ 
      success: false,
      error: "Session ID is required" 
    });
  }

  try {
    // Check if user has access to this session
    if (userEmail) {
      const hasAccess = await service.checkSessionAccess(sessionId, userEmail);
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false,
          error: "Access denied to this session" 
        });
      }
    }

    // Get session details with participants
    const session = await service.getSessionDetails(sessionId);
    
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
  } catch (error) {
    console.error("Error fetching session details:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch session details", 
      details: error.message 
    });
  }
});

// GET USER SESSIONS (combines created and shared sessions)
router.get("/user-sessions", async (req, res) => {
  const userEmail = req.query.email;
  if (!userEmail) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const sessions = await service.getUserSessions(userEmail);
    
    // Format response to match existing frontend expectations
    res.json({
      sessions: sessions,
      total: sessions.length,
      userEmail: userEmail
    });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    res.status(500).json({ 
      error: "Failed to fetch sessions", 
      details: error.message 
    });
  }
});

// GET MY SESSIONS (created by user)
router.get("/get-my-sessions", async (req, res) => {
  const userEmail = req.query.email;
  if (!userEmail) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const allSessions = await service.getUserSessions(userEmail);
    const mySessions = allSessions.filter(session => session.isCreator);
    
    res.json(mySessions);
  } catch (error) {
    console.error("Error fetching my sessions:", error);
    res.status(500).json({ 
      error: "Failed to fetch sessions", 
      details: error.message 
    });
  }
});

// GET SHARED SESSIONS (invited to by others)
router.get("/get-shared-sessions", async (req, res) => {
  const userEmail = req.query.email;
  if (!userEmail) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const allSessions = await service.getUserSessions(userEmail);
    const sharedSessions = allSessions.filter(session => !session.isCreator);
    
    res.json(sharedSessions);
  } catch (error) {
    console.error("Error fetching shared sessions:", error);
    res.status(500).json({ 
      error: "Failed to fetch sessions", 
      details: error.message 
    });
  }
});

// CREATE SESSION
router.post("/", async (req, res) => {
  const { name, description, creator } = req.body;
  
  if (!name || !creator) {
    return res.status(400).json({ 
      error: "Session name and creator email are required" 
    });
  }

  try {
    const result = await service.createSession({
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
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to create session", 
      details: error.message 
    });
  }
});

// INVITE USER TO SESSION
router.post("/:sessionId/invite", async (req, res) => {
  const { sessionId } = req.params;
  const { email: inviteeEmail, access = 'edit' } = req.body;
  const inviterEmail = req.body.inviterEmail || req.headers['x-user-email'] || req.body.creator;

  if (!sessionId || !inviteeEmail || !inviterEmail) {
    return res.status(400).json({ 
      error: "Session ID, invitee email, and inviter email are required" 
    });
  }

  try {
    // Convert legacy access to role
    const role = access === 'edit' ? 'editor' : 'viewer';
    
    const result = await service.inviteUserToSession(
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
    res.status(500).json({ 
      success: false,
      error: "Failed to send invitation",
      details: error.message 
    });
  }
});

// LEAVE SESSION
router.post("/:sessionId/leave", async (req, res) => {
  const { sessionId } = req.params;
  const userEmail = req.body.email || req.headers['x-user-email'];

  if (!sessionId || !userEmail) {
    return res.status(400).json({ 
      error: "Session ID and user email are required" 
    });
  }

  try {
    const result = await service.leaveSession(sessionId, userEmail);

    if (result.success) {
      res.status(200).json({ 
        success: true,
        message: result.message || "Left session successfully" 
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: "Failed to leave session",
        details: result.error 
      });
    }
  } catch (error) {
    console.error("Error leaving session:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to leave session", 
      details: error.message 
    });
  }
});

// DELETE SESSION
router.delete("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const userEmail = req.body.email || req.headers['x-user-email'];

  if (!sessionId || !userEmail) {
    return res.status(400).json({ 
      error: "Session ID and user email are required" 
    });
  }

  try {
    const result = await service.deleteSession(sessionId, userEmail);

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
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete session", 
      details: error.message 
    });
  }
});

// CHECK SESSION ACCESS
router.get("/check-access", async (req, res) => {
  const { sessionId, email } = req.query;

  if (!sessionId || !email) {
    return res.status(400).json({ 
      error: "Session ID and email are required" 
    });
  }

  try {
    const accessInfo = await service.checkSessionAccess(sessionId, email);
    res.json(accessInfo);
  } catch (error) {
    console.error("Error checking session access:", error);
    res.status(500).json({ 
      error: "Failed to check access", 
      details: error.message 
    });
  }
});

// GET ACTIVE USERS IN SESSION
router.post("/active-users", async (req, res) => {
  const { session_id } = req.body;
  
  if (!session_id) {
    return res.status(400).json({ error: "session_id is required" });
  }

  try {
    const activeUsers = await service.getActiveUsers(session_id);
    res.json(activeUsers);
  } catch (error) {
    console.error("Error getting active users:", error);
    res.status(500).json({ 
      error: "Failed to get active users", 
      details: error.message 
    });
  }
});

// UPDATE LAST ACTIVE (for user activity tracking)
router.post("/update-activity", async (req, res) => {
  const { sessionId, email } = req.body;

  if (!sessionId || !email) {
    return res.status(400).json({ 
      error: "Session ID and email are required" 
    });
  }

  try {
    await service.updateLastActive(sessionId, email);
    res.status(200).json({ message: "Activity updated" });
  } catch (error) {
    console.error("Error updating activity:", error);
    res.status(500).json({ 
      error: "Failed to update activity", 
      details: error.message 
    });
  }
});

// =============================================================================
// MIGRATION AND DEBUGGING ROUTES
// =============================================================================

// GET MIGRATION STATUS
router.get("/migration-status", async (req, res) => {
  try {
    const status = await service.checkMigrationStatus();
    res.json(status);
  } catch (error) {
    console.error("Error checking migration status:", error);
    res.status(500).json({ 
      error: "Failed to check migration status", 
      details: error.message 
    });
  }
});

// SWITCH TO NEW SYSTEM (for gradual migration)
router.post("/enable-new-system", async (req, res) => {
  try {
    service.enableNewSystem();
    res.json({ 
      message: "Switched to new session system",
      systemActive: "new"
    });
  } catch (error) {
    console.error("Error enabling new system:", error);
    res.status(500).json({ 
      error: "Failed to switch systems", 
      details: error.message 
    });
  }
});

// SWITCH TO LEGACY SYSTEM (for rollback)
router.post("/enable-legacy-system", async (req, res) => {
  try {
    service.enableLegacySystem();
    res.json({ 
      message: "Switched to legacy session system",
      systemActive: "legacy"
    });
  } catch (error) {
    console.error("Error enabling legacy system:", error);
    res.status(500).json({ 
      error: "Failed to switch systems", 
      details: error.message 
    });
  }
});

module.exports = router;
