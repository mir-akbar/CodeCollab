/**
 * Simplified Cognito-Native Authentication Middleware
 * Replaces the complex 270-line auth.js with clean Cognito JWT verification
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const userSyncService = require('../services/userSyncService');

// Cognito configuration
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_REGION = process.env.COGNITO_REGION || 'us-east-1';
const COGNITO_ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;

// JWKS client for Cognito public keys
const client = jwksClient({
  jwksUri: `${COGNITO_ISSUER}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

/**
 * Get Cognito public key for JWT verification
 */
const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
};

/**
 * Verify Cognito JWT token
 */
const verifyCognitoToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      issuer: COGNITO_ISSUER,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
};

/**
 * Simplified authentication middleware using Cognito JWT
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }

    // Verify Cognito JWT token
    const decoded = await verifyCognitoToken(token);

    // Debug: Log the decoded token to see what attributes we're getting
    // console.log('Decoded Cognito token:', JSON.stringify(decoded, null, 2));

    // Ensure token is an access token (not ID token)
    if (decoded.token_use !== 'access') {
      return res.status(401).json({
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Find or create user in database using sync service
    // Pass both decoded token data and raw token for user attribute fetching
    const tokenDataWithToken = {
      ...decoded,
      token: token // Include raw token for Cognito API calls
    };
    const user = await userSyncService.syncUserFromCognito(tokenDataWithToken);

    // Add user info to request
    req.user = {
      id: user._id,
      cognitoId: decoded.sub,
      email: user.email, // Use email from database, not token
      name: user.name || user.displayName,
      displayName: user.displayName,
      theme: user.preferences?.theme || 'dark',
      subscriptionTier: user.subscription?.tier || 'free',
      mongoUser: user // Include full MongoDB user document
    };

    // Maintain backward compatibility
    req.userEmail = user.email; // Use email from database, not token

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * Optional middleware - extract user info without requiring authentication
 * Useful for endpoints that work for both authenticated and unauthenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    await requireAuth(req, res, next);
  } catch {
    // Continue without authentication
    req.user = null;
    req.userEmail = null;
    next();
  }
};

/**
 * Session access validation - simplified version
 */
const validateSessionAccess = async (req, res, next) => {
  const { sessionId } = req.params;
  
  if (!sessionId) {
    return res.status(400).json({
      error: 'Session ID is required'
    });
  }

  // First ensure user is authenticated
  await requireAuth(req, res, async () => {
    try {
      const SessionService = require('../services/session/ModularSessionService');
      const sessionService = new SessionService();
      
      // Check session access using existing service
      const accessResult = await sessionService.checkSessionAccess(sessionId, req.user.email);
      
      if (!accessResult.hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this session'
        });
      }

      req.sessionId = sessionId;
      next();
    } catch (error) {
      console.error('Session access validation error:', error);
      res.status(500).json({
        error: 'Session validation failed'
      });
    }
  });
};

module.exports = {
  requireAuth,
  optionalAuth,
  validateSessionAccess,
  verifyCognitoToken
};
