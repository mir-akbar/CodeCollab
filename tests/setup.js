/**
 * Modern Testing Setup for CodeLab
 * Supports both frontend and backend testing with current architecture
 * 
 * @version 1.0.0 - Fresh start after system reorganization
 */

import { beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Frontend test setup
beforeEach(() => {
  // Setup for each test
});

afterEach(() => {
  // Cleanup React components after each test
  cleanup();
});

// Global test utilities
export const testUtils = {
  // Add test utilities as needed for the current system
  mockUser: (overrides = {}) => ({
    cognitoId: 'test-cognito-id',
    email: 'test@example.com',
    displayName: 'Test User',
    ...overrides
  }),
  
  mockSession: (overrides = {}) => ({
    sessionId: 'test-session-id',
    name: 'Test Session',
    description: 'Test Description',
    creator: 'test@example.com',
    createdAt: new Date(),
    ...overrides
  })
};
