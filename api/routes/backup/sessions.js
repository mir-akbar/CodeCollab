/**
 * @fileoverview RESTful Session Routes - Best Practices Implementation
 * 
 * This file provides session management routes following REST API conventions
 * and Express.js best practices for the modular backend architecture.
 * 
 * REST Conventions Applied:
 * - Proper HTTP verbs (GET, POST, PUT, PATCH, DELETE)
 * - Resource-based URL structure
 * - Consistent naming conventions (kebab-case)
 * - Logical route hierarchy and ordering
 * - Proper status codes and error handling
 * 
 * @version 2.1.0
 * @author CodeLab Development Team
 * @since 2025-06-04
 */

const express = require('express');
const router = express.Router();

// Import modular controllers
const SessionController = require('../controllers/sessionController');
const SessionParticipantController = require('../controllers/sessionParticipantController');
const SessionActivityController = require('../controllers/sessionActivityController');
const SessionValidationController = require('../controllers/sessionValidationController');

// Import middleware (using new Cognito-based authentication)
const { requireAuth, validateSessionAccess } = require('../middleware/cognitoAuth');
const { 
  validateSessionCreation, 
  validateSessionInvitation,
  validateSessionUpdate,
  validateParticipantRole
} = require('../middleware/validation');

// Initialize controllers
const sessionController = new SessionController();
const participantController = new SessionParticipantController();
const activityController = new SessionActivityController();
const validationController = new SessionValidationController();

// =============================================================================
// HEALTH CHECK ROUTE (No auth required - must be first)
// =============================================================================

/**
 * GET /api/sessions/health
 * Health check for session service
 */
router.get('/health', activityController.healthCheck);

// =============================================================================
// SESSION COLLECTION ROUTES (No sessionId parameter)
// =============================================================================

/**
 * GET /api/sessions
 * Get all sessions for authenticated user (created + shared)
 * Query params: ?filter=created|shared|all (default: all)
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
 * GET /api/sessions/check-access
 * Check if user has access to specific session
 * Query params: ?sessionId=:id
 */
router.get('/check-access', 
  requireAuth, 
  sessionController.checkAccess
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

// =============================================================================
// INDIVIDUAL SESSION ROUTES (With sessionId parameter)
// =============================================================================

/**
 * GET /api/sessions/:sessionId
 * Get specific session by ID
 */
router.get('/:sessionId', 
  validateSessionAccess, 
  sessionController.getSessionById
);

/**
 * PATCH /api/sessions/:sessionId
 * Update session details (partial update)
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
// SESSION VALIDATION ROUTES
// =============================================================================

/**
 * GET /api/sessions/:sessionId/validate
 * Validate session data integrity
 */
router.get('/:sessionId/validate', 
  validateSessionAccess, 
  validationController.validateSessionIntegrity
);

// =============================================================================
// SESSION MEMBERSHIP ROUTES
// =============================================================================

/**
 * PUT /api/sessions/:sessionId/join
 * Join session (for invitation acceptance) - idempotent operation
 */
router.put('/:sessionId/join', 
  requireAuth, 
  participantController.joinSession
);

/**
 * DELETE /api/sessions/:sessionId/leave
 * Leave session (participant removes themselves)
 */
router.delete('/:sessionId/leave', 
  validateSessionAccess, 
  participantController.leaveSession
);

/**
 * PUT /api/sessions/:sessionId/transfer-ownership
 * Transfer session ownership to another participant
 * Body: { newOwnerId: string }
 */
router.put('/:sessionId/transfer-ownership', 
  validateSessionAccess, 
  participantController.transferOwnership
);

// =============================================================================
// SESSION PARTICIPANTS COLLECTION ROUTES
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
 * POST /api/sessions/:sessionId/participants
 * Invite user to session (creates new participant)
 * Body: { email: string, role?: string }
 */
router.post('/:sessionId/participants', 
  validateSessionAccess, 
  validateSessionInvitation, 
  participantController.inviteToSession
);

// =============================================================================
// INDIVIDUAL PARTICIPANT ROUTES
// =============================================================================

/**
 * GET /api/sessions/:sessionId/participants/:participantId
 * Get specific participant details
 */
router.get('/:sessionId/participants/:participantId', 
  validateSessionAccess, 
  participantController.getParticipant
);

/**
 * PATCH /api/sessions/:sessionId/participants/:participantId
 * Update participant role
 * Body: { role: string }
 */
router.patch('/:sessionId/participants/:participantId', 
  validateSessionAccess, 
  validateParticipantRole, 
  participantController.updateParticipantRole
);

/**
 * DELETE /api/sessions/:sessionId/participants/:participantId
 * Remove participant from session
 */
router.delete('/:sessionId/participants/:participantId', 
  validateSessionAccess, 
  participantController.removeParticipant
);

// =============================================================================
// SESSION ACTIVITY ROUTES
// =============================================================================

/**
 * GET /api/sessions/:sessionId/activity
 * Get session activity history and logs
 * TODO: Implement getActivityLog method in SessionActivityController
 */
/*
router.get('/:sessionId/activity', 
  validateSessionAccess, 
  activityController.getActivityLog
);
*/

/**
 * PUT /api/sessions/:sessionId/activity
 * Update user's last active timestamp in session (idempotent)
 */
router.put('/:sessionId/activity', 
  validateSessionAccess, 
  activityController.updateActivity
);

/**
 * GET /api/sessions/:sessionId/active-users
 * Get currently active users in session
 */
router.get('/:sessionId/active-users', 
  validateSessionAccess, 
  activityController.getActiveUsers
);

// =============================================================================
// DEBUG ROUTES (Development/Testing Only)
// =============================================================================

/**
 * GET /api/sessions/:sessionId/participants/:userEmail/debug
 * Debug participant records (development/testing only)
 */
router.get('/:sessionId/participants/:userEmail/debug', 
  validateSessionAccess, 
  validationController.checkParticipantRecords
);

// =============================================================================
// ROUTE-LEVEL ERROR HANDLING
// =============================================================================

/**
 * Handle 404 errors for unmatched session routes
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Session route not found',
    path: req.originalUrl,
    method: req.method
  });
});

/**
 * Handle errors in session routes
 */
router.use((error, req, res, _next) => {
  console.error('Session Route Error:', error);
  
  // Handle known error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.message
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized access'
    });
  }
  
  if (error.name === 'ForbiddenError') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden - insufficient permissions'
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

module.exports = router;
