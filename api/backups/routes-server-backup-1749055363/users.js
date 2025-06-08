const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, validateActiveUser, trackUserActivity } = require('../middleware/userSync');

/**
 * User API Routes
 */

// Get current user profile
router.get('/me', 
  requireAuth, 
  validateActiveUser,
  userController.getCurrentUser
);

// Update user profile
router.patch('/profile', 
  requireAuth, 
  validateActiveUser,
  trackUserActivity('profile_update'),
  userController.updateProfile
);

// Update user preferences
router.patch('/preferences', 
  requireAuth, 
  validateActiveUser,
  trackUserActivity('preferences_update'),
  userController.updatePreferences
);

// Get user statistics
router.get('/stats', 
  requireAuth, 
  validateActiveUser,
  userController.getUserStats
);

// Search users for collaboration
router.get('/search', 
  requireAuth, 
  validateActiveUser,
  userController.searchUsers
);

// Get frequent collaborators
router.get('/collaborators', 
  requireAuth, 
  validateActiveUser,
  userController.getFrequentCollaborators
);

// Update avatar
router.patch('/avatar', 
  requireAuth, 
  validateActiveUser,
  trackUserActivity('avatar_update'),
  userController.updateAvatar
);

// Delete account (GDPR)
router.delete('/account', 
  requireAuth, 
  validateActiveUser,
  userController.deleteAccount
);

module.exports = router;
