const express = require("express");
const router = express.Router();
const SessionService = require("../services/sessionService");

// Initialize session service
const sessionService = new SessionService();

// Middleware to add session service to request
router.use((req, res, next) => {
  req.sessionService = sessionService;
  next();
});

// =============================================================================
// MIGRATION ENDPOINTS
// =============================================================================

// Check migration status
router.get("/migration-status", async (req, res) => {
  try {
    const status = await sessionService.checkMigrationStatus();
    res.json(status);
  } catch (error) {
    console.error("Error checking migration status:", error);
    res.status(500).json({ error: "Failed to check migration status" });
  }
});

// Switch to new system (admin only)
router.post("/enable-new-system", async (req, res) => {
  try {
    // In a real app, you'd check admin permissions here
    sessionService.enableNewSystem();
    res.json({ success: true, message: "Switched to new session system" });
  } catch (error) {
    console.error("Error enabling new system:", error);
    res.status(500).json({ error: "Failed to enable new system" });
  }
});

// Switch to legacy system (admin only)
router.post("/enable-legacy-system", async (req, res) => {
  try {
    sessionService.enableLegacySystem();
    res.json({ success: true, message: "Switched to legacy session system" });
  } catch (error) {
    console.error("Error enabling legacy system:", error);
    res.status(500).json({ error: "Failed to enable legacy system" });
  }
});

// =============================================================================
// SESSION MANAGEMENT ENDPOINTS (BACKWARD COMPATIBLE)
// =============================================================================

// GET ALL USER SESSIONS (replaces get-my-sessions + get-shared-sessions)
router.get("/get-user-sessions", async (req, res) => {
  const userEmail = req.query.email;
  
  if (!userEmail) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const sessions = await sessionService.getUserSessions(userEmail);
    
    // Split sessions for backward compatibility
    const mySessions = sessions.filter(s => s.isCreator);
    const sharedSessions = sessions.filter(s => !s.isCreator);

    res.json({
      success: true,
      mySessions,
      sharedSessions,
      allSessions: sessions,
      usingNewSystem: sessionService.useNewSystem
    });

  } catch (error) {
    console.error("Error fetching user sessions:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// GET MY SESSIONS (backward compatibility)
router.get("/get-my-sessions", async (req, res) => {
  const userEmail = req.query.email;
  
  if (!userEmail) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const sessions = await sessionService.getUserSessions(userEmail);
    const mySessions = sessions.filter(s => s.isCreator);
    res.json(mySessions);

  } catch (error) {
    console.error("Error fetching my sessions:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// GET SHARED SESSIONS (backward compatibility)
router.get("/get-shared-sessions", async (req, res) => {
  const userEmail = req.query.email;
  
  if (!userEmail) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const sessions = await sessionService.getUserSessions(userEmail);
    const sharedSessions = sessions.filter(s => !s.isCreator);
    res.json(sharedSessions);

  } catch (error) {
    console.error("Error fetching shared sessions:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// CREATE SESSION
router.post("/create-session", async (req, res) => {
  const { name, description, creator } = req.body;

  if (!name || !creator) {
    return res.status(400).json({ error: "Name and creator are required" });
  }

  try {
    const result = await sessionService.createSession({
      name,
      description: description || '',
      creator
    });

    res.json(result);

  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// INVITE USER TO SESSION
router.post("/invite-session", async (req, res) => {
  const { sessionId, email, inviterEmail, access = 'edit' } = req.body;

  if (!sessionId || !email || !inviterEmail) {
    return res.status(400).json({ error: "sessionId, email, and inviterEmail are required" });
  }

  try {
    // Convert access to role for new system
    const role = access === 'edit' ? 'editor' : 'viewer';
    
    const result = await sessionService.inviteUserToSession(
      sessionId, 
      inviterEmail, 
      email, 
      role
    );

    res.json({ 
      success: true, 
      message: "User invited successfully",
      ...result 
    });

  } catch (error) {
    console.error("Error inviting user:", error);
    
    if (error.message.includes('Permission denied') || 
        error.message.includes('already invited') ||
        error.message.includes('already a participant')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to invite user" });
    }
  }
});

// DELETE SESSION
router.post("/delete-session", async (req, res) => {
  const { sessionId, userEmail } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const result = await sessionService.deleteSession(sessionId, userEmail);

    if (result.success) {
      res.json({ message: "Session deleted successfully!" });
    } else {
      res.status(404).json({ message: "Session not found or permission denied." });
    }

  } catch (error) {
    console.error("Error deleting session:", error);
    
    if (error.message.includes('not found') || error.message.includes('permission denied')) {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Failed to delete session." });
    }
  }
});

// LEAVE SESSION (backward compatibility)
router.post("/leave-session", async (req, res) => {
  const { id, sessionId, userEmail } = req.body;

  // Handle both old (id) and new (sessionId) format
  const targetSessionId = sessionId || id;

  if (!targetSessionId || !userEmail) {
    return res.status(400).json({ message: "sessionId and userEmail are required" });
  }

  try {
    // For now, use the same delete logic - in the future, we might implement "leave" differently
    const result = await sessionService.deleteSession(targetSessionId, userEmail);

    if (result.success) {
      res.json({ message: "Left session successfully!" });
    } else {
      res.status(404).json({ message: "Session not found." });
    }

  } catch (error) {
    console.error("Error leaving session:", error);
    res.status(500).json({ message: "Failed to leave session." });
  }
});

// GET SESSION DETAILS (new endpoint)
router.get("/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const userEmail = req.query.email;

  if (!userEmail) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const sessions = await sessionService.getUserSessions(userEmail);
    const session = sessions.find(s => s.sessionId === sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found or no access" });
    }

    res.json(session);

  } catch (error) {
    console.error("Error fetching session details:", error);
    res.status(500).json({ error: "Failed to fetch session details" });
  }
});

// GET SESSION PARTICIPANTS (backward compatibility)
router.get("/get-session-participants", async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: "session_id is required" });
  }

  try {
    // This logic depends on which system we're using
    if (sessionService.useNewSystem) {
      const SessionParticipant = require('../models/SessionParticipant');
      const participants = await SessionParticipant.getActiveParticipants(session_id);
      
      const formattedParticipants = participants.map(p => ({
        _id: p._id,
        email: p.userEmail,
        name: p.userName,
        access: sessionService._roleToAccess(p.role),
        uploaded_at: p.joinedAt || p.createdAt
      }));

      res.json(formattedParticipants);
    } else {
      // Use legacy logic
      const SessionManagement = require('../models/SessionManagement');
      const allSessions = await SessionManagement.find({ session_id });
      const uniqueEmails = [...new Set(allSessions.map(doc => doc.email))];
      const latestUsers = [];

      for (const email of uniqueEmails) {
        const latest = await SessionManagement.findOne({ session_id, email }).sort({ uploaded_at: -1 });
        if (latest) latestUsers.push(latest);
      }

      res.json(latestUsers);
    }

  } catch (error) {
    console.error("Error fetching session participants:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    system: sessionService.useNewSystem ? "new" : "legacy",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
