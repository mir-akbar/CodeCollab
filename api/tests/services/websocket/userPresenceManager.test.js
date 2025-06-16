/**
 * User Presence Manager Tests
 * Tests for user information and presence functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import UserPresenceManager from '../../../services/websocket/managers/UserPresenceManager.js';

describe('UserPresenceManager', () => {
  let userPresenceManager;
  let mockRoomManagerInterface;
  let mockWs;

  beforeEach(() => {
    mockRoomManagerInterface = {
      broadcastToRoom: () => {},
      getRoomSize: () => 3
    };

    userPresenceManager = new UserPresenceManager(mockRoomManagerInterface);

    mockWs = {
      docName: 'test-room',
      userEmail: null,
      userId: null,
      userName: null
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isUserPresenceMessage', () => {
    it('should identify user presence message types correctly', () => {
      expect(userPresenceManager.isUserPresenceMessage('set-user-info')).toBe(true);
      expect(userPresenceManager.isUserPresenceMessage('user-presence')).toBe(true);
      expect(userPresenceManager.isUserPresenceMessage('chat-message')).toBe(false);
      expect(userPresenceManager.isUserPresenceMessage('video-offer')).toBe(false);
    });
  });

  describe('handleUserPresenceMessage', () => {
    it('should handle set-user-info messages', () => {
      const data = {
        type: 'set-user-info',
        userInfo: {
          userId: 'user123',
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      userPresenceManager.handleUserPresenceMessage(mockWs, data);

      expect(mockWs.userId).toBe('user123');
      expect(mockWs.userEmail).toBe('test@example.com');
      expect(mockWs.userName).toBe('Test User');
      expect(mockRoomManagerInterface.broadcastToRoom).toHaveBeenCalled();
    });

    it('should handle user-presence messages', () => {
      const data = {
        type: 'user-presence',
        room: 'test-room',
        status: 'online'
      };

      userPresenceManager.handleUserPresenceMessage(mockWs, data);

      expect(mockRoomManagerInterface.broadcastToRoom).toHaveBeenCalledWith(
        'test-room',
        expect.objectContaining({
          type: 'user-presence',
          status: 'online',
          timestamp: expect.any(String)
        }),
        mockWs
      );
    });

    it('should warn about unknown message types', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const data = { type: 'unknown-type' };
      userPresenceManager.handleUserPresenceMessage(mockWs, data);

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Unknown user presence message type: unknown-type');
      consoleSpy.mockRestore();
    });
  });

  describe('updateUserInfo', () => {
    it('should update user information and track connections', () => {
      const userInfo = {
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      };

      userPresenceManager.updateUserInfo(mockWs, userInfo);

      expect(mockWs.userId).toBe('user123');
      expect(mockWs.userEmail).toBe('test@example.com');
      expect(mockWs.userName).toBe('Test User');

      // Check user connection tracking
      const userKey = 'test@example.com-test-room';
      const connections = userPresenceManager.getConnectionsByUserKey(userKey);
      expect(connections.has(mockWs)).toBe(true);
    });

    it('should handle updating existing user info', () => {
      // Set initial user info
      mockWs.userEmail = 'old@example.com';
      const oldUserKey = 'old@example.com-test-room';
      userPresenceManager.connectionsByUser.set(oldUserKey, new Set([mockWs]));

      const newUserInfo = {
        userId: 'user123',
        email: 'new@example.com',
        name: 'New User'
      };

      userPresenceManager.updateUserInfo(mockWs, newUserInfo);

      // Check old connection is removed
      expect(userPresenceManager.connectionsByUser.has(oldUserKey)).toBe(false);
      
      // Check new connection is added
      const newUserKey = 'new@example.com-test-room';
      const connections = userPresenceManager.getConnectionsByUserKey(newUserKey);
      expect(connections.has(mockWs)).toBe(true);
    });

    it('should not update if userInfo is null', () => {
      const originalEmail = mockWs.userEmail;
      userPresenceManager.updateUserInfo(mockWs, null);
      expect(mockWs.userEmail).toBe(originalEmail);
    });
  });

  describe('handleUserDisconnect', () => {
    it('should clean up user tracking and notify others', () => {
      // Setup user
      mockWs.userEmail = 'test@example.com';
      mockWs.userId = 'user123';
      const userKey = 'test@example.com-test-room';
      userPresenceManager.connectionsByUser.set(userKey, new Set([mockWs]));

      userPresenceManager.handleUserDisconnect(mockWs);

      // Check user tracking cleanup
      expect(userPresenceManager.connectionsByUser.has(userKey)).toBe(false);

      // Check notification broadcast
      expect(mockRoomManagerInterface.broadcastToRoom).toHaveBeenCalledWith(
        'test-room',
        expect.objectContaining({
          type: 'user-left',
          room: 'test-room',
          user: {
            userId: 'user123',
            email: 'test@example.com'
          }
        })
      );
    });

    it('should handle disconnect when no user info is set', () => {
      userPresenceManager.handleUserDisconnect(mockWs);
      expect(mockRoomManagerInterface.broadcastToRoom).not.toHaveBeenCalled();
    });
  });

  describe('getUserPresenceStats', () => {
    it('should return user presence statistics', () => {
      const userKey1 = 'user1@example.com-room1';
      const userKey2 = 'user2@example.com-room2';
      
      userPresenceManager.connectionsByUser.set(userKey1, new Set([mockWs]));
      userPresenceManager.connectionsByUser.set(userKey2, new Set([mockWs, {}]));

      const stats = userPresenceManager.getUserPresenceStats();

      expect(stats).toEqual({
        totalUserConnections: 2,
        userConnections: [
          { userKey: userKey1, connectionCount: 1 },
          { userKey: userKey2, connectionCount: 2 }
        ]
      });
    });
  });

  describe('cleanup', () => {
    it('should clear all user connections', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      userPresenceManager.connectionsByUser.set('test-key', new Set([mockWs]));
      expect(userPresenceManager.connectionsByUser.size).toBe(1);

      userPresenceManager.cleanup();

      expect(userPresenceManager.connectionsByUser.size).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('🧹 User Presence Manager cleaned up');
      
      consoleSpy.mockRestore();
    });
  });
});
