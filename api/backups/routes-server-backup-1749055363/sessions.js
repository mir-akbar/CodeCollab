const express = require("express");
const router = express.Router();

// Import the new modular controllers
const SessionController = require("../controllers/sessionController");
const SessionParticipantController = require("../controllers/sessionParticipantController");
const SessionActivityController = require("../controllers/sessionActivityController");
const SessionValidationController = require("../controllers/sessionValidationController");

const { requireAuth, validateSessionAccess } = require("../middleware/auth");
const { validateSessionCreation, validateSessionInvitation } = require("../middleware/validation");

// Initialize controllers
const sessionController = new SessionController();
const participantController = new SessionParticipantController();
const activityController = new SessionActivityController();
const validationController = new SessionValidationController();

// =============================================================================
// SESSION MANAGEMENT ROUTES (Using Modular Controller Pattern)
// =============================================================================

// CORE SESSION CRUD OPERATIONS
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

// DELETE SESSION
router.delete("/:sessionId", validateSessionAccess, sessionController.deleteSession);

// CHECK SESSION ACCESS
router.get("/check-access", sessionController.checkAccess);

// PARTICIPANT MANAGEMENT OPERATIONS
// INVITE USER TO SESSION
const { syncUserFromCognito } = require("../middleware/userSync"); 
router.post("/:sessionId/invite", validateSessionAccess, validateSessionInvitation, syncUserFromCognito, participantController.inviteToSession);

// REMOVE PARTICIPANT FROM SESSION
router.post("/:sessionId/remove-participant", validateSessionAccess, participantController.removeParticipant);

// TRANSFER OWNERSHIP
router.post("/:sessionId/transfer-ownership", validateSessionAccess, participantController.transferOwnership);

// UPDATE PARTICIPANT ROLE
router.post("/:sessionId/update-role", validateSessionAccess, participantController.updateParticipantRole);

// LEAVE SESSION
router.post("/:sessionId/leave", validateSessionAccess, participantController.leaveSession);

// ACTIVITY & MONITORING OPERATIONS
// GET ACTIVE USERS IN SESSION
router.post("/active-users", activityController.getActiveUsers);

// UPDATE LAST ACTIVE (for user activity tracking)
router.post("/update-activity", activityController.updateActivity);

// HEALTH CHECK
router.get("/health", activityController.healthCheck);

// DEBUG & VALIDATION OPERATIONS
// DEBUG: Check participant records
router.get("/:sessionId/debug/participants/:userEmail", validationController.checkParticipantRecords);

// Validate session integrity
router.get("/:sessionId/validate", validationController.validateSessionIntegrity);

module.exports = router;
