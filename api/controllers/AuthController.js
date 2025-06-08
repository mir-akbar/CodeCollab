/**
 * Authentication Controller
 * Handles Cognito authentication operations with secure token management
 */

const userSyncService = require('../services/userSyncService');
const cognitoService = require('../services/cognitoService');
const { config } = require('../config/environment');

class AuthController {
  constructor() {
    // Cookie configuration for secure token storage
    this.cookieConfig = {
      httpOnly: true,
      secure: config.COOKIE_SECURE || process.env.NODE_ENV === 'production',
      sameSite: config.COOKIE_SAME_SITE || 'strict',
      domain: config.COOKIE_DOMAIN === 'localhost' ? undefined : config.COOKIE_DOMAIN,
    };
  }

  // =============================================================================
  // COGNITO INTEGRATION METHODS
  // =============================================================================

  /**
   * Sync user data from Cognito to MongoDB
   */
  syncUser = async (req, res) => {
    try {
      const { cognitoData } = req.body;
      
      if (!cognitoData || !cognitoData.sub || !cognitoData.email) {
        return res.status(400).json({
          error: 'Invalid Cognito data provided',
          details: 'sub and email are required'
        });
      }

      // Sync user with MongoDB
      const user = await userSyncService.syncUserFromCognito(cognitoData);

      res.status(200).json({
        success: true,
        user: userSyncService.formatUserResponse(user)
      });

    } catch (error) {
      console.error('User sync error:', error);
      res.status(500).json({
        error: 'User sync failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Get current user profile
   */
  getProfile = async (req, res) => {
    try {
      const user = await userSyncService.getUserByCognitoId(req.user.cognitoId);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      res.status(200).json({
        user: userSyncService.formatUserResponse(user)
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to get user profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Update user profile
   */
  updateProfile = async (req, res) => {
    try {
      const { name, username } = req.body;
      const updates = {};

      if (name) updates.name = name;
      if (username) updates.username = username;

      const user = await userSyncService.updateUser(req.user.cognitoId, updates);

      res.status(200).json({
        success: true,
        user: userSyncService.formatUserResponse(user)
      });

    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          error: 'Username already taken'
        });
      }

      res.status(500).json({
        error: 'Failed to update profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Store tokens securely in httpOnly cookies
   */
  storeTokens = async (req, res) => {
    try {
      const { accessToken, refreshToken, idToken, expiresIn } = req.body;

      if (!accessToken || !refreshToken) {
        return res.status(400).json({
          error: 'Tokens are required'
        });
      }

      // Note: Tokens come directly from Cognito login, so they're trusted
      console.log('Storing tokens from successful Cognito authentication');

      // Set httpOnly cookies for secure token storage
      const expiresInMs = (expiresIn || 3600) * 1000;
      const cookieOptions = {
        ...this.cookieConfig,
        maxAge: expiresInMs
      };

      res.cookie('accessToken', accessToken, cookieOptions);
      res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      if (idToken) {
        res.cookie('idToken', idToken, cookieOptions);
      }

      res.status(200).json({
        success: true,
        message: 'Tokens stored securely'
      });

    } catch (error) {
      console.error('Store tokens error:', error);
      res.status(500).json({
        error: 'Failed to store tokens',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Refresh access token using refresh token from httpOnly cookie
   */
  refreshTokens = async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        console.log('No refresh token found in cookies');
        return res.status(401).json({
          error: 'Refresh token not found'
        });
      }
      
      console.log('Attempting to refresh token with Cognito');
      
      // Use Cognito service to refresh the token
      const newTokens = await cognitoService.refreshAccessToken(refreshToken);
      
      console.log('Token refresh successful');

      // Store the new tokens in httpOnly cookies
      const cookieOptions = {
        ...this.cookieConfig,
        maxAge: (newTokens.expiresIn || 3600) * 1000
      };

      res.cookie('accessToken', newTokens.accessToken, cookieOptions);
      res.cookie('idToken', newTokens.idToken, cookieOptions);
      
      // Only update refresh token if a new one was returned
      if (newTokens.refreshToken !== refreshToken) {
        res.cookie('refreshToken', newTokens.refreshToken, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }

      res.status(200).json({
        success: true,
        accessToken: newTokens.accessToken,
        expiresIn: newTokens.expiresIn,
        message: 'Tokens refreshed successfully'
      });

    } catch (error) {
      console.error('Refresh tokens error:', error);
      
      // Clear invalid cookies on refresh failure
      res.clearCookie('accessToken', this.cookieConfig);
      res.clearCookie('refreshToken', this.cookieConfig);
      res.clearCookie('idToken', this.cookieConfig);
      
      res.status(401).json({
        error: 'Token refresh failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Invalid or expired refresh token'
      });
    }
  };

  /**
   * Clear tokens from httpOnly cookies (logout)
   */
  logout = async (req, res) => {
    try {
      // Clear all auth cookies
      res.clearCookie('accessToken', this.cookieConfig);
      res.clearCookie('refreshToken', this.cookieConfig);
      res.clearCookie('idToken', this.cookieConfig);
      res.clearCookie('sessionId', this.cookieConfig);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Additional methods for password reset, session management, etc. would go here
  // ... (implementing other methods like forgotPassword, resetPassword, etc.)
}

module.exports = AuthController;
