/**
 * Simplified User Service
 * Single responsibility: Core user operations
 * Aligned with simplified User model
 */

const User = require('../models/User');

class UserService {
  /**
   * Get user by cognitoId
   */
  async getUserByCognitoId(cognitoId) {
    try {
      const user = await User.findByCognitoId(cognitoId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      console.error('Error getting user by cognitoId:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  /**
   * Update user basic profile info
   */
  async updateUserProfile(cognitoId, updates) {
    try {
      const user = await User.findByCognitoId(cognitoId);
      if (!user) {
        throw new Error('User not found');
      }

      // Only allow updating safe fields
      const allowedFields = ['name', 'bio', 'profilePicture'];
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          user[field] = updates[field];
        }
      });

      user.lastActiveAt = new Date();
      await user.save();
      
      return { success: true, user };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update user last active timestamp
   */
  async updateLastActive(cognitoId) {
    try {
      await User.updateOne(
        { cognitoId },
        { lastActiveAt: new Date() }
      );
      return { success: true };
    } catch (error) {
      console.error('Error updating last active:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   */
  async deleteUser(cognitoId) {
    try {
      const result = await User.deleteOne({ cognitoId });
      if (result.deletedCount === 0) {
        throw new Error('User not found');
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get multiple users by cognitoIds
   */
  async getUsersByIds(cognitoIds) {
    try {
      const users = await User.find({ cognitoId: { $in: cognitoIds } })
        .select('cognitoId email name profilePicture lastActiveAt');
      return users;
    } catch (error) {
      console.error('Error getting users by IDs:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
