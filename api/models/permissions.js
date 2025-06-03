// Permission System Constants and Utilities
// Defines role-based permissions for CodeLab session management

/**
 * Role-based permission matrix
 * Defines what actions each role can perform
 */
const ROLE_PERMISSIONS = {
  owner: [
    'create',        // Create sessions
    'delete',        // Delete sessions  
    'edit',          // Edit session content
    'invite',        // Invite participants
    'remove',        // Remove participants
    'transfer',      // Transfer ownership
    'changeRoles',   // Change participant roles
    'manageSession', // Manage session settings
    'view'           // View session content
  ],
  admin: [
    'edit',          // Edit session content
    'invite',        // Invite participants
    'remove',        // Remove participants (except owner)
    'changeRoles',   // Change roles (except to owner)
    'view'           // View session content
  ],
  editor: [
    'edit',          // Edit session content
    'invite',        // Invite viewers and editors
    'view'           // View session content
  ],
  viewer: [
    'view'           // Read-only access
  ]
};

/**
 * Role hierarchy for permission checking
 * Higher numbers have more permissions
 */
const ROLE_HIERARCHY = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4
};

/**
 * Valid status transitions for participants
 */
const VALID_STATUS_TRANSITIONS = {
  invited: ['active', 'removed'],
  active: ['left', 'removed'],
  left: ['active'], // Can be re-invited
  removed: [] // Cannot return unless re-invited as new record
};

/**
 * Role change restrictions
 */
const ROLE_CHANGE_RULES = {
  // Who can assign what roles
  owner: ['viewer', 'editor', 'admin', 'owner'], // Owner can assign any role
  admin: ['viewer', 'editor'], // Admin cannot create other admins or owners
  editor: ['viewer'], // Editor can only invite viewers
  viewer: [] // Viewer cannot change roles
};

/**
 * Actions that require specific role levels
 */
const ACTION_REQUIREMENTS = {
  'delete': 'owner',           // Only owner can delete session
  'transfer': 'owner',         // Only owner can transfer ownership
  'manageSession': 'owner',    // Only owner can change session settings
  'remove': 'admin',           // Admin+ can remove participants
  'changeRoles': 'admin',      // Admin+ can change roles
  'invite': 'editor',          // Editor+ can invite participants
  'edit': 'editor',            // Editor+ can edit content
  'view': 'viewer'             // Anyone can view (if they have access)
};

/**
 * Legacy role mapping for backward compatibility
 */
const LEGACY_ROLE_MAPPING = {
  'edit': 'editor',
  'view': 'viewer'
};

/**
  * Check if a role has permission for a specific action
  * @param {string} role - Role to check
  * @param {string} action - Action to check permission for
  * @returns {boolean} - Whether the role has permission for the action
  * @throws {Error} - If role or action is invalid
  * @throws {Error} - If role is unknown
  * @example
  * hasPermission('editor', 'edit'); // true
  * hasPermission('viewer', 'edit'); // false
  * @example
  * hasPermission('admin', 'delete'); // Error: Unknown role: admin
  * @example
  * hasPermission('owner', 'unknownAction'); // Error: Invalid parameters: role=owner, action=unknownAction
  * @throws {Error} - If role or action is not defined
  * @throws {Error} - If role is not recognized
  * @throws {Error} - If action is not recognized
  * @throws {Error} - If role does not have permission for the action
 */
function hasPermission(role, action) {
  if (!role || !action) {
    throw new Error(`Invalid parameters: role=${role}, action=${action}`);
  }
  
  const permissions = ROLE_PERMISSIONS[role];
  
  if (!permissions) {
    throw new Error(`Unknown role: ${role}`);
  }
  
  return permissions.includes(action);
}

/**
 * Check if a user can assign a specific role to another user
 * @param {string} assignerRole - Role of the person making the assignment
 * @param {string} targetRole - Role being assigned
 * @returns {boolean} - Whether the assignment is allowed
 */
function canAssignRole(assignerRole, targetRole) {
  if (!assignerRole || !targetRole) return false;
  
  const allowedRoles = ROLE_CHANGE_RULES[assignerRole];
  return allowedRoles ? allowedRoles.includes(targetRole) : false;
}

/**
 * Check if a role has higher or equal hierarchy than another
 * @param {string} role1 - First role
 * @param {string} role2 - Second role  
 * @returns {boolean} - Whether role1 >= role2 in hierarchy
 */
function hasHigherOrEqualRole(role1, role2) {
  const level1 = ROLE_HIERARCHY[role1] || 0;
  const level2 = ROLE_HIERARCHY[role2] || 0;
  return level1 >= level2;
}

/**
 * Normalize legacy role values to new system
 * @param {string} role - Role to normalize
 * @returns {string} - Normalized role
 */
function normalizeRole(role) {
  return LEGACY_ROLE_MAPPING[role] || role;
}

/**
 * Validate if a status transition is allowed
 * @param {string} currentStatus - Current participant status
 * @param {string} newStatus - Target status
 * @returns {boolean} - Whether transition is valid
 */
function canTransitionStatus(currentStatus, newStatus) {
  if (!currentStatus || !newStatus) return false;
  
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions ? allowedTransitions.includes(newStatus) : false;
}

/**
 * Get minimum role required for an action
 * @param {string} action - Action to check
 * @returns {string|null} - Minimum role required
 */
function getMinimumRole(action) {
  return ACTION_REQUIREMENTS[action] || null;
}

/**
 * Check if action requires specific role level
 * @param {string} userRole - User's current role
 * @param {string} action - Action to perform
 * @returns {boolean} - Whether user meets minimum role requirement
 */
function meetsMinimumRole(userRole, action) {
  const requiredRole = getMinimumRole(action);
  if (!requiredRole) return true; // No specific requirement
  
  return hasHigherOrEqualRole(userRole, requiredRole);
}

/**
 * Get all valid roles for the system
 * @returns {string[]} - Array of valid role names
 */
function getValidRoles() {
  return Object.keys(ROLE_PERMISSIONS);
}

/**
 * Get all valid statuses for participants
 * @returns {string[]} - Array of valid status names
 */
function getValidStatuses() {
  return Object.keys(VALID_STATUS_TRANSITIONS);
}

module.exports = {
  // Constants
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  VALID_STATUS_TRANSITIONS,
  ROLE_CHANGE_RULES,
  ACTION_REQUIREMENTS,
  LEGACY_ROLE_MAPPING,
  
  // Utility functions
  hasPermission,
  canAssignRole,
  hasHigherOrEqualRole,
  normalizeRole,
  canTransitionStatus,
  getMinimumRole,
  meetsMinimumRole,
  getValidRoles,
  getValidStatuses
};
