/**
 * Frontend Permission System
 * Client-side permission utilities that mirror the backend permission system
 */

// Invite policy constants - must match backend constants
const INVITE_POLICIES = {
  CLOSED: 'closed',
  APPROVAL_REQUIRED: 'approval-required',
  SELF_INVITE: 'self-invite',
  OPEN: 'open'
};

// Permission matrix - MUST match backend permissions.js exactly
const ROLE_PERMISSIONS = {
  owner: [
    'view', 'edit', 'invite', 'remove', 'changeRoles', 'delete', 'transfer'
  ],
  admin: [
    'view', 'edit', 'invite', 'remove', 'changeRoles'
  ],
  editor: [
    'view', 'edit'
  ],
  viewer: [
    'view'
  ]
};

// Role hierarchy for assignments - MUST match backend logic exactly
// Owners can assign any role except owner, admins can assign editor/viewer only
const ROLE_HIERARCHY = {
  owner: ['admin', 'editor', 'viewer'], // Owners can assign any role except owner
  admin: ['editor', 'viewer'], // Admins can assign editor/viewer roles only
  editor: [], // Editors cannot assign roles
  viewer: [] // Viewers cannot assign roles
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
 * Convert role to legacy access level for backward compatibility
 * @param {string} role - User's role
 * @returns {string} - Legacy access level ('edit' or 'view')
 */
export const roleToAccess = (role) => {
  const roleMap = {
    'owner': 'edit',
    'admin': 'edit', 
    'editor': 'edit',
    'viewer': 'view'
  };
  return roleMap[role] || 'view';
};

/**
 * Check if user can manage session settings
 * Note: Only owners have settings management in current backend
 * @param {string} role - User's role
 * @returns {boolean} - Whether user can manage settings
 */
export const canManageSettings = (role) => {
  return role === 'owner'; // Only owners can manage settings
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
    p.email === userEmail
  );
  
  if (participant) {
    return participant.role || 'viewer';
  }
  
  // Default to viewer if not found
  return 'viewer';
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
    canTransfer: hasPermission(role, 'transfer')
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

/**
 * Check if a user can perform an action based on both role and session settings
 * @param {string} userRole - User's role in the session  
 * @param {string} action - Action being attempted
 * @param {Object} sessionSettings - Session settings object
 * @param {string} userEmail - User email (for domain checks)
 * @returns {Object} - { allowed: boolean, reason?: string }
 */
export const checkPermissionWithSettings = (userRole, action, sessionSettings = {}, userEmail = null) => {
  // First check the basic role permission
  if (!hasPermission(userRole, action)) {
    return { 
      allowed: false, 
      reason: `Your role '${userRole}' doesn't have permission to ${action}` 
    };
  }

  // Special case for invite action based on invite policy
  if (action === 'invite') {
    const invitePolicy = sessionSettings.invitePolicy || INVITE_POLICIES.APPROVAL_REQUIRED;
    
    switch (invitePolicy) {
      case INVITE_POLICIES.CLOSED:
        // Only owners and admins can invite in closed sessions
        if (userRole !== 'owner' && userRole !== 'admin') {
          return { 
            allowed: false, 
            reason: 'This session is closed to new invitations' 
          };
        }
        break;
        
      // Other cases follow role-based permissions
      default:
        break;
    }
    
    // Domain restrictions
    if (userEmail && sessionSettings.allowedDomains?.length > 0) {
      const userDomain = userEmail.split('@')[1];
      if (!sessionSettings.allowedDomains.includes(userDomain)) {
        return { 
          allowed: false, 
          reason: 'Your email domain is not allowed to invite users' 
        };
      }
    }
  }
  
  // Role requests check
  if (action === 'requestRole' && !sessionSettings.allowRoleRequests) {
    return { 
      allowed: false, 
      reason: 'Role requests are not enabled for this session' 
    };
  }
  
  return { allowed: true };
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
  getRoleDisplayName,
  getPermissionSummary,
  validateAction,
  INVITE_POLICIES,
  checkPermissionWithSettings
};
