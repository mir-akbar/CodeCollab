import { describe, it, expect, beforeEach } from 'vitest';
import { testUtils } from '../setup/testSetup.js';

// Import models
import SessionParticipant from '../../models/SessionParticipant.js';
import Session from '../../models/Session.js';
import User from '../../models/User.js';

describe('SessionParticipant Model', () => {
  let testUser;
  let testSession;
  let invitingUser;
  
  beforeEach(async () => {
    // Create test user
    const userData = testUtils.createTestUser();
    testUser = new User(userData);
    await testUser.save();
    
    // Create inviting user
    const invitingUserData = testUtils.createTestUser();
    invitingUser = new User(invitingUserData);
    await invitingUser.save();
    
    // Create test session
    const sessionData = {
      ...testUtils.createTestSession(),
      creator: testUser.cognitoId // Use cognitoId instead of ObjectId
    };
    testSession = new Session(sessionData);
    await testSession.save();
  });

  describe('SessionParticipant Creation', () => {
    it('should create a session participant with valid data', async () => {
      const participantData = {
        sessionId: testSession.sessionId,
        cognitoId: testUser.cognitoId, // Use cognitoId instead of user ObjectId
        role: 'viewer',
        status: 'active',
        invitedBy: invitingUser.cognitoId, // Use cognitoId instead of ObjectId
        joinedAt: new Date(),
        lastActive: new Date()
      };

      const participant = new SessionParticipant(participantData);
      const savedParticipant = await participant.save();

      expect(savedParticipant).toBeDefined();
      expect(savedParticipant.sessionId).toBe(testSession.sessionId);
      expect(savedParticipant.cognitoId).toBe(testUser.cognitoId);
      expect(savedParticipant.status).toBe('active');
    });

    it('should require cognitoId', async () => {
      const participantData = {
        sessionId: testSession.sessionId,
        role: 'viewer',
        status: 'active',
        invitedBy: invitingUser.cognitoId
      };
      // Note: cognitoId is missing

      const participant = new SessionParticipant(participantData);
      
      await expect(participant.save()).rejects.toThrow();
    });

    it('should require sessionId', async () => {
      const participantData = {
        cognitoId: testUser.cognitoId,
        role: 'viewer',
        status: 'active',
        invitedBy: invitingUser.cognitoId
      };
      // Note: sessionId is missing

      const participant = new SessionParticipant(participantData);
      
      await expect(participant.save()).rejects.toThrow();
    });

    it('should have default role as viewer', async () => {
      const participantData = {
        sessionId: testSession.sessionId,
        cognitoId: testUser.cognitoId,
        invitedBy: invitingUser.cognitoId
      };

      const participant = new SessionParticipant(participantData);
      const savedParticipant = await participant.save();

      expect(savedParticipant.role).toBe('viewer');
    });
  });

  describe('SessionParticipant Validation', () => {
    it('should validate role values', async () => {
      const participantData = {
        sessionId: testSession.sessionId,
        cognitoId: testUser.cognitoId,
        role: 'invalid_role',
        invitedBy: invitingUser.cognitoId
      };

      const participant = new SessionParticipant(participantData);
      
      await expect(participant.save()).rejects.toThrow();
    });

    it('should accept valid role values', async () => {
      const validRoles = ['owner', 'admin', 'editor', 'viewer'];
      
      for (const role of validRoles) {
        const userData = testUtils.createTestUser();
        const user = new User(userData);
        await user.save();

        const participantData = {
          sessionId: testSession.sessionId,
          cognitoId: user.cognitoId, // Use cognitoId instead of ObjectId
          role: role,
          invitedBy: invitingUser.cognitoId
        };

        const participant = new SessionParticipant(participantData);
        const savedParticipant = await participant.save();
        
        expect(savedParticipant.role).toBe(role);
      }
    });
  });

  describe('SessionParticipant Queries', () => {
    beforeEach(async () => {
      // Create multiple participants
      for (let i = 0; i < 5; i++) {
        const userData = testUtils.createTestUser();
        const user = new User(userData);
        await user.save();

        const participantData = {
          sessionId: testSession.sessionId,
          cognitoId: user.cognitoId, // Use cognitoId instead of ObjectId
          status: i % 2 === 0 ? 'active' : 'invited', // Alternate active/invited
          invitedBy: invitingUser.cognitoId
        };
        
        const participant = new SessionParticipant(participantData);
        await participant.save();
      }
    });

    it('should find participants by session', async () => {
      const participants = await SessionParticipant.find({ sessionId: testSession.sessionId });
      expect(participants.length).toBe(5);
      
      participants.forEach(participant => {
        expect(participant.sessionId).toBe(testSession.sessionId);
      });
    });

    it('should find active participants', async () => {
      const activeParticipants = await SessionParticipant.find({ 
        sessionId: testSession.sessionId, 
        status: 'active' 
      });
      
      expect(activeParticipants.length).toBeGreaterThan(0);
      activeParticipants.forEach(participant => {
        expect(participant.status).toBe('active');
      });
    });

    it('should update lastActive timestamp', async () => {
      const participant = await SessionParticipant.findOne({ sessionId: testSession.sessionId });
      const originalLastActive = participant.lastActive;
      
      // Wait a bit to ensure timestamp difference
      await testUtils.waitFor(10);
      
      participant.lastActive = new Date();
      await participant.save();

      expect(participant.lastActive.getTime()).toBeGreaterThan(originalLastActive.getTime());
    });
  });

  describe('SessionParticipant Relationships', () => {
    it('should store cognitoId correctly', async () => {
      const participantData = {
        sessionId: testSession.sessionId,
        cognitoId: testUser.cognitoId,
        invitedBy: invitingUser.cognitoId
      };

      const participant = new SessionParticipant(participantData);
      await participant.save();

      const savedParticipant = await SessionParticipant.findById(participant._id);

      expect(savedParticipant.cognitoId).toBe(testUser.cognitoId);
      expect(savedParticipant.invitedBy).toBe(invitingUser.cognitoId);
    });

    it('should find participant by cognitoId', async () => {
      const participantData = {
        sessionId: testSession.sessionId,
        cognitoId: testUser.cognitoId,
        invitedBy: invitingUser.cognitoId
      };

      const participant = new SessionParticipant(participantData);
      await participant.save();

      const foundParticipant = await SessionParticipant.findOne({ 
        cognitoId: testUser.cognitoId 
      });

      expect(foundParticipant).toBeDefined();
      expect(foundParticipant.cognitoId).toBe(testUser.cognitoId);
    });
  });
});
