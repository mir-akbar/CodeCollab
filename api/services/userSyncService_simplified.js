/**
 * Simplified User Sync Service
 * Single responsibility: Cognito-MongoDB user synchronization
 * Aligned with simplified User model
 */

const User = require('../models/User');

class UserSyncService {
  /**
   * Sync user from Cognito authentication data
   */
  async syncUserFromCognito(cognitoData) {
    try {
      const { sub, email, name, given_name, family_name } = cognitoData;
      
      if (!sub || !email) {
        throw new Error('Missing required Cognito data: sub and email are required');
      }
      
      // Find existing user by Cognito ID
      let user = await User.findByCognitoId(sub);
      
      if (user) {
        // Update existing user with latest data
        const updatedName = this._extractName(name, given_name, family_name, email);
        
        user.name = updatedName;
        user.lastActiveAt = new Date();
        await user.save();
        
        console.log(`✅ Updated existing user: ${email}`);
      } else {
        // Create new user using the User model's static method
        user = await User.createFromCognito(cognitoData);
        console.log(`✅ Created new user: ${email}`);
      }
      
      return user;
      
    } catch (error) {
      console.error('❌ Error syncing user from Cognito:', error);
      throw new Error(`User sync failed: ${error.message}`);
    }
  }

  /**
   * Get or create user from Cognito data
   */
  async getOrCreateUser(cognitoData) {
    return this.syncUserFromCognito(cognitoData);
  }

  /**
   * Update user last active timestamp
   */
  async updateUserActivity(cognitoId) {
    try {
      await User.updateOne(
        { cognitoId },
        { lastActiveAt: new Date() }
      );
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating user activity:', error);
      throw error;
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Extract display name from Cognito data
   */
  _extractName(name, given_name, family_name, email) {
    if (name) return name;
    if (given_name && family_name) return `${given_name} ${family_name}`;
    if (given_name) return given_name;
    return email.split('@')[0];
  }
}

module.exports = new UserSyncService();
