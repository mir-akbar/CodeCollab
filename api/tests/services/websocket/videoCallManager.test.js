/**
 * Integration test for Video Call Manager Phase 1 refactoring
 * Tests that video call functionality has been properly extracted
 */

const VideoCallManager = require('../managers/VideoCallManager');
const RoomManagerInterface = require('../managers/RoomManagerInterface');

describe('Video Call Manager Phase 1 Integration', () => {
  let mockServer;
  let roomManager;
  let videoCallManager;
  let mockWs;

  beforeEach(() => {
    // Mock YjsWebSocketServer
    mockServer = {
      broadcastToRoom: jest.fn(),
      sendToUser: jest.fn(),
      getRoomUsers: jest.fn(() => []),
      hasRoom: jest.fn(() => true),
      getStats: jest.fn(() => ({ totalRooms: 0, rooms: [] }))
    };

    // Mock WebSocket
    mockWs = {
      userId: 'user123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      docName: 'session123/file.js',
      readyState: 1, // OPEN
      send: jest.fn()
    };

    roomManager = new RoomManagerInterface(mockServer);
    videoCallManager = new VideoCallManager(roomManager);
  });

  describe('Message Type Detection', () => {
    test('should identify video message types correctly', () => {
      expect(videoCallManager.isVideoMessage('video-call-start')).toBe(true);
      expect(videoCallManager.isVideoMessage('video-offer')).toBe(true);
      expect(videoCallManager.isVideoMessage('video-ice-candidate')).toBe(true);
      expect(videoCallManager.isVideoMessage('chat-message')).toBe(false);
      expect(videoCallManager.isVideoMessage('file-uploaded')).toBe(false);
    });
  });

  describe('Video Call Lifecycle', () => {
    test('should handle video call start', () => {
      const data = { sessionId: 'session123' };
      
      videoCallManager.handleVideoMessage(mockWs, { type: 'video-call-start', ...data });
      
      expect(mockServer.broadcastToRoom).toHaveBeenCalledWith(
        'session123',
        expect.objectContaining({
          type: 'video-call-started',
          sessionId: 'session123',
          initiator: expect.objectContaining({
            userId: 'user123',
            email: 'test@example.com'
          })
        }),
        mockWs
      );
      
      expect(videoCallManager.hasActiveCall('session123')).toBe(true);
    });

    test('should handle user joining video call', () => {
      // Start a call first
      videoCallManager.handleVideoMessage(mockWs, { type: 'video-call-start', sessionId: 'session123' });
      
      // Another user joins
      const mockWs2 = { ...mockWs, userId: 'user456', userEmail: 'user2@example.com' };
      videoCallManager.handleVideoMessage(mockWs2, { type: 'video-call-join', sessionId: 'session123' });
      
      expect(mockServer.broadcastToRoom).toHaveBeenCalledWith(
        'session123',
        expect.objectContaining({
          type: 'video-call-user-joined',
          participantCount: 2
        }),
        mockWs2
      );
      
      expect(videoCallManager.getCallParticipants('session123').size).toBe(2);
    });

    test('should handle WebRTC signaling', () => {
      const offerData = {
        sessionId: 'session123',
        targetUserId: 'user456',
        offer: { type: 'offer', sdp: 'mock-sdp' }
      };
      
      videoCallManager.handleVideoMessage(mockWs, { type: 'video-offer', ...offerData });
      
      expect(mockServer.sendToUser).toHaveBeenCalledWith(
        'session123',
        'user456',
        expect.objectContaining({
          type: 'video-offer',
          offer: offerData.offer,
          from: expect.objectContaining({
            userId: 'user123'
          })
        })
      );
    });
  });

  describe('Cleanup and Disconnection', () => {
    test('should clean up video call state when user disconnects', () => {
      // Start a call
      videoCallManager.handleVideoMessage(mockWs, { type: 'video-call-start', sessionId: 'session123' });
      expect(videoCallManager.hasActiveCall('session123')).toBe(true);
      
      // User disconnects
      videoCallManager.handleUserDisconnect(mockWs);
      
      // Call should be ended since no participants left
      expect(videoCallManager.hasActiveCall('session123')).toBe(false);
    });

    test('should maintain call with remaining participants', () => {
      // Start a call with multiple users
      videoCallManager.handleVideoMessage(mockWs, { type: 'video-call-start', sessionId: 'session123' });
      const mockWs2 = { ...mockWs, userId: 'user456', userEmail: 'user2@example.com' };
      videoCallManager.handleVideoMessage(mockWs2, { type: 'video-call-join', sessionId: 'session123' });
      
      expect(videoCallManager.getCallParticipants('session123').size).toBe(2);
      
      // One user disconnects
      videoCallManager.handleUserDisconnect(mockWs);
      
      // Call should still be active with remaining participant
      expect(videoCallManager.hasActiveCall('session123')).toBe(true);
      expect(videoCallManager.getCallParticipants('session123').size).toBe(1);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide accurate call statistics', () => {
      // Start multiple calls
      videoCallManager.handleVideoMessage(mockWs, { type: 'video-call-start', sessionId: 'session123' });
      
      const mockWs2 = { ...mockWs, userId: 'user456', docName: 'session456/file.js' };
      videoCallManager.handleVideoMessage(mockWs2, { type: 'video-call-start', sessionId: 'session456' });
      
      const stats = videoCallManager.getActiveCallsStats();
      
      expect(stats.totalActiveCalls).toBe(2);
      expect(stats.calls).toHaveLength(2);
      expect(stats.calls[0]).toHaveProperty('sessionId');
      expect(stats.calls[0]).toHaveProperty('participantCount');
      expect(stats.calls[0]).toHaveProperty('startedAt');
    });
  });
});

// Manual integration test helper
function createManualIntegrationTest() {
  console.log('🧪 Running manual integration test for Video Call Manager...');
  
  // This would be used to test with actual WebSocket connections
  // in a development environment
  
  const testMessages = [
    { type: 'video-call-start', sessionId: 'test-session' },
    { type: 'video-call-join', sessionId: 'test-session' },
    { type: 'video-offer', sessionId: 'test-session', targetUserId: 'user2', offer: { type: 'offer' } },
    { type: 'video-call-leave', sessionId: 'test-session' }
  ];
  
  return {
    testMessages,
    description: 'Phase 1 refactoring test - Video Call Manager extraction'
  };
}

module.exports = {
  createManualIntegrationTest
};
