/**
 * Simplified Access Service
 * Single responsibility: Permission checking and access control
 * Works with simplified permission system (owner > admin > editor > viewer)
 */

const SessionParticipant = require('../models/SessionParticipant');
const Session = require('../models/Session');

class AccessService {
  /**
   * Check if user has permission to perform action on session
   */
  async hasSessionAccess(sessionId, cognitoId, requiredRole = 'viewer') {
    try {
      const participant = await SessionParticipant.findOne({ sessionId, cognitoId });
      if (!participant || participant.status !== 'active') {
        return false;
      }

      return this._hasRolePermission(participant.role, requiredRole);
    } catch (error) {
      console.error('Error checking session access:', error);
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
