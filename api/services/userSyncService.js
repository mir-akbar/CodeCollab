/**
 * Simplified User Synchronization Service
 * Creates minimal user records in database for session relationships with AWS Cognito users
 * Single responsibility: Ensure user exists in DB for foreign key relationships
 */

const User = require('../models/User');

class UserSyncService {
  /**
   * Ensure user exists in database from Cognito access token
   * Creates minimal user record if doesn't exist, updates activity if exists
   * 
   * Note: Access tokens don't contain email - we use username as fallback
   * and retrieve email from Cognito API when needed
   */
  async syncUserFromCognito(cognitoTokenData) {
    try {
      const { sub: cognitoId, username } = cognitoTokenData;

      if (!cognitoId) {
        throw new Error('Cognito ID (sub) is required');
      }

      console.log(`Syncing user from Cognito - ID: ${cognitoId}, Username: ${username}`);

      // Try to find existing user by cognitoId
      let user = await User.findByCognitoId(cognitoId);
      
      if (user) {
        // Update existing user activity
        user.lastActiveAt = new Date();
        await user.save();
        console.log(`Updated existing user activity: ${user.email}`);
        return user;
      }

      // User doesn't exist - get email from Cognito API for user creation
      let userEmail = null;
      try {
        const cognitoService = require('./cognitoService');
        // For access tokens, we need to make a call to get user attributes
        // Access tokens don't contain user attributes, but can be used to fetch them
        const userInfo = await cognitoService.validateAccessToken(cognitoTokenData.token || cognitoTokenData.accessToken);
        if (userInfo.isValid && userInfo.attributes && userInfo.attributes.email) {
          userEmail = userInfo.attributes.email.toLowerCase();
          console.log(`Retrieved email from Cognito API: ${userEmail}`);
        }
      } catch (error) {
        console.warn('Could not retrieve email from Cognito:', error.message);
      }

      // If we still don't have email, use username as fallback for email
      if (!userEmail) {
        if (username && username.includes('@')) {
          userEmail = username.toLowerCase();
        } else {
          // Generate a placeholder email for the user record
          userEmail = `${username || cognitoId}@cognito.local`;
        }
      }

      // Create minimal user record
      const userData = {
        cognitoId,
        email: userEmail,
        name: username || userEmail.split('@')[0] || 'User',
        displayName: username || userEmail.split('@')[0] || 'User',
        username: username || null,
        lastActiveAt: new Date(),
        status: 'active'
      };

      user = new User(userData);
      await user.save();
      console.log(`Created minimal user record: ${user.email}`);
      return user;

    } catch (error) {
      console.error('Error syncing user from Cognito:', error);
      throw error;
    }
  }

  /**
   * Update user activity timestamp (simplified)
   */
  async updateUserActivity(cognitoId) {
    try {
      const user = await User.findByCognitoId(cognitoId);
      if (user) {
        user.lastActiveAt = new Date();
        await user.save();
        return user;
      }
      return null;
    } catch (error) {
      console.error('Error updating user activity:', error);
      throw error;
    }
  }

  /**
   * Simplified method to ensure user exists (backward compatibility)
   */
  async ensureUserExists(cognitoId, email = null, name = null) {
    try {
      // Try to use the main sync method first
      if (cognitoId) {
        const mockTokenData = { sub: cognitoId, username: email || name };
        return await this.syncUserFromCognito(mockTokenData);
      }
      
      // Fallback for legacy code
      let user = await User.findByCognitoId(cognitoId);
      
      if (!user && email) {
        const userData = {
          cognitoId: cognitoId || `temp_${Date.now()}`,
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          displayName: name || email.split('@')[0],
          lastActiveAt: new Date(),
          status: 'active'
        };
        
        user = new User(userData);
        await user.save();
        console.log(`Created minimal user record (fallback): ${user.email}`);
      }
      
      return user;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      throw error;
    }
  }
}

module.exports = new UserSyncService();
