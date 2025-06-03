/**
 * Authentication Middleware
 * Handles user authentication and session validation
 */

const SessionService = require('../services/sessionService');
const sessionService = new SessionService();

/**
 * Middleware to validate session access
 */
const validateSessionAccess = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userEmail = req.body.email || req.query.email || req.headers['x-user-email'];

    if (!sessionId) {
      return res.status(400).json({ 
        error: 'Session ID is required' 
      });
    }

    if (!userEmail) {
      return res.status(401).json({ 
        error: 'User email is required' 
      });
    }

    // Check if user has access to the session
    const accessResult = await sessionService.checkSessionAccess(sessionId, userEmail);
    
    if (!accessResult.hasAccess) {
      return res.status(403).json({ 
        error: 'Access denied to this session' 
      });
    }

    // Add session info to request object
    req.sessionId = sessionId;
    req.userEmail = userEmail;
    
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ 
      error: 'Session validation failed',
      details: error.message 
    });
  }
};

/**
 * Middleware to validate user email
 */
const requireAuth = (req, res, next) => {
  const userEmail = req.body.email || req.query.email || req.headers['x-user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ 
      error: 'User authentication required' 
    });
  }
  
  req.userEmail = userEmail;
  next();
};

/**
 * Middleware to validate session access for leave operations
 * This is more lenient than validateSessionAccess - it allows leaving non-existent sessions
 */
const validateLeaveAccess = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userEmail = req.body.email || req.query.email || req.headers['x-user-email'];

    if (!sessionId) {
      return res.status(400).json({ 
        error: 'Session ID is required' 
      });
    }

    if (!userEmail) {
      return res.status(401).json({ 
        error: 'User email is required' 
      });
    }

    // For leave operations, we don't require the session to exist
    // The leave logic will handle non-existent sessions gracefully
    req.sessionId = sessionId;
    req.userEmail = userEmail;
    
    next();
  } catch (error) {
    console.error('Leave access validation error:', error);
    res.status(500).json({ 
      error: 'Validation failed',
      details: error.message 
    });
  }
};

/**
 * Middleware to validate admin access (placeholder for future implementation)
 */
const requireAdmin = (req, res, next) => {
  // TODO: Implement admin validation logic
  // For now, just pass through
  next();
};

module.exports = {
  validateSessionAccess,
  validateLeaveAccess,
  requireAuth,
  requireAdmin
};
