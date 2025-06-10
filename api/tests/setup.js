/**
 * API Testing Setup for CodeLab
 * Modern test configuration aligned with current system architecture
 * 
 * @version 1.0.0 - Fresh start
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';

// Test database connection
let testDbConnection;

beforeAll(async () => {
  // Connect to test database
  const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/codelab-test';
  testDbConnection = await mongoose.connect(testDbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('🧪 Connected to test database');
});

beforeEach(async () => {
  // Clean up test data before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  // Close database connection
  if (testDbConnection) {
    await mongoose.connection.close();
    console.log('🧪 Disconnected from test database');
  }
});

// Test utilities for API testing
export const apiTestUtils = {
  createTestUser: (overrides = {}) => ({
    cognitoId: `test-cognito-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    displayName: 'Test User',
    ...overrides
  }),

  createTestSession: (overrides = {}) => ({
    sessionId: `test-session-${Date.now()}`,
    name: 'Test Session',
    description: 'Test session for unit testing',
    creator: 'test@example.com',
    accessLevel: 'private',
    ...overrides
  }),

  createTestParticipant: (sessionId, userEmail, overrides = {}) => ({
    sessionId,
    cognitoId: `test-cognito-${Date.now()}`,
    userEmail,
    role: 'participant',
    status: 'active',
    joinedAt: new Date(),
    ...overrides
  })
};
