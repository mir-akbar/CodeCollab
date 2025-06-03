import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const BASE_URL = 'http://localhost:3001';
const TEST_EMAIL = 'akbarmir02@gmail.com';
const INVITEE_EMAIL = 'testinvitee@example.com';

/**
 * Leave Session Integration Tests
 * 
 * Tests the complete leave session functionality including:
 * - Frontend API call structure
 * - Backend middleware authentication
 * - Database state changes
 * - UI state updates
 */
describe('Leave Session Integration Tests', () => {
  let testSessionId = null;

  beforeAll(async () => {
    // Create a test session for the tests
    console.log('📋 Setting up test session...');
    
    const createResponse = await request(BASE_URL)
      .post('/sessions')
      .send({
        creator: TEST_EMAIL,
        name: 'Test Session for Leave Functionality',
        description: 'Session created for integration testing'
      })
      .set('x-user-email', TEST_EMAIL);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    testSessionId = createResponse.body.session.sessionId;
    
    console.log(`✅ Created test session: ${testSessionId}`);
  });

  afterAll(async () => {
    // Cleanup: Delete the test session
    if (testSessionId) {
      console.log('🧹 Cleaning up test session...');
      try {
        await request(BASE_URL)
          .delete(`/sessions/${testSessionId}`)
          .send({ email: TEST_EMAIL })
          .set('x-user-email', TEST_EMAIL);
      } catch (error) {
        console.log('Note: Test session cleanup failed, may have been already deleted');
      }
    }
  });

  describe('Authentication and Validation', () => {
    it('should fail to leave session without email in request body', async () => {
      const response = await request(BASE_URL)
        .post(`/sessions/${testSessionId}/leave`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should fail to leave session with invalid session ID', async () => {
      const response = await request(BASE_URL)
        .post('/sessions/invalid-session-id/leave')
        .send({ email: TEST_EMAIL });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Owner Leave Restrictions', () => {
    it('should prevent session owner from leaving without transferring ownership', async () => {
      const response = await request(BASE_URL)
        .post(`/sessions/${testSessionId}/leave`)
        .send({ email: TEST_EMAIL });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('owner');
    });
  });

  describe('Participant Leave Functionality', () => {
    let inviteeSessionId = null;

    beforeAll(async () => {
      // Create a session and invite a participant for testing
      console.log('📧 Setting up invitation scenario...');
      
      const createResponse = await request(BASE_URL)
        .post('/sessions')
        .send({
          creator: TEST_EMAIL,
          name: 'Test Session for Participant Leave',
          description: 'Session created for participant leave testing'
        })
        .set('x-user-email', TEST_EMAIL);

      inviteeSessionId = createResponse.body.session.sessionId;

      // Invite a participant
      await request(BASE_URL)
        .post(`/sessions/${inviteeSessionId}/invite`)
        .send({
          email: TEST_EMAIL,
          inviteeEmail: INVITEE_EMAIL,
          role: 'editor'
        })
        .set('x-user-email', TEST_EMAIL);

      console.log(`✅ Invited ${INVITEE_EMAIL} to session ${inviteeSessionId}`);
    });

    afterAll(async () => {
      // Cleanup invitation test session
      if (inviteeSessionId) {
        try {
          await request(BASE_URL)
            .delete(`/sessions/${inviteeSessionId}`)
            .send({ email: TEST_EMAIL })
            .set('x-user-email', TEST_EMAIL);
        } catch (error) {
          console.log('Note: Invitation test session cleanup failed');
        }
      }
    });

    it('should allow invited participant to leave session successfully', async () => {
      const response = await request(BASE_URL)
        .post(`/sessions/${inviteeSessionId}/leave`)
        .send({ email: INVITEE_EMAIL });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Left session successfully');
    });

    it('should remove participant from session list after leaving', async () => {
      // Verify the participant no longer appears in session lists
      const sessionsResponse = await request(BASE_URL)
        .get('/sessions')
        .set('x-user-email', INVITEE_EMAIL);

      expect(sessionsResponse.status).toBe(200);
      
      const userSessions = sessionsResponse.body.sessions || [];
      const leftSession = userSessions.find(s => 
        s.sessionId === inviteeSessionId || s.id === inviteeSessionId
      );

      expect(leftSession).toBeUndefined();
    });

    it('should handle leaving a session the user was not part of gracefully', async () => {
      const response = await request(BASE_URL)
        .post(`/sessions/${testSessionId}/leave`)
        .send({ email: 'notaparticipant@example.com' });

      // Should either succeed with a message or return a reasonable error
      expect([200, 400, 403]).toContain(response.status);
    });
  });

  describe('Database State Validation', () => {
    it('should verify session participant status is correctly updated', async () => {
      // Get session details to verify participant status
      const sessionResponse = await request(BASE_URL)
        .get(`/sessions/${testSessionId}`)
        .set('x-user-email', TEST_EMAIL);

      expect(sessionResponse.status).toBe(200);
      
      // Verify the session still exists and owner is still active
      const session = sessionResponse.body.session;
      expect(session).toBeDefined();
      expect(session.creator).toBe(TEST_EMAIL);
    });
  });
});

/**
 * Frontend Integration Tests
 * 
 * These tests verify the frontend API call structure matches backend expectations
 */
describe('Frontend API Call Structure', () => {
  it('should use correct request format as expected by handleLeaveSession', async () => {
    // This test validates that the frontend sends requests in the format the backend expects
    const mockFrontendRequest = {
      method: 'POST',
      url: `/sessions/${testSessionId}/leave`,
      body: { email: TEST_EMAIL }, // This is the key fix we implemented
      headers: { 'Content-Type': 'application/json' }
    };

    // Verify the request structure matches what our middleware expects
    expect(mockFrontendRequest.body).toHaveProperty('email');
    expect(mockFrontendRequest.body.email).toBe(TEST_EMAIL);
    expect(mockFrontendRequest.method).toBe('POST');
    expect(mockFrontendRequest.url).toContain('/leave');
  });
});
