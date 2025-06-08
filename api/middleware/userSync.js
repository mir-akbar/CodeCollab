const UserService = require('../services/userService');
const User = require('../models/User');
const userService = new UserService();

/**
 * Middleware to sync user data from Cognito authentication
 * This bridges Cognito authentication with our backend User model
 */
const syncUserFromCognito = async (req, res, next) => {
  try {
    const userEmail = req.body.email || req.query.email || req.headers['x-user-email'];
    
    if (!userEmail) {
      return next(); // Skip sync if no email provided
    }

    // Find or create user from email - use User model directly
    let user = await User.findByEmail(userEmail);
    
    if (!user) {
      // Create user from minimal data available - use User model directly
      const cognitoData = {
        email: userEmail,
        name: req.body.name || req.headers['x-user-name'] || userEmail.split('@')[0],
        cognitoId: req.body.cognitoId || req.headers['x-cognito-id'] || `migrated_${Date.now()}_${userEmail}`,
        email_verified: true
      };
      
      user = await User.createFromCognito(cognitoData);
      console.log(`🆕 Created new user during auth: ${user.email}`);
    } else {
      // Sync user data using UserService business logic
      const updatedUser = await userService.syncUserFromCognito(user, {
        name: req.body.name || req.headers['x-user-name'],
        email_verified: true
      });
      user = updatedUser;
    }
    
    // Attach user to request for downstream middleware
    req.user = user;
    req.userEmail = userEmail; // Maintain backward compatibility
    
    next();
  } catch (error) {
    console.error('Error syncing user from Cognito:', error);
    // Don't block the request if user sync fails
    req.userEmail = req.body.email || req.query.email || req.headers['x-user-email'];
    next();
  }
};

/**
 * Enhanced requireAuth middleware that includes user sync
 */
const requireAuth = async (req, res, next) => {
  const userEmail = req.body.email || req.query.email || req.headers['x-user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ 
      error: 'User authentication required' 
    });
  }
  
  try {
    // Sync user data
    await syncUserFromCognito(req, res, () => {});
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication processing failed',
      details: error.message 
    });
  }
};

/**
 * Middleware to validate user exists and is active
 */
const validateActiveUser = async (req, res, next) => {
  try {
    const userEmail = req.body.email || req.query.email || req.headers['x-user-email'];
    
    if (!userEmail) {
      return res.status(401).json({ error: 'User email required' });
    }

    // Use User model directly instead of UserService
    const user = await User.findByEmail(userEmail);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isActive()) {
      return res.status(403).json({ error: 'User account is not active' });
    }

    req.user = user;
    req.userEmail = userEmail;
    next();
  } catch (error) {
    console.error('User validation error:', error);
    res.status(500).json({ 
      error: 'User validation failed',
      details: error.message
    });
  }
};

/**
 * Middleware to extract user from session (for future secure cookie implementation)
 */
const extractUserFromSession = async (req, res, next) => {
  try {
    // TODO: Implement secure session-based authentication
    // This will replace the current email-based approach
    
    const sessionId = req.cookies?.session;
    if (!sessionId) {
      return next(); // No session cookie, continue with existing flow
    }

    // Future implementation:
    // 1. Validate session ID
    // 2. Retrieve user from session store
    // 3. Attach user to request
    // 4. Update session activity

    next();
  } catch (error) {
    console.error('Session extraction error:', error);
    next(); // Don't block on session errors during transition
  }
};

/**
 * Middleware to track user activity
 */
const trackUserActivity = (activityType) => {
  return async (req, res, next) => {
    try {
      if (req.user && req.user._id) {
        // Track activity asynchronously to avoid blocking the request
        setImmediate(async () => {
          try {
            await userService.trackActivity(req.user._id, activityType, {
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              sessionId: req.params.sessionId || req.body.sessionId
            });
          } catch (error) {
            console.error('Error tracking user activity:', error);
          }
        });
      }
      next();
    } catch (error) {
      console.error('Activity tracking middleware error:', error);
      next(); // Don't block on tracking errors
    }
  };
};

module.exports = {
  syncUserFromCognito,
  requireAuth,
  validateActiveUser,
  extractUserFromSession,
  trackUserActivity
};
