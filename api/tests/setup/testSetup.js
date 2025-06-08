import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';

let mongoServer;

// Global setup for all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  console.log('🧪 Test database connected');
});

// Global teardown for all tests
afterAll(async () => {
  // Disconnect from database
  await mongoose.disconnect();
  
  // Stop the in-memory MongoDB instance
  await mongoServer.stop();
  
  console.log('🗑️  Test database disconnected');
});

// Reset database before each test
beforeEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  
  // Reset faker seed for consistent test data
  faker.seed(123);
});

// Cleanup after each test
afterEach(async () => {
  // Clear any remaining test data
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Export test utilities
export const testUtils = {
  // Generate test user data
  createTestUser: () => ({
    cognitoId: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(), // Move name to top level
    displayName: faker.internet.username(),
    username: faker.internet.username().toLowerCase(),
    status: 'active', // Add required status field
    preferences: {
      theme: 'dark',
      language: 'en',
      notifications: {
        sessionInvites: true,
        fileChanges: false,
        collaboratorJoined: true,
        systemUpdates: true
      },
      editor: {
        fontSize: 14,
        tabSize: 2,
        wordWrap: true,
        minimap: true,
        theme: 'vs-dark',
        autoSave: true
      },
      collaboration: {
        showCursors: true,
        showUserNames: true,
        autoSaveInterval: 30000,
        sharePresence: true
      }
    },
    status: 'active'
  }),
  
  // Generate test session data
  createTestSession: () => ({
    sessionId: faker.string.uuid(),
    name: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    creator: faker.string.uuid(), // Use cognitoId string instead of ObjectId
    status: 'active',
    settings: {
      isPrivate: false,
      maxParticipants: faker.number.int({ min: 5, max: 50 }),
      language: 'javascript',
      allowedDomains: []
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  
  // Generate test session participant data
  createTestSessionParticipant: () => ({
    sessionId: faker.string.uuid(),
    cognitoId: faker.string.uuid(), // Use cognitoId instead of user ObjectId
    role: 'viewer',
    status: 'active',
    invitedBy: faker.string.uuid(), // Use cognitoId instead of ObjectId
    joinedAt: new Date(),
    lastActive: new Date()
  }),
  
  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Database utilities
  async clearCollection(collectionName) {
    await mongoose.connection.collection(collectionName).deleteMany({});
  },
  
  async getCollectionCount(collectionName) {
    return await mongoose.connection.collection(collectionName).countDocuments();
  }
};
