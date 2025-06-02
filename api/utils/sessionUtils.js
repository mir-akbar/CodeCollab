const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique session ID
 */
function generateSessionId() {
  return uuidv4();
}

/**
 * Generate a short session ID (for display purposes)
 */
function generateShortSessionId() {
  return uuidv4().substring(0, 8);
}

/**
 * Validate session ID format
 */
function isValidSessionId(sessionId) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId);
}

module.exports = {
  generateSessionId,
  generateShortSessionId,
  isValidSessionId
};
