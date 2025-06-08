/**
 * @fileoverview BACKUP - Previous Session Routes Implementation
 * 
 * ⚠️  ARCHIVED FILE - DO NOT USE ⚠️
 * 
 * This file has been moved to backup on 2025-06-04 and replaced with a 
 * RESTful implementation following best practices. This version used 
 * non-standard HTTP methods and action-based URLs.
 * 
 * Current implementation: /api/routes/sessions.js
 * Documentation: /api/docs/REST_BEST_PRACTICES.md
 * 
 * Original Description:
 * This file provided session management routes for the modular backend
 * architecture, but did not follow REST API conventions.
 * 
 * @version 2.0.0 (Archived)
 * @author CodeLab Development Team
 * @since 2025-06-04
 * @deprecated Replaced with RESTful implementation
 */

const express = require('express');
const router = express.Router();

// Import modular controllers
const SessionController = require('../controllers/sessionController');
const SessionParticipantController = require('../controllers/sessionParticipantController');
const SessionActivityController = require('../controllers/sessionActivityController');
const SessionValidationController = require('../controllers/sessionValidationController');

// Import middleware (only using clean, new middleware)
const { requireAuth, validateSessionAccess } = require('../middleware/auth');
const { 
  validateSessionCreation, 
  validateSessionInvitation,
  validateSessionUpdate,
  validateParticipantRole
} = require('../middleware/validation');
const { syncUserFromCognito } = require('../middleware/userSync');

// Initialize controllers
const sessionController = new SessionController();
const participantController = new SessionParticipantController();
const activityController = new SessionActivityController();
const validationController = new SessionValidationController();

// =============================================================================
// CORE SESSION MANAGEMENT ROUTES
// =============================================================================

/**
 * GET /api/sessions
 * Get all sessions for authenticated user (created + shared)
 */
router.get('/', 
  requireAuth, 
  sessionController.getUserSessions
);

/**
 * GET /api/sessions/my-sessions
 * Get sessions created by the user
 */
router.get('/my-sessions', 
  requireAuth, 
  (req, res, next) => {
    req.filterCreatedOnly = true;
    sessionController.getUserSessions(req, res, next);
  }
);

/**
 * GET /api/sessions/shared-sessions
 * Get sessions shared with the user (invited to)
 */
router.get('/shared-sessions', 
  requireAuth, 
  (req, res, next) => {
    req.filterSharedOnly = true;
    sessionController.getUserSessions(req, res, next);
  }
);

/**
 * GET /api/sessions/:sessionId
 * Get specific session by ID
 */
router.get('/:sessionId', 
  validateSessionAccess, 
  sessionController.getSessionById
);

/**
 * POST /api/sessions
 * Create new session
 */
router.post('/', 
  requireAuth, 
  validateSessionCreation, 
  sessionController.createSession
);

/**
 * PATCH /api/sessions/:sessionId
 * Update session details
 */
router.patch('/:sessionId', 
  validateSessionAccess, 
  validateSessionUpdate, 
  sessionController.updateSession
);

/**
 * DELETE /api/sessions/:sessionId
 * Delete session (owner only)
 */
router.delete('/:sessionId', 
  validateSessionAccess, 
  sessionController.deleteSession
);

// =============================================================================
// PARTICIPANT MANAGEMENT ROUTES
// =============================================================================

/**
 * GET /api/sessions/:sessionId/participants
 * Get all participants in a session
 */
router.get('/:sessionId/participants', 
  validateSessionAccess, 
  participantController.getParticipants
);

/**
 * POST /api/sessions/:sessionId/invite
 * Invite user to session
 */
router.post('/:sessionId/invite', 
  validateSessionAccess, 
  validateSessionInvitation, 
  syncUserFromCognito, 
  participantController.inviteToSession
);

/**
 * POST /api/sessions/:sessionId/participants/:participantId/remove
 * Remove participant from session
 */
router.post('/:sessionId/participants/:participantId/remove', 
  validateSessionAccess, 
  participantController.removeParticipant
);

/**
 * POST /api/sessions/:sessionId/participants/:participantId/update-role
 * Update participant role
 */
router.post('/:sessionId/participants/:participantId/update-role', 
  validateSessionAccess, 
  validateParticipantRole, 
  participantController.updateParticipantRole
);

/**
 * POST /api/sessions/:sessionId/transfer-ownership
 * Transfer session ownership to another participant
 */
router.post('/:sessionId/transfer-ownership', 
  validateSessionAccess, 
  participantController.transferOwnership
);

/**
 * POST /api/sessions/:sessionId/leave
 * Leave session (participant removes themselves)
 */
router.post('/:sessionId/leave', 
  validateSessionAccess, 
  participantController.leaveSession
);

// =============================================================================
// SESSION ACTIVITY & MONITORING ROUTES
// =============================================================================

/**
 * GET /api/sessions/:sessionId/active-users
 * Get currently active users in session
 */
router.get('/:sessionId/active-users', 
  validateSessionAccess, 
  activityController.getActiveUsers
);

/**
 * POST /api/sessions/:sessionId/update-activity
 * Update user's last active timestamp in session
 */
router.post('/:sessionId/update-activity', 
  validateSessionAccess, 
  activityController.updateActivity
);

/**
 * GET /api/sessions/:sessionId/activity-log
 * Get session activity history
 */
router.get('/:sessionId/activity-log', 
  validateSessionAccess, 
  activityController.getActivityLog
);

// =============================================================================
// SESSION ACCESS & SECURITY ROUTES
// =============================================================================

/**
 * GET /api/sessions/check-access
 * Check if user has access to specific session
 */
router.get('/check-access', 
  requireAuth, 
  sessionController.checkAccess
);

/**
 * POST /api/sessions/:sessionId/join
 * Join session (for invitation acceptance)
 */
router.post('/:sessionId/join', 
  requireAuth, 
  syncUserFromCognito, 
  participantController.joinSession
);

// =============================================================================
// VALIDATION & DEBUG ROUTES
// =============================================================================

/**
 * GET /api/sessions/:sessionId/validate
 * Validate session data integrity
 */
router.get('/:sessionId/validate', 
  validateSessionAccess, 
  validationController.validateSessionIntegrity
);

/**
 * GET /api/sessions/:sessionId/participants/:userEmail/debug
 * Debug participant records (development/testing only)
 */
router.get('/:sessionId/participants/:userEmail/debug', 
  validateSessionAccess, 
  validationController.checkParticipantRecords
);

// =============================================================================
// HEALTH CHECK ROUTE
// =============================================================================

/**
 * GET /api/sessions/health
 * Health check for session service
 */
router.get('/health', 
  activityController.healthCheck
);

module.exports = router;
