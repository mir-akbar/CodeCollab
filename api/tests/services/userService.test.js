/**
 * User Service Tests (Consolidated)
 * Tests the consolidated user management functionality including Cognito sync
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import userService from '../../services/userService.js';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';

// Get the User model, handling potential compilation conflicts
const User = mongoose.models.User || require('../../models/User.js');

describe('UserSyncService', () => {
  // Mock Cognito user data
  const mockCognitoUser = {
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
      fontFamily: 'Monaco',
      tabSize: 4
    }),
    'custom:notificationPrefs': JSON.stringify({
      sessionInvites: true,
      sessionActivity: false
    })
  };

  beforeEach(() => {
    // Reset any mocks
    vi.clearAllMocks();
  });

  describe('syncUserFromCognito', () => {
    it('should create a new user when user does not exist', async () => {
      // Act
      const result = await userSyncService.syncUserFromCognito(mockCognitoUser);

      // Assert
      expect(result).toBeDefined();
      expect(result.cognitoId).toBe(mockCognitoUser.sub);
      expect(result.email).toBe(mockCognitoUser.email.toLowerCase()); // Email is converted to lowercase
      expect(result.profile.name).toBe(mockCognitoUser.name);
      expect(result.profile.displayName).toBe(mockCognitoUser['custom:displayName']);
      expect(result.preferences.theme).toBe('dark');
      expect(result.preferences.language).toBe('en');
      expect(result.subscription.tier).toBe('pro');
      expect(result.preferences.editor.fontSize).toBe(16);
      expect(result.preferences.notifications.sessionInvites).toBe(true);

      // Verify user is saved in database
      const dbUser = await User.findOne({ cognitoId: mockCognitoUser.sub });
      expect(dbUser).toBeDefined();
      expect(dbUser.email).toBe(mockCognitoUser.email.toLowerCase()); // Email is converted to lowercase
    });

    it('should update existing user when user exists', async () => {
      // Arrange - Create existing user
      const existingUser = await User.create({
        cognitoId: mockCognitoUser.sub,
        email: mockCognitoUser.email,
        profile: {
          name: 'Old Name',
          displayName: 'Old Display Name'
        },
        preferences: {
          theme: 'light',
          language: 'es',
          editor: { fontSize: 12 },
          notifications: { sessionInvites: false }
        },
        subscription: { tier: 'free' },
        lastActiveAt: new Date('2023-01-01')
      });

      // Act
      const result = await userSyncService.syncUserFromCognito(mockCognitoUser);

      // Assert
      expect(result._id.toString()).toBe(existingUser._id.toString());
      expect(result.profile.name).toBe(mockCognitoUser.name);
      expect(result.profile.displayName).toBe(mockCognitoUser['custom:displayName']);
      expect(result.preferences.theme).toBe('dark');
      expect(result.preferences.language).toBe('en');
      expect(result.subscription.tier).toBe('pro');
      expect(result.lastActiveAt).toBeInstanceOf(Date);
      expect(result.lastActiveAt.getTime()).toBeGreaterThan(new Date('2023-01-01').getTime());
    });

    it('should handle malformed custom attributes gracefully', async () => {
      // Arrange - Cognito user with malformed JSON
      const malformedCognitoUser = {
        ...mockCognitoUser,
        'custom:editorPrefs': 'invalid-json',
        'custom:notificationPrefs': '{"incomplete": true'
      };

      // Act
      const result = await userSyncService.syncUserFromCognito(malformedCognitoUser);

      // Assert
      expect(result).toBeDefined();
      expect(result.preferences.editor).toEqual(userSyncService.getDefaultEditorPrefs());
      expect(result.preferences.notifications).toEqual(userSyncService.getDefaultNotificationPrefs());
    });

    it('should handle missing custom attributes', async () => {
      // Arrange - Minimal Cognito user data
      const minimalCognitoUser = {
        sub: faker.string.uuid(),
        email: faker.internet.email(),
        name: faker.person.fullName()
      };

      // Act
      const result = await userSyncService.syncUserFromCognito(minimalCognitoUser);

      // Assert
      expect(result).toBeDefined();
      expect(result.preferences.theme).toBe('dark');
      expect(result.preferences.language).toBe('en');
      expect(result.subscription.tier).toBe('free');
      expect(result.preferences.editor).toEqual(userSyncService.getDefaultEditorPrefs());
      expect(result.preferences.notifications).toEqual(userSyncService.getDefaultNotificationPrefs());
    });

    it('should throw error on database failure', async () => {
      // Arrange - Mock database error
      vi.spyOn(User, 'findOne').mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(userSyncService.syncUserFromCognito(mockCognitoUser))
        .rejects
        .toThrow('User sync failed: Database connection failed');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      // Arrange
      const testUser = await User.create({
        cognitoId: faker.string.uuid(),
        email: 'test@example.com',
        profile: { name: 'Test User' }
      });

      // Act
      const result = await userSyncService.getUserByEmail('test@example.com');

      // Assert
      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(testUser._id.toString());
      expect(result.email).toBe('test@example.com');
    });

    it('should handle case insensitive email search', async () => {
      // Arrange
      await User.create({
        cognitoId: faker.string.uuid(),
        email: 'test@example.com',
        profile: { name: 'Test User' }
      });

      // Act
      const result = await userSyncService.getUserByEmail('TEST@EXAMPLE.COM');

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      // Act
      const result = await userSyncService.getUserByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      // Arrange
      vi.spyOn(User, 'findOne').mockRejectedValue(new Error('Database error'));

      // Act
      const result = await userSyncService.getUserByEmail('test@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getUserByCognitoId', () => {
    it('should return user when found', async () => {
      // Arrange
      const cognitoId = faker.string.uuid();
      const testUser = await User.create({
        cognitoId,
        email: faker.internet.email(),
        profile: { name: 'Test User' }
      });

      // Act
      const result = await userSyncService.getUserByCognitoId(cognitoId);

      // Assert
      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(testUser._id.toString());
      expect(result.cognitoId).toBe(cognitoId);
    });

    it('should return null when user not found', async () => {
      // Act
      const result = await userSyncService.getUserByCognitoId('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      // Arrange
      const testUser = await User.create({
        cognitoId: faker.string.uuid(),
        email: faker.internet.email(),
        profile: { name: 'Test User' },
        preferences: {
          theme: 'light',
          language: 'en',
          editor: { fontSize: 12 },
          notifications: { sessionInvites: false }
        }
      });

      const updates = {
        theme: 'dark',
        editor: { fontSize: 16, fontFamily: 'Monaco' },
        notifications: { sessionInvites: true }
      };

      // Act
      const result = await userSyncService.updateUserPreferences(testUser._id.toString(), updates);

      // Assert
      expect(result.preferences.theme).toBe('dark');
      expect(result.preferences.editor.fontSize).toBe(16);
      expect(result.preferences.editor.fontFamily).toBe('Monaco');
      expect(result.preferences.notifications.sessionInvites).toBe(true);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const nonExistentId = new User()._id.toString();

      // Act & Assert
      await expect(userSyncService.updateUserPreferences(nonExistentId, { theme: 'dark' }))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('updateLastActive', () => {
    it('should update last active timestamp', async () => {
      // Arrange
      const testUser = await User.create({
        cognitoId: faker.string.uuid(),
        email: faker.internet.email(),
        profile: { name: 'Test User' },
        lastActiveAt: new Date('2023-01-01')
      });

      // Act
      await userSyncService.updateLastActive(testUser._id.toString());

      // Assert
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.lastActiveAt).toBeInstanceOf(Date);
      expect(updatedUser.lastActiveAt.getTime()).toBeGreaterThan(new Date('2023-01-01').getTime());
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const invalidId = 'invalid-id';

      // Act & Assert - Should return null on error
      const result = await userSyncService.updateLastActive(invalidId);
      expect(result).toBeNull();
    });
  });

  describe('getUserSessionStats', () => {
    it('should return default stats when no sessions exist', async () => {
      // Arrange
      const testUser = await User.create({
        cognitoId: faker.string.uuid(),
        email: faker.internet.email(),
        profile: { name: 'Test User' }
      });

      // Act
      const stats = await userSyncService.getUserSessionStats(testUser._id.toString());

      // Assert
      expect(stats).toEqual({
        totalSessions: 0,
        createdSessions: 0,
        joinedSessions: 0,
        roleBreakdown: {
          host: 0,
          participant: 0
        },
        totalCollaborationTime: 0,
        loginCount: 0
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const invalidId = 'invalid-id';

      // Act
      const stats = await userSyncService.getUserSessionStats(invalidId);

      // Assert
      expect(stats).toEqual({
        totalSessions: 0,
        createdSessions: 0,
        joinedSessions: 0,
        roleBreakdown: {
          host: 0,
          participant: 0
        },
        totalCollaborationTime: 0,
        loginCount: 0
      });
    });
  });

  describe('getDefaultEditorPrefs', () => {
    it('should return default editor preferences', () => {
      const prefs = userSyncService.getDefaultEditorPrefs();

      expect(prefs).toEqual({
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

  describe('getDefaultNotificationPrefs', () => {
    it('should return default notification preferences', () => {
      const prefs = userSyncService.getDefaultNotificationPrefs();

      expect(prefs).toEqual({
        sessionInvites: true,
        sessionActivity: false,
        weeklyDigest: true,
        roleChanges: true,
        systemUpdates: true
      });
    });
  });
});
