const express = require("express");
const router = express.Router();
const SessionController = require("../controllers/sessionController");
const { requireAuth, validateSessionAccess } = require("../middleware/auth");
const { validateSessionCreation, validateSessionInvitation } = require("../middleware/validation");

// Initialize controller
const sessionController = new SessionController();

// =============================================================================
// NEW SESSION MANAGEMENT ROUTES (Using Controller Pattern)
// =============================================================================

// GET ALL SESSIONS FOR USER (main endpoint)
router.get("/", requireAuth, sessionController.getUserSessions);

// GET SPECIFIC SESSION BY ID
router.get("/:sessionId", validateSessionAccess, sessionController.getSessionById);

// GET USER SESSIONS (combines created and shared sessions)
router.get("/user-sessions", requireAuth, sessionController.getUserSessions);

// GET MY SESSIONS (created by user)
router.get("/get-my-sessions", requireAuth, (req, res, next) => {
  // Add filter for created sessions only
  req.filterCreatedOnly = true;
  sessionController.getUserSessions(req, res, next);
});

// GET SHARED SESSIONS (invited to by others)
router.get("/get-shared-sessions", requireAuth, (req, res, next) => {
  // Add filter for shared sessions only
  req.filterSharedOnly = true;
  sessionController.getUserSessions(req, res, next);
});

// CREATE SESSION
router.post("/", requireAuth, validateSessionCreation, sessionController.createSession);

// INVITE USER TO SESSION
router.post("/:sessionId/invite", validateSessionAccess, validateSessionInvitation, sessionController.inviteToSession);

// LEAVE SESSION
router.post("/:sessionId/leave", validateSessionAccess, sessionController.leaveSession);

// DELETE SESSION
router.delete("/:sessionId", validateSessionAccess, sessionController.deleteSession);

// CHECK SESSION ACCESS
router.get("/check-access", sessionController.checkAccess);

// GET ACTIVE USERS IN SESSION
router.post("/active-users", sessionController.getActiveUsers);

// UPDATE LAST ACTIVE (for user activity tracking)
router.post("/update-activity", sessionController.updateActivity);

// =============================================================================
// MIGRATION AND DEBUGGING ROUTES
// =============================================================================

// GET MIGRATION STATUS
router.get("/migration-status", sessionController.getMigrationStatus);

// SWITCH TO NEW SYSTEM (for gradual migration)
router.post("/enable-new-system", sessionController.enableNewSystem);

// SWITCH TO LEGACY SYSTEM (for rollback)
router.post("/enable-legacy-system", sessionController.enableLegacySystem);

module.exports = router;
