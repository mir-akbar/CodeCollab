/**
 * Permission Validation Utility
 * Client-side validation for actions before making API calls
 */

import { hasPermission, canAssignRole, getUserRole } from './permissions';

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
  const valid = hasPermission(role, action);
  
  return {
    valid,
    message: valid ? 'Action permitted' : `You don't have permission to ${action} in this session`
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
  
  // Check permission to invite
  const inviteCheck = validateAction(session, inviterEmail, 'invite');
  if (!inviteCheck.valid) {
    return inviteCheck;
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
    p => (p.email === targetEmail || p.userEmail === targetEmail) && p.status === 'active'
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
