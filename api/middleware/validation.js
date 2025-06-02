/**
 * Validation Middleware
 * Handles input validation for API endpoints
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
  const { email: inviteeEmail, access = 'edit' } = req.body;
  const inviterEmail = req.body.inviterEmail || req.headers['x-user-email'];
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

  if (!['edit', 'view', 'editor', 'viewer'].includes(access)) {
    errors.push('Access level must be edit, view, editor, or viewer');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // Sanitize inputs
  req.body.email = inviteeEmail.trim().toLowerCase();
  req.body.inviterEmail = inviterEmail.trim().toLowerCase();

  next();
};

/**
 * Validate file upload data
 */
const validateFileUpload = (req, res, next) => {
  const { sessionID, email } = req.body;
  const errors = [];

  if (!req.file) {
    errors.push('File is required');
  }

  if (!sessionID || typeof sessionID !== 'string') {
    errors.push('Session ID is required');
  }

  if (!email || !isValidEmail(email)) {
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
 * Validate query parameters
 */
const validateQueryParams = (requiredParams) => {
  return (req, res, next) => {
    const errors = [];

    requiredParams.forEach(param => {
      if (!req.query[param]) {
        errors.push(`Query parameter '${param}' is required`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
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
  validateFileUpload,
  validateQueryParams
};
