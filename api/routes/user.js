/**
 * User Profile Routes for Enhanced Authentication Integration
 * Handles user synchronization between Cognito and MongoDB for session management
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/cognitoAuth');
const userSyncService = require('../services/userSyncService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/user/profile
 * Get current user profile with session statistics
 */
router.get('/profile', requireAuth, asyncHandler(async (req, res) => {
  try {
    const user = req.user.mongoUser;
    const sessionStats = await userSyncService.getUserSessionStats(user._id);

    res.json({
      success: true,
      user: {
        id: user._id,
        cognitoId: user.cognitoId,
        email: user.email,
        profile: user.profile,
        preferences: user.preferences,
        subscription: user.subscription,
        lastActiveAt: user.lastActiveAt,
        sessionStats,
        status: user.status
      }
    });
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
}));

/**
 * PUT /api/user/preferences
 * Update user preferences
 */
router.put('/preferences', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { preferences } = req.body;
    const userId = req.user.id;

    const updatedUser = await userSyncService.updateUserPreferences(userId, preferences);

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedUser.preferences
    });
  } catch (error) {
    console.error('❌ Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
}));

/**
 * POST /api/user/sync
 * Force synchronization with Cognito (useful for development/testing)
 */
router.post('/sync', requireAuth, asyncHandler(async (req, res) => {
  try {
    // Re-sync the current user from their Cognito token
    const { verifyCognitoToken } = require('../middleware/cognitoAuth');
    
    // Get token from request (assuming it's still valid since we passed requireAuth)
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : req.cookies?.accessToken;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'No token available for sync'
      });
    }

    const decoded = await verifyCognitoToken(token);
    const syncedUser = await userSyncService.syncUserFromCognito(decoded);

    res.json({
      success: true,
      message: 'User synchronized successfully',
      user: {
        id: syncedUser._id,
        email: syncedUser.email,
        profile: syncedUser.profile,
        preferences: syncedUser.preferences,
        lastSyncAt: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Error syncing user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync user'
    });
  }
}));

/**
 * GET /api/user/session-stats
 * Get detailed session statistics for the user
 */
router.get('/session-stats', requireAuth, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionStats = await userSyncService.getUserSessionStats(userId);

    res.json({
      success: true,
      sessionStats
    });
  } catch (error) {
    console.error('❌ Error getting session stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session statistics'
    });
  }
}));

/**
 * PUT /api/user/last-active
 * Update user's last active timestamp (called periodically by frontend)
 */
router.put('/last-active', requireAuth, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    await userSyncService.updateLastActive(userId);

    res.json({
      success: true,
      message: 'Last active updated',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Error updating last active:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update last active'
    });
  }
}));

module.exports = router;
