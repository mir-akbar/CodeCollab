import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { testUtils } from '../setup/testSetup.js';

// Import models
import Session from '../../models/Session.js';
import User from '../../models/User.js';

describe('Session Model', () => {
  let testUser;
  
  beforeEach(async () => {
    // Create a test user for session relationships
    const userData = testUtils.createTestUser();
    testUser = new User(userData);
    await testUser.save();
  });

  describe('Session Creation', () => {
    it('should create a session with valid data', async () => {
      const sessionData = {
        ...testUtils.createTestSession(),
        creator: testUser.cognitoId // Use cognitoId instead of ObjectId
      };

      const session = new Session(sessionData);
      const savedSession = await session.save();

      expect(savedSession).toBeDefined();
      expect(savedSession.name).toBe(sessionData.name);
      expect(savedSession.creator).toBe(testUser.cognitoId);
      expect(savedSession.status).toBe('active');
    });

    it('should require a name', async () => {
      const sessionData = {
        ...testUtils.createTestSession(),
        creator: testUser._id
      };
      delete sessionData.name;

      const session = new Session(sessionData);
      
      await expect(session.save()).rejects.toThrow();
    });

    it('should require a creator', async () => {
      const sessionData = testUtils.createTestSession();
      delete sessionData.creator;

      const session = new Session(sessionData);
      
      await expect(session.save()).rejects.toThrow();
    });
  });

  describe('Session Methods', () => {
    let session;

    beforeEach(async () => {
      const sessionData = {
        ...testUtils.createTestSession(),
        creator: testUser._id
      };
      session = new Session(sessionData);
      await session.save();
    });

    it('should update updatedAt when session is modified', async () => {
      const originalUpdatedAt = session.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      await testUtils.waitFor(10);
      
      session.name = 'Updated Name';
      await session.save();

      expect(session.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should handle settings updates', async () => {
      const originalMaxParticipants = session.settings.maxParticipants;
      
      session.settings.maxParticipants = 25; // Use value within allowed range (max 50)
      await session.save();

      expect(session.settings.maxParticipants).not.toBe(originalMaxParticipants);
      expect(session.settings.maxParticipants).toBe(25);
    });
  });

  describe('Session Queries', () => {
    beforeEach(async () => {
      // Create multiple test sessions
      for (let i = 0; i < 3; i++) {
        const sessionData = {
          ...testUtils.createTestSession(),
          creator: testUser._id,
          status: i % 2 === 0 ? 'active' : 'archived' // Alternate active/archived
        };
        const session = new Session(sessionData);
        await session.save();
      }
    });

    it('should find active sessions', async () => {
      const activeSessions = await Session.find({ status: 'active' });
      expect(activeSessions.length).toBeGreaterThan(0);
      
      activeSessions.forEach(session => {
        expect(session.status).toBe('active');
      });
    });

    it('should find sessions by creator', async () => {
      const creatorSessions = await Session.find({ creator: testUser._id });
      expect(creatorSessions.length).toBe(3);
      
      creatorSessions.forEach(session => {
        expect(session.creator.toString()).toBe(testUser._id.toString());
      });
    });
  });
});
