/**
 * Cognito Authentication Middleware Tests
 * Tests the enhanced authentication middleware with user synchronization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { requireAuth as cognitoAuth } from '../../middleware/cognitoAuth.js';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';

// Get the User model, handling potential compilation conflicts
const User = mongoose.models.User || require('../../models/User.js');

// Mock the jwks-rsa module
vi.mock('jwks-rsa', () => ({
  default: () => ({
    getSigningKey: vi.fn().mockResolvedValue({
      getPublicKey: () => 'mock-public-key'
    })
  })
}));

// Mock jwt.verify
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn()
  }
}));

describe('Cognito Authentication Middleware', () => {
  let req, res, next;
  let mockToken;
  let mockCognitoPayload;

  beforeEach(() => {
    // Setup mock request/response objects
    req = {
      headers: {},
      cookies: {}
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();

    // Mock Cognito token payload
    mockCognitoPayload = {
      sub: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      given_name: faker.person.firstName(),
      'custom:displayName': faker.person.fullName(),
      'custom:theme': 'dark',
      'custom:language': 'en',
      'custom:subscriptionTier': 'pro',
      'custom:editorPrefs': JSON.stringify({
        fontSize: 16,
        fontFamily: 'Monaco'
      }),
      'custom:notificationPrefs': JSON.stringify({
        sessionInvites: true,
        sessionActivity: false
      }),
      exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
      iat: Math.floor(Date.now() / 1000),
      token_use: 'access'
    };

    mockToken = 'mock-jwt-token';

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token Validation', () => {
    it('should authenticate valid token from Authorization header', async () => {
      // Arrange
      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockResolvedValue(mockCognitoPayload);

      // Act
      await cognitoAuth(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, expect.any(Function), expect.any(Object));
      expect(req.user).toEqual(mockCognitoPayload);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should authenticate valid token from cookie', async () => {
      // Arrange
      req.cookies.authToken = mockToken;
      jwt.verify.mockResolvedValue(mockCognitoPayload);

      // Act
      await cognitoAuth(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, expect.any(Function), expect.any(Object));
      expect(req.user).toEqual(mockCognitoPayload);
      expect(next).toHaveBeenCalled();
    });

    it('should reject request when no token provided', async () => {
      // Act
      await cognitoAuth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No authentication token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      // Arrange
      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockRejectedValue(new Error('Invalid token'));

      // Act
      await cognitoAuth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authentication token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      // Arrange
      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockRejectedValue(new Error('Token expired'));

      // Act
      await cognitoAuth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authentication token'
      });
    });

    it('should reject token with wrong token_use', async () => {
      // Arrange
      const idTokenPayload = {
        ...mockCognitoPayload,
        token_use: 'id' // Should be 'access'
      };
      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockResolvedValue(idTokenPayload);

      // Act
      await cognitoAuth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token type. Expected access token.'
      });
    });
  });

  describe('User Synchronization', () => {
    it('should sync new user to MongoDB on first authentication', async () => {
      // Arrange
      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockResolvedValue(mockCognitoPayload);

      // Act
      await cognitoAuth(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      
      // Verify user was created in MongoDB
      const dbUser = await User.findOne({ cognitoId: mockCognitoPayload.sub });
      expect(dbUser).toBeDefined();
      expect(dbUser.email).toBe(mockCognitoPayload.email);
      expect(dbUser.profile.displayName).toBe(mockCognitoPayload['custom:displayName']);
      expect(dbUser.preferences.theme).toBe('dark');
      expect(dbUser.subscription.tier).toBe('pro');
    });

    it('should update existing user on subsequent authentications', async () => {
      // Arrange - Create existing user with old data
      const existingUser = await User.create({
        cognitoId: mockCognitoPayload.sub,
        email: mockCognitoPayload.email,
        profile: {
          name: 'Old Name',
          displayName: 'Old Display Name'
        },
        preferences: {
          theme: 'light',
          language: 'es'
        },
        subscription: { tier: 'free' },
        lastActiveAt: new Date('2023-01-01')
      });

      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockResolvedValue(mockCognitoPayload);

      // Act
      await cognitoAuth(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      
      // Verify user was updated
      const updatedUser = await User.findOne({ cognitoId: mockCognitoPayload.sub });
      expect(updatedUser._id.toString()).toBe(existingUser._id.toString());
      expect(updatedUser.profile.displayName).toBe(mockCognitoPayload['custom:displayName']);
      expect(updatedUser.preferences.theme).toBe('dark');
      expect(updatedUser.subscription.tier).toBe('pro');
      expect(updatedUser.lastActiveAt.getTime()).toBeGreaterThan(new Date('2023-01-01').getTime());
    });

    it('should handle user sync errors gracefully', async () => {
      // Arrange
      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockResolvedValue(mockCognitoPayload);
      
      // Mock User.findOne to throw an error
      vi.spyOn(User, 'findOne').mockRejectedValue(new Error('Database connection failed'));

      // Act
      await cognitoAuth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User synchronization failed: Database connection failed'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle malformed custom attributes during sync', async () => {
      // Arrange
      const malformedPayload = {
        ...mockCognitoPayload,
        'custom:editorPrefs': 'invalid-json',
        'custom:notificationPrefs': '{"incomplete": true'
      };
      
      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockResolvedValue(malformedPayload);

      // Act
      await cognitoAuth(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      
      // Verify user was created with default preferences
      const dbUser = await User.findOne({ cognitoId: malformedPayload.sub });
      expect(dbUser).toBeDefined();
      expect(dbUser.preferences.editor).toEqual({
        fontSize: 14,
        fontFamily: 'Monaco',
        tabSize: 2,
        wordWrap: true,
        minimap: true,
        lineNumbers: true,
        autoSave: true,
        theme: 'vs-dark'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing required claims', async () => {
      // Arrange - Token without required claims
      const incompletePayload = {
        sub: faker.string.uuid(),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        token_use: 'access'
        // Missing email, name, etc.
      };
      
      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockResolvedValue(incompletePayload);

      // Act
      await cognitoAuth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token missing required claims'
      });
    });

    it('should handle Bearer token without space', async () => {
      // Arrange
      req.headers.authorization = `Bearer${mockToken}`; // Missing space
      
      // Act
      await cognitoAuth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No authentication token provided'
      });
    });

    it('should handle multiple authorization methods', async () => {
      // Arrange - Both header and cookie present
      req.headers.authorization = `Bearer ${mockToken}`;
      req.cookies.authToken = 'cookie-token';
      jwt.verify.mockResolvedValue(mockCognitoPayload);

      // Act
      await cognitoAuth(req, res, next);

      // Assert - Should prefer header over cookie
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, expect.any(Function), expect.any(Object));
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Token Verification Options', () => {
    it('should use correct JWT verification options', async () => {
      // Arrange
      req.headers.authorization = `Bearer ${mockToken}`;
      jwt.verify.mockResolvedValue(mockCognitoPayload);

      // Act
      await cognitoAuth(req, res, next);

      // Assert
      const [token, , options] = jwt.verify.mock.calls[0];
      expect(token).toBe(mockToken);
      expect(options).toEqual({
        audience: expect.any(String),
        issuer: expect.stringMatching(/https:\/\/cognito-idp\..+\.amazonaws\.com\/.+/),
        algorithms: ['RS256']
      });
    });
  });
});
