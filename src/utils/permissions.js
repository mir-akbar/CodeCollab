/**
 * Frontend Permission System
 * Client-side permission utilities that mirror the backend permission system
 */

// Permission matrix - mirrors backend permissions.js
const ROLE_PERMISSIONS = {
  owner: [
    'view', 'edit', 'invite', 'remove', 'changeRoles', 'delete', 'transfer', 
    'manageSettings', 'export', 'viewAnalytics'
  ],
  admin: [
    'view', 'edit', 'invite', 'remove', 'changeRoles', 'export'
  ],
  editor: [
    'view', 'edit', 'invite'
  ],
  viewer: [
    'view'
  ]
};

// Role hierarchy for assignments
const ROLE_HIERARCHY = {
  owner: ['owner', 'admin', 'editor', 'viewer'],
  admin: ['editor', 'viewer'],
  editor: ['viewer'],
  viewer: []
};

/**
 * Check if a role has permission for a specific action
 * @param {string} role - User's role 
 * @param {string} action - Permission action to check
 * @returns {boolean} - Whether role has permission
 */
export const hasPermission = (role, action) => {
  if (!role || !action) return false;
  const permissions = ROLE_PERMISSIONS[role.toLowerCase()];
  return permissions ? permissions.includes(action) : false;
};

/**
 * Check if a role can assign another role
 * @param {string} assignerRole - Role of user doing the assignment
 * @param {string} targetRole - Role being assigned
 * @returns {boolean} - Whether assignment is allowed
 */
export const canAssignRole = (assignerRole, targetRole) => {
  if (!assignerRole || !targetRole) return false;
  const allowedRoles = ROLE_HIERARCHY[assignerRole.toLowerCase()];
  return allowedRoles ? allowedRoles.includes(targetRole.toLowerCase()) : false;
};

/**
 * Get all roles that a user can assign
 * @param {string} role - User's current role
 * @returns {string[]} - Array of assignable roles
 */
export const getAssignableRoles = (role) => {
  if (!role) return [];
  return ROLE_HIERARCHY[role.toLowerCase()] || [];
};

/**
 * Check if user can manage participants (invite, remove, change roles)
 * @param {string} role - User's role
 * @returns {boolean} - Whether user can manage participants
 */
export const canManageParticipants = (role) => {
  return hasPermission(role, 'invite') || hasPermission(role, 'remove') || hasPermission(role, 'changeRoles');
};

/**
 * Check if user can delete a session
 * @param {string} role - User's role
 * @returns {boolean} - Whether user can delete session
 */
export const canDeleteSession = (role) => {
  return hasPermission(role, 'delete');
};

/**
 * Check if user can transfer ownership
 * @param {string} role - User's role
 * @returns {boolean} - Whether user can transfer ownership
 */
export const canTransferOwnership = (role) => {
  return hasPermission(role, 'transfer');
};

/**
 * Check if user can manage session settings
 * @param {string} role - User's role
 * @returns {boolean} - Whether user can manage settings
 */
export const canManageSettings = (role) => {
  return hasPermission(role, 'manageSettings');
};

/**
 * Check if user can edit content in the session
 * @param {string} role - User's role
 * @returns {boolean} - Whether user can edit
 */
export const canEdit = (role) => {
  return hasPermission(role, 'edit');
};

/**
 * Get user's role from session data
 * @param {Object} session - Session object
 * @param {string} userEmail - Current user's email
 * @returns {string} - User's role in the session
 */
export const getUserRole = (session, userEmail) => {
  if (!session || !userEmail) return 'viewer';
  
  // Check if user is the creator/owner
  if (session.creator === userEmail) {
    return 'owner';
  }
  
  // Find user in participants list
  const participant = session.participants?.find(p => 
    p.email === userEmail || p.userEmail === userEmail
  );
  
  if (participant) {
    return participant.role || 'viewer';
  }
  
  // Default to viewer if not found
  return 'viewer';
};

/**
 * Convert legacy access values to new role system for backward compatibility
 * @param {string} access - Legacy access value ('edit', 'view')
 * @param {boolean} isCreator - Whether user is the session creator
 * @returns {string} - Corresponding role
 */
export const accessToRole = (access, isCreator = false) => {
  if (isCreator) return 'owner';
  
  switch (access) {
    case 'edit':
      return 'editor';
    case 'view':
      return 'viewer';
    default:
      return 'viewer';
  }
};

/**
 * Convert role to legacy access for backward compatibility
 * @param {string} role - Role value
 * @returns {string} - Legacy access value
 */
export const roleToAccess = (role) => {
  switch (role) {
    case 'owner':
    case 'admin':
    case 'editor':
      return 'edit';
    case 'viewer':
    default:
      return 'view';
  }
};

/**
 * Get role display name with proper formatting
 * @param {string} role - Role value
 * @returns {string} - Formatted role name
 */
export const getRoleDisplayName = (role) => {
  if (!role) return 'Viewer';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

/**
 * Get permission summary for UI display
 * @param {string} role - User's role
 * @returns {Object} - Permission summary object
 */
export const getPermissionSummary = (role) => {
  return {
    canView: hasPermission(role, 'view'),
    canEdit: hasPermission(role, 'edit'),
    canInvite: hasPermission(role, 'invite'),
    canRemove: hasPermission(role, 'remove'),
    canChangeRoles: hasPermission(role, 'changeRoles'),
    canDelete: hasPermission(role, 'delete'),
    canTransfer: hasPermission(role, 'transfer'),
    canManageSettings: hasPermission(role, 'manageSettings'),
    canExport: hasPermission(role, 'export'),
    canViewAnalytics: hasPermission(role, 'viewAnalytics')
  };
};

/**
 * Validate permission action on frontend before API call
 * @param {string} userRole - Current user's role
 * @param {string} action - Action being attempted
 * @param {string} targetRole - Role being assigned (if applicable)
 * @returns {Object} - Validation result
 */
export const validateAction = (userRole, action, targetRole = null) => {
  const result = {
    allowed: false,
    reason: ''
  };
  
  // Check basic permission
  if (!hasPermission(userRole, action)) {
    result.reason = `Insufficient permissions: ${userRole} role cannot perform ${action}`;
    return result;
  }
  
  // Check role assignment permission
  if (action === 'changeRoles' && targetRole && !canAssignRole(userRole, targetRole)) {
    result.reason = `Cannot assign ${targetRole} role: insufficient permissions`;
    return result;
  }
  
  result.allowed = true;
  return result;
};

export default {
  hasPermission,
  canAssignRole,
  getAssignableRoles,
  canManageParticipants,
  canDeleteSession,
  canTransferOwnership,
  canManageSettings,
  canEdit,
  getUserRole,
  accessToRole,
  roleToAccess,
  getRoleDisplayName,
  getPermissionSummary,
  validateAction
};
