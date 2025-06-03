#!/usr/bin/env node
// API Integration Test - Complete HTTP request chain
// Tests the full API stack: middleware -> controllers -> services -> models

const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Import API components
const authMiddleware = require('./middleware/auth');
const validationMiddleware = require('./middleware/validation');
const sessionController = require('./controllers/sessionController');
const Session = require('./models/Session');
const SessionParticipant = require('./models/SessionParticipant');

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab_test';
const TEST_PREFIX = 'test-api-';

// Create test Express app
function createTestApp() {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  
  // Session routes with middleware chain
  app.post('/api/sessions', 
    authMiddleware.authenticateUser,
    validationMiddleware.validateSessionCreation,
    sessionController.createSession
  );
  
  app.get('/api/sessions/:sessionId',
    authMiddleware.authenticateUser,
    sessionController.getSessionDetails
  );
  
  app.post('/api/sessions/:sessionId/invite',
    authMiddleware.authenticateUser,
    validationMiddleware.validateSessionInvitation,
    sessionController.inviteToSession
  );
  
  app.get('/api/user/sessions',
    authMiddleware.authenticateUser,
    sessionController.getUserSessions
  );
  
  return app;
}

// Test utilities
let testCount = 0;
let passCount = 0;

function test(description, testFn) {
  testCount++;
  return Promise.resolve(testFn()).then(() => {
    console.log(`✅ Test ${testCount}: ${description}`);
    passCount++;
  }).catch(err => {
    console.error(`❌ Test ${testCount}: ${description}`);
    console.error(`   Error: ${err.message}`);
  });
}

