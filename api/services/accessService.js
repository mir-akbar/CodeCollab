/**
 * Simplified Access Service
 * Single responsibility: Permission checking and access control
 * Works with simplified permission system (owner > admin > editor > viewer)
 */

const SessionParticipant = require('../models/SessionParticipant');

class AccessService {
  /**
   * Check if user has permission to perform action on session
   */
  async hasSessionAccess(sessionId, cognitoId, requiredRole = 'viewer') {
    try {
      console.log(`🔐 hasSessionAccess: Checking access for cognitoId ${cognitoId} in session ${sessionId} with required role: ${requiredRole}`);
      
      const participant = await SessionParticipant.findOne({ sessionId, cognitoId });
      
      if (!participant) {
        console.error(`🔐 hasSessionAccess: No participant record found for cognitoId ${cognitoId} in session ${sessionId}`);
        return false;
      }
      
      // Allow both 'active' and 'invited' participants to access the session
      if (participant.status !== 'active' && participant.status !== 'invited') {
        console.error(`🔐 hasSessionAccess: Participant status is '${participant.status}', not 'active' or 'invited' for cognitoId ${cognitoId} in session ${sessionId}`);
        return false;
      }

      const hasPermission = this._hasRolePermission(participant.role, requiredRole);
      console.log(`🔐 hasSessionAccess: Participant found with role '${participant.role}' and status '${participant.status}', permission check result: ${hasPermission}`);

      return hasPermission;
    } catch (error) {
      console.error('🔐 Error checking session access:', error);
      return false;
    }
  }

  /**
   * Check if user can manage participants (invite, remove, change roles)
   */
  async canManageParticipants(sessionId, cognitoId) {
    return this.hasSessionAccess(sessionId, cognitoId, 'admin');
  }

  /**
   * Check if user can edit files in session
   */
  async canEditFiles(sessionId, cognitoId) {
    return this.hasSessionAccess(sessionId, cognitoId, 'editor');
  }

  /**
   * Check if user can delete session
   */
  async canDeleteSession(sessionId, cognitoId) {
    return this.hasSessionAccess(sessionId, cognitoId, 'owner');
  }

  /**
   * Check if user can transfer ownership
   */
  async canTransferOwnership(sessionId, cognitoId) {
    return this.hasSessionAccess(sessionId, cognitoId, 'owner');
  }

  /**
   * Get user's role in session
   */
  async getUserRole(sessionId, cognitoId) {
    try {
      const participant = await SessionParticipant.findOne({ sessionId, cognitoId });
      return participant ? participant.role : null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Get assignable roles for a user (based on their current role)
   */
  getAssignableRoles(currentUserRole) {
    const roleHierarchy = {
      'owner': ['viewer', 'editor', 'admin'],
      'admin': ['viewer', 'editor'],
      'editor': [],
      'viewer': []
    };

    return roleHierarchy[currentUserRole] || [];
  }

  /**
   * Check if user can assign a specific role
   */
  canAssignRole(assignerRole, targetRole) {
    const assignableRoles = this.getAssignableRoles(assignerRole);
    return assignableRoles.includes(targetRole);
  }

  /**
   * Check session access by email (converts email to cognitoId)
   * Used by file upload and other email-based endpoints
   */
  async checkSessionAccess(sessionId, userEmail, requiredRole = 'viewer') {
    try {
      if (!sessionId || !userEmail) {
        console.error('checkSessionAccess: Missing sessionId or userEmail:', { sessionId, userEmail });
        return false;
      }

      console.log(`🔐 Checking session access for user ${userEmail} in session ${sessionId} with required role: ${requiredRole}`);

      // Find user by email to get cognitoId
      const User = require('../models/User');
      const user = await User.findByEmail(userEmail.trim().toLowerCase());
      
      if (!user) {
        console.error(`🔐 checkSessionAccess: User not found for email: ${userEmail}`);
        return false;
      }

      console.log(`🔐 Found user: ${user.email} with cognitoId: ${user.cognitoId}`);

      // Check session access using cognitoId
      const hasAccess = await this.hasSessionAccess(sessionId, user.cognitoId, requiredRole);
      console.log(`🔐 Session access result: ${hasAccess} for user ${userEmail} in session ${sessionId}`);
      
      return hasAccess;
    } catch (error) {
      console.error('🔐 Error in checkSessionAccess:', error);
      return false;
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Check if role has required permission level
   */
  _hasRolePermission(userRole, requiredRole) {
    const roleHierarchy = { viewer: 0, editor: 1, admin: 2, owner: 3 };
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  }
}

module.exports = new AccessService();
