/**
 * Permission Validation Utility
 * Client-side validation for actions before making API calls
 */

import { 
  hasPermission, 
  canAssignRole, 
  getUserRole,
  checkPermissionWithSettings 
} from './permissions';

/**
 * Validate if a user can perform an action on a session
 * @param {Object} session - Session object
 * @param {string} userEmail - Email of the user attempting action
 * @param {string} action - Permission action to check
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateAction = (session, userEmail, action) => {
  if (!session || !userEmail || !action) {
    return { valid: false, message: 'Missing required information' };
  }

  const role = getUserRole(session, userEmail);
  
  // Use enhanced permission check that considers both role and session settings
  const { allowed, reason } = checkPermissionWithSettings(role, action, session.settings, userEmail);
  
  return {
    valid: allowed,
    message: allowed ? 'Action permitted' : reason || `You don't have permission to ${action} in this session`
  };
};

/**
 * Validate if user can assign a role to another participant
 * @param {Object} session - Session object
 * @param {string} assignerEmail - Email of user doing assignment
 * @param {string} targetRole - Role being assigned
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateRoleAssignment = (session, assignerEmail, targetRole) => {
  if (!session || !assignerEmail || !targetRole) {
    return { valid: false, message: 'Missing required information' };
  }
  
  // First check if user has permission to change roles
  const role = getUserRole(session, assignerEmail);
  const canChange = hasPermission(role, 'changeRoles');
  
  if (!canChange) {
    return { valid: false, message: "You don't have permission to change user roles" };
  }
  
  // Then check if user can assign the specific role
  const canAssign = canAssignRole(role, targetRole);
  
  return {
    valid: canAssign,
    message: canAssign 
      ? 'Role assignment permitted' 
      : `You don't have permission to assign the ${targetRole} role`
  };
};

/**
 * Pre-validate an invite operation
 * @param {Object} session - Session object
 * @param {string} inviterEmail - Email of user sending invitation
 * @param {string} inviteeEmail - Email of user being invited
 * @param {string} role - Role being assigned
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateInvite = (session, inviterEmail, inviteeEmail, role) => {
  if (!session || !inviterEmail || !inviteeEmail || !role) {
    return { valid: false, message: 'Missing required information' };
  }
  
  // Check if invitee is already in session
  const existingParticipant = session.participants?.find(
    p => (p.email === inviteeEmail || p.userEmail === inviteeEmail) && p.status === 'active'
  );
  
  if (existingParticipant) {
    return { valid: false, message: 'User is already a participant in this session' };
  }
  
  // Check permission to invite with session settings
  const inviterRole = getUserRole(session, inviterEmail);
  const inviteCheck = checkPermissionWithSettings(inviterRole, 'invite', session.settings, inviterEmail);
  
  if (!inviteCheck.allowed) {
    return { 
      valid: false, 
      message: inviteCheck.reason || 'You do not have permission to invite users'
    };
  }
  
  // Check domain restrictions for invitee
  if (session.settings?.allowedDomains?.length > 0) {
    const inviteeDomain = inviteeEmail.split('@')[1];
    if (!session.settings.allowedDomains.includes(inviteeDomain)) {
      return {
        valid: false,
        message: `Users from domain ${inviteeDomain} are not allowed in this session`
      };
    }
  }
  
  // Check permission to assign role
  return validateRoleAssignment(session, inviterEmail, role);
};

/**
 * Pre-validate a remove participant operation
 * @param {Object} session - Session object
 * @param {string} removerEmail - Email of user removing participant
 * @param {string} targetEmail - Email of user being removed
 * @returns {Object} - { valid: boolean, message: string }
 */
export const validateRemoveParticipant = (session, removerEmail, targetEmail) => {
  if (!session || !removerEmail || !targetEmail) {
    return { valid: false, message: 'Missing required information' };
  }
  
  // Can't remove yourself (should use leave session instead)
  if (removerEmail === targetEmail) {
    return { valid: false, message: 'Use "Leave Session" to remove yourself' };
  }
  
  // Check if target is in session
  const targetParticipant = session.participants?.find(
    p => p.email === targetEmail && p.status === 'active'
  );
  
  if (!targetParticipant) {
    return { valid: false, message: 'User is not an active participant in this session' };
  }
  
  // Check permission to remove
  const removeCheck = validateAction(session, removerEmail, 'remove');
  if (!removeCheck.valid) {
    return removeCheck;
  }
  
  // Special case: Can't remove session owner unless you're the owner transferring ownership
  if (targetParticipant.role === 'owner' && getUserRole(session, removerEmail) !== 'owner') {
    return { valid: false, message: 'You cannot remove the session owner' };
  }
  
  return { valid: true, message: 'Remove operation permitted' };
};

/**
 * Format error messages for display
 * @param {Error|string} error - Error object or message
 * @returns {string} - Formatted error message
 */
/**
 * Validate if a user can modify session settings
 * @param {Object} session - Session object
 * @param {string} userEmail - Email of user attempting to modify settings
 * @param {Object} newSettings - New settings object with changes
 * @returns {Object} - { valid: boolean, message: string, allowedSettings?: string[] }
 */
export const validateSettingsUpdate = (session, userEmail, newSettings) => {
  if (!session || !userEmail) {
    return { valid: false, message: 'Missing required information' };
  }
  
  // First check basic permissions to manage session
  const userRole = getUserRole(session, userEmail);
  const basicCheck = checkPermissionWithSettings(userRole, 'manageSettings', session.settings, userEmail);
  
  if (!basicCheck.allowed) {
    return {
      valid: false,
      message: basicCheck.reason || 'You do not have permission to modify session settings'
    };
  }
  
  // Define which roles can modify which settings (should match backend)
  const SETTING_CHANGE_PERMISSIONS = {
    'invitePolicy': 'owner',
    'allowRoleRequests': 'owner', 
    'allowedDomains': 'owner',
    'maxParticipants': 'owner',
    'isPrivate': 'owner',
    'allowGuestAccess': 'owner'
  };
  
  const allowedSettings = [];
  const forbiddenSettings = [];
  
  // Check individual settings permissions
  if (newSettings) {
    Object.keys(newSettings).forEach(settingName => {
      const requiredRole = SETTING_CHANGE_PERMISSIONS[settingName];
      if (!requiredRole) {
        // Unknown setting
        forbiddenSettings.push(settingName);
      } else if (
        (userRole === 'owner') || 
        (userRole === requiredRole) || 
        (userRole === 'admin' && requiredRole === 'admin')
      ) {
        // User has permission for this setting
        allowedSettings.push(settingName);
      } else {
        // User doesn't have permission for this setting
        forbiddenSettings.push(settingName);
      }
    });
  }
  
  if (forbiddenSettings.length > 0) {
    return {
      valid: false,
      message: `You don't have permission to modify these settings: ${forbiddenSettings.join(', ')}`,
      allowedSettings
    };
  }
  
  return {
    valid: true,
    message: 'Settings update permitted',
    allowedSettings
  };
};

export const formatPermissionError = (error) => {
  if (!error) return 'Unknown error occurred';
  
  // Handle normal error objects
  const message = error.message || error.toString();
  
  // Check for common permission patterns
  if (message.includes('permission') || message.includes('Permission')) {
    return `🔒 ${message}`;
  }
  
  // Check for API responses that might contain error info
  if (error.response?.data?.error) {
    return `🔒 ${error.response.data.error}`;
  }
  
  return message;
};
