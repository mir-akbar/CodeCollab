/**
 * @fileoverview Session Validation Middleware - Clean Implementation
 * 
 * Provides input validation for session-related API endpoints in the new
 * modular architecture. All legacy patterns and unused validators have been removed.
 * 
 * Features:
 * - Session creation validation
 * - Session invitation validation (clean API pattern)
 * - Session update validation
 * - Participant role validation
 * - Consistent field naming and error handling
 * 
 * @version 2.0.0
 * @author CodeLab Development Team
 * @since 2025-06-04
 */

/**
 * Validate session creation data
 */
const validateSessionCreation = (req, res, next) => {
  const { name, creator } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Session name is required and must be a non-empty string');
  }

  if (name && name.trim().length > 100) {
    errors.push('Session name must be less than 100 characters');
  }

  if (!creator || typeof creator !== 'string' || !isValidEmail(creator)) {
    errors.push('Creator email is required and must be valid');
  }

  if (req.body.description && req.body.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // Sanitize inputs
  req.body.name = name.trim();
  req.body.creator = creator.trim().toLowerCase();
  if (req.body.description) {
    req.body.description = req.body.description.trim();
  }

  next();
};

/**
 * Validate session invitation data
 */
const validateSessionInvitation = (req, res, next) => {
  const { sessionId } = req.params;
  const { inviteeEmail, inviterEmail, role } = req.body;
  const errors = [];

  if (!sessionId || typeof sessionId !== 'string') {
    errors.push('Session ID is required');
  }

  if (!inviteeEmail || !isValidEmail(inviteeEmail)) {
    errors.push('Invitee email is required and must be valid');
  }

  if (!inviterEmail || !isValidEmail(inviterEmail)) {
    errors.push('Inviter email is required and must be valid');
  }

  if (!role || !['owner', 'admin', 'editor', 'viewer'].includes(role)) {
    errors.push('Role must be owner, admin, editor, or viewer');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // Sanitize inputs
  req.body.inviteeEmail = inviteeEmail.trim().toLowerCase();
  req.body.inviterEmail = inviterEmail.trim().toLowerCase();
  req.body.role = role;

  next();
};

/**
 * Validate session update data
 */
const validateSessionUpdate = (req, res, next) => {
  const { name, description, settings } = req.body;
  const errors = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Session name must be a non-empty string');
    }
    if (name.trim().length > 100) {
      errors.push('Session name must be less than 100 characters');
    }
  }

  if (description !== undefined && description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  if (settings !== undefined && typeof settings !== 'object') {
    errors.push('Settings must be an object');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

/**
 * Validate file upload data
 */
const validateFileUpload = (req, res, next) => {
  const { sessionId, userEmail } = req.body;
  const errors = [];

  if (!req.file) {
    errors.push('File is required');
  }

  if (!sessionId || typeof sessionId !== 'string') {
    errors.push('Session ID is required');
  }

  if (!userEmail || !isValidEmail(userEmail)) {
    errors.push('User email is required and must be valid');
  }

  if (req.file && req.file.size > 50 * 1024 * 1024) {
    errors.push('File size must be less than 50MB');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

/**
 * Validate participant role data
 */
const validateParticipantRole = (req, res, next) => {
  const { role } = req.body;
  const errors = [];

  if (!role) {
    errors.push('Role is required');
  }

  if (!['owner', 'admin', 'editor', 'viewer'].includes(role)) {
    errors.push('Role must be owner, admin, editor, or viewer');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

/**
 * Helper function to validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  validateSessionCreation,
  validateSessionInvitation,
  validateSessionUpdate,
  validateFileUpload,
  validateParticipantRole
};