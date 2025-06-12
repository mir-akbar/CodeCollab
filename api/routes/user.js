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

/**
 * GET /api/users/:email/pending-invitations
 * Get pending session invitations for a user
 */
router.get('/:email/pending-invitations', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email);
    
    // Security check: users can only view their own invitations
    const requestingUserEmail = req.user.mongoUser.email;
    if (decodedEmail !== requestingUserEmail) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own pending invitations'
      });
    }

    const User = require('../models/User');
    const user = await User.findByEmail(decodedEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const SessionParticipant = require('../models/SessionParticipant');
    const Session = require('../models/Session');
    
    // Find all pending invitations for this user
    const pendingInvitations = await SessionParticipant.find({
      cognitoId: user.cognitoId,
      status: 'invited'
    }).lean();

    // Fetch session details for each invitation
    const invitationsWithSessionDetails = await Promise.all(
      pendingInvitations.map(async (invitation) => {
        const session = await Session.findOne({ sessionId: invitation.sessionId }).lean();
        return {
          ...invitation,
          session: session ? {
            sessionId: session.sessionId,
            name: session.name,
            description: session.description,
            createdAt: session.createdAt
          } : null
        };
      })
    );

    res.json({
      success: true,
      invitations: invitationsWithSessionDetails,
      count: invitationsWithSessionDetails.length
    });
  } catch (error) {
    console.error('❌ Error fetching pending invitations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending invitations'
    });
  }
}));

/**
 * DELETE /api/users/:email/invitations/:sessionId
 * Reject/decline a session invitation
 */
router.delete('/:email/invitations/:sessionId', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { email, sessionId } = req.params;
    const decodedEmail = decodeURIComponent(email);
    
    // Security check: users can only manage their own invitations
    const requestingUserEmail = req.user.mongoUser.email;
    if (decodedEmail !== requestingUserEmail) {
      return res.status(403).json({
        success: false,
        error: 'You can only manage your own invitations'
      });
    }

    const User = require('../models/User');
    const user = await User.findByEmail(decodedEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const SessionParticipant = require('../models/SessionParticipant');
    
    // Find the specific invitation
    const invitation = await SessionParticipant.findOne({
      cognitoId: user.cognitoId,
      sessionId: sessionId,
      status: 'invited'
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found or already processed'
      });
    }

    // Remove the invitation record (decline)
    await SessionParticipant.findByIdAndDelete(invitation._id);

    res.json({
      success: true,
      message: 'Invitation declined successfully'
    });
  } catch (error) {
    console.error('❌ Error declining invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decline invitation'
    });
  }
}));

module.exports = router;
