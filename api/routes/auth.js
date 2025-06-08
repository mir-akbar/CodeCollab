/**
 * Minimal Authentication Routes for Cognito Integration
 * Only includes routes that complement AWS Cognito functionality
 */

const express = require('express');
const { requireAuth } = require('../middleware/cognitoAuth');
const AuthController = require('../controllers/AuthController');

const router = express.Router();
const authController = new AuthController();

// =============================================================================
// USER PROFILE ROUTES (Cognito Integration)
// =============================================================================

/**
 * GET /api/auth/me
 * Get current user profile with custom attributes from Cognito
 */
router.get('/me',
  requireAuth,
  authController.getProfile
);

/**
 * PUT /api/auth/profile
 * Update user profile (syncs with Cognito custom attributes)
 */
router.put('/profile',
  requireAuth,
  authController.updateProfile
);

// =============================================================================
// SECURE TOKEN MANAGEMENT ROUTES
// =============================================================================

/**
 * POST /api/auth/sync
 * Sync user data from Cognito to MongoDB
 */
router.post('/sync',
  requireAuth,
  authController.syncUser
);

/**
 * POST /api/auth/store-tokens
 * Store tokens securely in httpOnly cookies
 * Note: This endpoint doesn't require auth as it's used during the login process
 */
router.post('/store-tokens',
  authController.storeTokens
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token from httpOnly cookie
 */
router.post('/refresh',
  authController.refreshTokens
);

/**
 * POST /api/auth/logout
 * Clear tokens from httpOnly cookies
 */
router.post('/logout',
  authController.logout
);

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * GET /api/auth/health
 * Health check for auth service
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'authentication',
    timestamp: new Date().toISOString(),
    version: '2.0.0-cognito',
    provider: 'AWS Cognito'
  });
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

// General error handler
router.use((error, req, res, _next) => {
  console.error('Auth route error:', error);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.statusCode || 500).json({
    error: error.message || 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

module.exports = router;