async function runAPIIntegrationTests() {
  console.log('🔍 API Integration Test - Complete HTTP Chain');
  console.log('==============================================\n');

  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('📦 Connected to MongoDB\n');

    // Clear existing test data
    await Session.deleteMany({ sessionId: { $regex: new RegExp(`^${TEST_PREFIX}`) } });
    await SessionParticipant.deleteMany({ sessionId: { $regex: new RegExp(`^${TEST_PREFIX}`) } });

    const app = createTestApp();
    
    // Test data
    const testCreator = 'api-creator@example.com';
    const testInvitee = 'api-invitee@example.com';
    const testSessionId = `${TEST_PREFIX}main`;

    // Test 1: Session Creation via API
    await test('POST /api/sessions creates session correctly', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({
          sessionId: testSessionId,
          name: 'API Test Session',
          description: 'Testing complete API chain',
          email: testCreator // Authentication email
        })
        .expect(201);
      
      if (!response.body.success || !response.body.session) {
        throw new Error('Session creation API failed');
      }
      
      if (response.body.session.sessionId !== testSessionId) {
        throw new Error('Session ID mismatch');
      }
    });

    // Test 2: Get Session Details via API
    await test('GET /api/sessions/:sessionId returns details correctly', async () => {
      const response = await request(app)
        .get(`/api/sessions/${testSessionId}`)
        .set('Authorization', `Bearer mock-token-${testCreator}`)
        .expect(200);
      
      if (!response.body.success || !response.body.session) {
        throw new Error('Get session details API failed');
      }
      
      if (response.body.session.sessionId !== testSessionId) {
        throw new Error('Session details mismatch');
      }
    });

    // Test 3: Get User Sessions via API
    await test('GET /api/user/sessions returns user sessions', async () => {
      const response = await request(app)
        .get('/api/user/sessions')
        .set('Authorization', `Bearer mock-token-${testCreator}`)
        .expect(200);
      
      if (!response.body.success || !response.body.sessions) {
        throw new Error('Get user sessions API failed');
      }
      
      const foundSession = response.body.sessions.find(s => s.sessionId === testSessionId);
      if (!foundSession) {
        throw new Error('Created session not found in user sessions');
      }
    });

    // Test 4: Session Invitation with NEW field pattern
    await test('POST /api/sessions/:sessionId/invite works with NEW pattern', async () => {
      const response = await request(app)
        .post(`/api/sessions/${testSessionId}/invite`)
        .set('Authorization', `Bearer mock-token-${testCreator}`)
        .send({
          inviteeEmail: testInvitee,  // NEW pattern: inviteeEmail field
          role: 'editor',            // NEW pattern: role field
          inviterEmail: testCreator  // Explicit inviter
        })
        .expect(200);
      
      if (!response.body.success) {
        throw new Error(`Invitation failed: ${response.body.message}`);
      }
      
      if (!response.body.participant || response.body.participant.userEmail !== testInvitee) {
        throw new Error('Invitation response data incorrect');
      }
    });

    // Test 5: Session Invitation with LEGACY field pattern
    await test('POST /api/sessions/:sessionId/invite works with LEGACY pattern', async () => {
      const newInvitee = 'legacy-invitee@example.com';
      
      const response = await request(app)
        .post(`/api/sessions/${testSessionId}/invite`)
        .set('Authorization', `Bearer mock-token-${testCreator}`)
        .send({
          email: newInvitee,         // LEGACY pattern: email field for invitee
          access: 'edit',           // LEGACY pattern: access field
          inviterEmail: testCreator  // Explicit inviter
        })
        .expect(200);
      
      if (!response.body.success) {
        throw new Error(`Legacy invitation failed: ${response.body.message}`);
      }
      
      if (!response.body.participant || response.body.participant.userEmail !== newInvitee) {
        throw new Error('Legacy invitation response data incorrect');
      }
    });

    // Test 6: Field Priority System Test
    await test('Field priority system works correctly when both patterns present', async () => {
      const priorityInvitee = 'priority-test@example.com';
      
      const response = await request(app)
        .post(`/api/sessions/${testSessionId}/invite`)
        .set('Authorization', `Bearer mock-token-${testCreator}`)
        .send({
          email: 'wrong-email@example.com',      // LEGACY pattern
          inviteeEmail: priorityInvitee,         // NEW pattern - should take priority
          access: 'view',                       // LEGACY pattern
          role: 'viewer',                       // NEW pattern - should take priority
          inviterEmail: testCreator
        })
        .expect(200);
      
      if (!response.body.success) {
        throw new Error(`Priority test failed: ${response.body.message}`);
      }
      
      // Should use NEW pattern values
      if (response.body.participant.userEmail !== priorityInvitee) {
        throw new Error('Field priority system failed - wrong email used');
      }
      
      if (response.body.participant.role !== 'viewer') {
        throw new Error('Field priority system failed - wrong role used');
      }
    });

    // Test 7: Authentication Middleware
    await test('Authentication middleware blocks unauthorized requests', async () => {
      await request(app)
        .get(`/api/sessions/${testSessionId}`)
        // No Authorization header
        .expect(401);
    });

    // Test 8: Validation Middleware - Missing Fields
    await test('Validation middleware catches missing required fields', async () => {
      const response = await request(app)
        .post(`/api/sessions/${testSessionId}/invite`)
        .set('Authorization', `Bearer mock-token-${testCreator}`)
        .send({
          role: 'editor'
          // Missing inviteeEmail/email
        })
        .expect(400);
      
      if (!response.body.message || !response.body.message.includes('email')) {
        throw new Error('Validation should catch missing email');
      }
    });

    // Test 9: Validation Middleware - Invalid Role
    await test('Validation middleware catches invalid roles', async () => {
      const response = await request(app)
        .post(`/api/sessions/${testSessionId}/invite`)
        .set('Authorization', `Bearer mock-token-${testCreator}`)
        .send({
          inviteeEmail: 'test@example.com',
          role: 'invalid-role'
        })
        .expect(400);
      
      if (!response.body.message || !response.body.message.includes('role')) {
        throw new Error('Validation should catch invalid role');
      }
    });

    // Test 10: Session Not Found
    await test('API handles non-existent session correctly', async () => {
      await request(app)
        .get('/api/sessions/nonexistent-session')
        .set('Authorization', `Bearer mock-token-${testCreator}`)
        .expect(404);
    });

    // Test 11: Unauthorized Session Access
    await test('API blocks unauthorized session access', async () => {
      await request(app)
        .get(`/api/sessions/${testSessionId}`)
        .set('Authorization', `Bearer mock-token-unauthorized@example.com`)
        .expect(403);
    });

    // Test 12: Duplicate Invitation Handling
    await test('API handles duplicate invitations correctly', async () => {
      const response = await request(app)
        .post(`/api/sessions/${testSessionId}/invite`)
        .set('Authorization', `Bearer mock-token-${testCreator}`)
        .send({
          inviteeEmail: testInvitee, // Already invited
          role: 'admin'
        })
        .expect(200);
      
      // Should return existing participant, not create new one
      if (!response.body.success) {
        throw new Error('Duplicate invitation handling failed');
      }
    });

    // Test 13: Insufficient Permissions for Invitation
    await test('API blocks unauthorized invitations', async () => {
      const response = await request(app)
        .post(`/api/sessions/${testSessionId}/invite`)
        .set('Authorization', `Bearer mock-token-${testInvitee}`) // Invitee trying to invite
        .send({
          inviteeEmail: 'another@example.com',
          role: 'viewer'
        })
        .expect(403);
      
      if (!response.body.message || !response.body.message.includes('permission')) {
        throw new Error('Should block unauthorized invitations');
      }
    });

    // Test 14: Complete Workflow Integration
    await test('Complete API workflow works end-to-end', async () => {
      const workflowSessionId = `${TEST_PREFIX}workflow`;
      const workflowCreator = 'workflow-creator@example.com';
      const workflowInvitee = 'workflow-invitee@example.com';
      
      // 1. Create session
      const createResponse = await request(app)
        .post('/api/sessions')
        .send({
          sessionId: workflowSessionId,
          name: 'Workflow Test Session',
          email: workflowCreator
        })
        .expect(201);
      
      // 2. Invite user
      const inviteResponse = await request(app)
        .post(`/api/sessions/${workflowSessionId}/invite`)
        .set('Authorization', `Bearer mock-token-${workflowCreator}`)
        .send({
          inviteeEmail: workflowInvitee,
          role: 'editor'
        })
        .expect(200);
      
      // 3. Get session details
      const detailsResponse = await request(app)
        .get(`/api/sessions/${workflowSessionId}`)
        .set('Authorization', `Bearer mock-token-${workflowCreator}`)
        .expect(200);
      
      // 4. Get user sessions
      const userSessionsResponse = await request(app)
        .get('/api/user/sessions')
        .set('Authorization', `Bearer mock-token-${workflowCreator}`)
        .expect(200);
      
      // Verify workflow
      if (!createResponse.body.success || !inviteResponse.body.success ||
          !detailsResponse.body.success || !userSessionsResponse.body.success) {
        throw new Error('Complete workflow failed');
      }
      
      // Verify invited user can access session
      const inviteeAccessResponse = await request(app)
        .get(`/api/sessions/${workflowSessionId}`)
        .set('Authorization', `Bearer mock-token-${workflowInvitee}`)
        .expect(200);
      
      if (!inviteeAccessResponse.body.success) {
        throw new Error('Invitee cannot access session');
      }
    });

    // Test 15: Error Response Format Consistency
    await test('Error responses have consistent format', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({
          // Missing required fields
          name: 'Invalid Session'
        });
      
      if (!response.body.hasOwnProperty('success') || 
          !response.body.hasOwnProperty('message')) {
        throw new Error('Error response format inconsistent');
      }
      
      if (response.body.success !== false) {
        throw new Error('Error response should have success: false');
      }
    });

    // Test 16: Success Response Format Consistency
    await test('Success responses have consistent format', async () => {
      const response = await request(app)
        .get('/api/user/sessions')
        .set('Authorization', `Bearer mock-token-${testCreator}`)
        .expect(200);
      
      if (!response.body.hasOwnProperty('success') || 
          response.body.success !== true) {
        throw new Error('Success response format inconsistent');
      }
    });

    // Test 17: Content-Type Handling
    await test('API handles JSON content-type correctly', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({
          sessionId: `${TEST_PREFIX}content-type`,
          name: 'Content Type Test',
          email: testCreator
        }))
        .expect(201);
      
      if (!response.body.success) {
        throw new Error('JSON content-type handling failed');
      }
    });

    // Test 18: Large Payload Handling
    await test('API handles reasonable payload sizes', async () => {
      const longDescription = 'A'.repeat(1000); // 1KB description
      
      const response = await request(app)
        .post('/api/sessions')
        .send({
          sessionId: `${TEST_PREFIX}large-payload`,
          name: 'Large Payload Test',
          description: longDescription,
          email: testCreator
        })
        .expect(201);
      
      if (!response.body.success || 
          response.body.session.description !== longDescription) {
        throw new Error('Large payload handling failed');
      }
    });

    // Test 19: Multiple Concurrent Requests
    await test('API handles concurrent requests correctly', async () => {
      const promises = [];
      const concurrentCreator = 'concurrent-creator@example.com';
      
      // Create multiple sessions concurrently
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/sessions')
            .send({
              sessionId: `${TEST_PREFIX}concurrent-${i}`,
              name: `Concurrent Session ${i}`,
              email: concurrentCreator
            })
            .expect(201)
        );
      }
      
      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.body.success).length;
      
      if (successCount !== 5) {
        throw new Error('Concurrent request handling failed');
      }
    });

    // Test 20: Field Mapping Documentation Test
    await test('Field mapping works as documented', async () => {
      // This test verifies our field mapping fix is working as intended
      const testSessionId2 = `${TEST_PREFIX}mapping`;
      
      // Create session
      await request(app)
        .post('/api/sessions')
        .send({
          sessionId: testSessionId2,
          name: 'Mapping Test Session',
          email: testCreator
        })
        .expect(201);
      
      // Test both patterns work
      const newPatternResponse = await request(app)
        .post(`/api/sessions/${testSessionId2}/invite`)
        .set('Authorization', `Bearer mock-token-${testCreator}`)
        .send({
          inviteeEmail: 'new-pattern@example.com',
          role: 'editor'
        })
        .expect(200);
      
      const legacyPatternResponse = await request(app)
        .post(`/api/sessions/${testSessionId2}/invite`)
        .set('Authorization', `Bearer mock-token-${testCreator}`)
        .send({
          email: 'legacy-pattern@example.com',
          access: 'edit'
        })
        .expect(200);
      
      if (!newPatternResponse.body.success || !legacyPatternResponse.body.success) {
        throw new Error('Field mapping documentation test failed');
      }
    });

    // Final cleanup
    await Session.deleteMany({ sessionId: { $regex: new RegExp(`^${TEST_PREFIX}`) } });
    await SessionParticipant.deleteMany({ sessionId: { $regex: new RegExp(`^${TEST_PREFIX}`) } });

    console.log('\n📊 API Integration Test Results');
    console.log('===============================');
    console.log(`Total Tests: ${testCount}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${testCount - passCount}`);
    
    if (passCount === testCount) {
      console.log('\n🎉 ALL API INTEGRATION TESTS PASSED!');
      console.log('✅ Complete API stack is working correctly');
      console.log('✅ Field mapping fix is successful');
      console.log('✅ Both NEW and LEGACY field patterns are supported');
    } else {
      console.log('\n⚠️  Some API integration tests failed');
      console.log('❌ API stack needs further fixes');
    }

  } catch (error) {
    console.error('❌ API integration test setup failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📦 Disconnected from MongoDB');
  }
}

// Run tests if called directly
if (require.main === module) {
  runAPIIntegrationTests().catch(console.error);
}

module.exports = { runAPIIntegrationTests };
