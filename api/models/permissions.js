/**
 * Simplified Permission System for Y-WebSocket Collaboration
 * 
 * Simple 4-role hierarchy: owner → admin → editor → viewer
 * Optimized for real-time collaborative editing with y-websocket
 */

/**
 * Role-based permission matrix
 */
const ROLE_PERMISSIONS = {
  owner: ['view', 'edit', 'invite', 'remove', 'changeRoles', 'delete', 'transfer'],
  admin: ['view', 'edit', 'invite', 'remove', 'changeRoles'],  // Admins can also manage roles
  editor: ['view', 'edit'],
  viewer: ['view']
};

/**
 * Role hierarchy (higher number = more permissions)
 */
const ROLE_HIERARCHY = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4
};

/**
 * Check if role has permission for action
 */
function hasPermission(role, action) {
  return ROLE_PERMISSIONS[role]?.includes(action) || false;
}

/**
 * Check if role can assign target role (can only assign equal or lower roles)
 * Updated logic: Owners can assign any role except owner, admins can assign editor/viewer
 */
function canAssignRole(currentRole, targetRole) {
  // Owners can assign any role except owner (to prevent multiple owners)
  if (currentRole === 'owner') {
    return targetRole !== 'owner';
  }

  // Admins can assign editor and viewer roles only
  if (currentRole === 'admin') {
    return targetRole === 'editor' || targetRole === 'viewer';
  }

  // Editors and viewers cannot assign roles
  return false;
}

/**
 * Get all valid roles
 */
function getValidRoles() {
  return Object.keys(ROLE_PERMISSIONS);
}

module.exports = {
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  hasPermission,
  canAssignRole,
  getValidRoles
};
