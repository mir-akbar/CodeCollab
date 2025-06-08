/**
 * @fileoverview Fresh User Routes - Clean Implementation for Modular Backend
 * 
 * This file provides clean user management routes that work exclusively with
 * the new modular backend architecture. All legacy dependencies have been removed.
 * 
 * Features:
 * - User profile management with new User model
 * - User preferences and settings
 * - User search and collaboration features
 * - Activity tracking and statistics
 * - Proper validation and error handling
 * - Clean integration with modular controllers
 * 
 * @version 2.0.0
 * @author CodeLab Development Team
 * @since 2025-06-04
 */

const express = require('express');
const router = express.Router();

// Import controllers
const userController = require('../controllers/userController');

// Import middleware (using new Cognito-based authentication)
const { requireAuth } = require('../middleware/cognitoAuth');
const { 
  validateUserProfile,
  validateUserPreferences,
  validateUserSearch
} = require('../middleware/validation');

// =============================================================================
// CORE USER PROFILE ROUTES
// =============================================================================

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', 
  requireAuth, 
  syncUserFromCognito,
  userController.getCurrentUser
);

/**
 * PATCH /api/users/profile
 * Update user profile information
 */
router.patch('/profile', 
  requireAuth, 
  validateUserProfile,
  userController.updateProfile
);

/**
 * PATCH /api/users/preferences
 * Update user preferences and settings
 */
router.patch('/preferences', 
  requireAuth, 
  validateUserPreferences,
  userController.updatePreferences
);

/**
 * PATCH /api/users/avatar
 * Update user avatar
 */
router.patch('/avatar', 
  requireAuth, 
  userController.updateAvatar
);

// =============================================================================
// USER STATISTICS & ANALYTICS ROUTES
// =============================================================================

/**
 * GET /api/users/stats
 * Get user statistics and activity metrics
 */
router.get('/stats', 
  requireAuth, 
  userController.getUserStats
);

/**
 * GET /api/users/activity
 * Get user activity history
 */
router.get('/activity', 
  requireAuth, 
  userController.getUserActivity
);

/**
 * GET /api/users/dashboard
 * Get user dashboard data (sessions, activity, stats)
 */
router.get('/dashboard', 
  requireAuth, 
  userController.getDashboardData
);

// =============================================================================
// USER SEARCH & COLLABORATION ROUTES
// =============================================================================

/**
 * GET /api/users/search
 * Search for users (for collaboration invitations)
 */
router.get('/search', 
  requireAuth, 
  validateUserSearch,
  userController.searchUsers
);

/**
 * GET /api/users/collaborators
 * Get frequent collaborators
 */
router.get('/collaborators', 
  requireAuth, 
  userController.getFrequentCollaborators
);

/**
 * GET /api/users/suggestions
 * Get user suggestions for collaboration
 */
router.get('/suggestions', 
  requireAuth, 
  userController.getUserSuggestions
);

// =============================================================================
// USER SETTINGS & CONFIGURATION ROUTES
// =============================================================================

/**
 * GET /api/users/settings
 * Get all user settings
 */
router.get('/settings', 
  requireAuth, 
  userController.getUserSettings
);

/**
 * PATCH /api/users/settings/notifications
 * Update notification preferences
 */
router.patch('/settings/notifications', 
  requireAuth, 
  userController.updateNotificationSettings
);

/**
 * PATCH /api/users/settings/privacy
 * Update privacy settings
 */
router.patch('/settings/privacy', 
  requireAuth, 
  userController.updatePrivacySettings
);

/**
 * PATCH /api/users/settings/editor
 * Update editor preferences
 */
router.patch('/settings/editor', 
  requireAuth, 
  userController.updateEditorSettings
);

// =============================================================================
// USER SESSION INTEGRATION ROUTES
// =============================================================================

/**
 * GET /api/users/sessions/recent
 * Get user's recent sessions
 */
router.get('/sessions/recent', 
  requireAuth, 
  userController.getRecentSessions
);

/**
 * GET /api/users/sessions/favorites
 * Get user's favorite sessions
 */
router.get('/sessions/favorites', 
  requireAuth, 
  userController.getFavoriteSessions
);

/**
 * POST /api/users/sessions/:sessionId/favorite
 * Add session to favorites
 */
router.post('/sessions/:sessionId/favorite', 
  requireAuth, 
  userController.addSessionToFavorites
);

/**
 * DELETE /api/users/sessions/:sessionId/favorite
 * Remove session from favorites
 */
router.delete('/sessions/:sessionId/favorite', 
  requireAuth, 
  userController.removeSessionFromFavorites
);

// =============================================================================
// USER NOTIFICATION ROUTES
// =============================================================================

/**
 * GET /api/users/notifications
 * Get user notifications
 */
router.get('/notifications', 
  requireAuth, 
  userController.getNotifications
);

/**
 * PATCH /api/users/notifications/:notificationId/read
 * Mark notification as read
 */
router.patch('/notifications/:notificationId/read', 
  requireAuth, 
  userController.markNotificationAsRead
);

/**
 * POST /api/users/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/notifications/mark-all-read', 
  requireAuth, 
  userController.markAllNotificationsAsRead
);

/**
 * DELETE /api/users/notifications/:notificationId
 * Delete notification
 */
router.delete('/notifications/:notificationId', 
  requireAuth, 
  userController.deleteNotification
);

// =============================================================================
// USER ACCOUNT MANAGEMENT ROUTES
// =============================================================================

/**
 * POST /api/users/verify-email
 * Verify user email address
 */
router.post('/verify-email', 
  requireAuth, 
  userController.verifyEmail
);

/**
 * POST /api/users/change-password
 * Change user password (if using local auth)
 */
router.post('/change-password', 
  requireAuth, 
  userController.changePassword
);

/**
 * GET /api/users/export-data
 * Export user data (GDPR compliance)
 */
router.get('/export-data', 
  requireAuth, 
  userController.exportUserData
);

/**
 * DELETE /api/users/account
 * Delete user account (GDPR compliance)
 */
router.delete('/account', 
  requireAuth, 
  userController.deleteAccount
);

// =============================================================================
// USER HEALTH & STATUS ROUTES
// =============================================================================

/**
 * GET /api/users/status
 * Get user online status
 */
router.get('/status', 
  requireAuth, 
  userController.getUserStatus
);

/**
 * POST /api/users/status
 * Update user status (online/offline/away)
 */
router.post('/status', 
  requireAuth, 
  userController.updateUserStatus
);

/**
 * GET /api/users/health
 * Health check for user service
 */
router.get('/health', 
  userController.healthCheck
);

module.exports = router;
