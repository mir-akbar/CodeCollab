/**
 * Session Routes - Core Session Management
 * Handles session CRUD operations, participant management, and collaboration features
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/cognitoAuth');
const SessionController = require('../controllers/sessionController');
const SessionParticipantController = require('../controllers/sessionParticipantController');
const { asyncHandler } = require('../middleware/errorHandler');

// Initialize controllers
const sessionController = new SessionController();
const participantController = new SessionParticipantController();

// ===== SESSION ROUTES =====

/**
 * GET /api/sessions
 * Get all sessions for the authenticated user
 */
router.get('/', requireAuth, sessionController.getUserSessions);

/**
 * GET /api/sessions/:sessionId
 * Get specific session by ID
 */
router.get('/:sessionId', requireAuth, sessionController.getSessionById);

/**
 * POST /api/sessions
 * Create a new session
 */
router.post('/', requireAuth, sessionController.createSession);

/**
 * PATCH /api/sessions/:sessionId
 * Update session details (name, description, settings)
 */
router.patch('/:sessionId', requireAuth, sessionController.updateSession);

/**
 * DELETE /api/sessions/:sessionId
 * Delete a session (owner only)
 */
router.delete('/:sessionId', requireAuth, sessionController.deleteSession);

// ===== PARTICIPANT MANAGEMENT ROUTES =====

/**
 * GET /api/sessions/:sessionId/participants
 * Get all participants for a session
 */
router.get('/:sessionId/participants', requireAuth, participantController.getParticipants);

/**
 * POST /api/sessions/:sessionId/invite
 * Invite a user to join a session
 */
router.post('/:sessionId/invite', requireAuth, participantController.inviteToSession);

/**
 * POST /api/sessions/:sessionId/join
 * Join a session (accept invitation)
 */
router.post('/:sessionId/join', requireAuth, participantController.joinSession);

/**
 * POST /api/sessions/:sessionId/leave
 * Leave a session
 */
router.post('/:sessionId/leave', requireAuth, participantController.leaveSession);

/**
 * PATCH /api/sessions/:sessionId/participants/:participantId/role
 * Update participant role
 */
router.patch('/:sessionId/participants/:participantId/role', requireAuth, participantController.updateParticipantRole);

/**
 * DELETE /api/sessions/:sessionId/participants/:participantId
 * Remove participant from session
 */
router.delete('/:sessionId/participants/:participantId', requireAuth, participantController.removeParticipant);

// ===== SESSION ACTIVITY ROUTES =====

/**
 * POST /api/sessions/:sessionId/activity
 * Update last activity timestamp for user in session
 */
router.post('/:sessionId/activity', requireAuth, asyncHandler(async (req, res) => {
  // This would typically be handled by middleware for active sessions
  // For now, just acknowledge the activity update
  res.json({
    success: true,
    message: 'Activity updated',
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;