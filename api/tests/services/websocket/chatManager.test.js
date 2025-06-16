/**
 * Chat Manager Test - Easy to test locally!
 * Tests chat functionality that doesn't require HTTPS or special setup
 */

const ChatManager = require('../managers/ChatManager');
const RoomManagerInterface = require('../managers/RoomManagerInterface');

describe('Chat Manager - Locally Testable', () => {
  let mockServer;
  let roomManager;
  let chatManager;
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
      send: jest.fn(),
      OPEN: 1
    };

    roomManager = new RoomManagerInterface(mockServer);
    chatManager = new ChatManager(roomManager);
  });

  describe('Message Type Detection', () => {
    test('should identify chat message types correctly', () => {
      expect(chatManager.isChatMessage('chat-message')).toBe(true);
      expect(chatManager.isChatMessage('video-call-start')).toBe(false);
      expect(chatManager.isChatMessage('file-uploaded')).toBe(false);
    });
  });

  describe('Chat Message Broadcasting', () => {
    test('should broadcast valid chat messages', () => {
      const chatData = {
        type: 'chat-message',
        sessionId: 'session123',
        message: 'Hello everyone!',
        timestamp: new Date().toISOString()
      };
      
      chatManager.handleChatMessage(mockWs, chatData);
      
      expect(mockServer.broadcastToRoom).toHaveBeenCalledWith(
        'session123',
        expect.objectContaining({
          type: 'chat-message',
          message: 'Hello everyone!',
          user: expect.objectContaining({
            userId: 'user123',
            email: 'test@example.com'
          })
        }),
        mockWs
      );
    });

    test('should validate message content', () => {
      const validation1 = chatManager.validateChatMessage({
        message: 'Valid message',
        sessionId: 'session123'
      });
      expect(validation1.valid).toBe(true);

      const validation2 = chatManager.validateChatMessage({
        message: '',
        sessionId: 'session123'
      });
      expect(validation2.valid).toBe(false);
      expect(validation2.error).toContain('empty');

      const validation3 = chatManager.validateChatMessage({
        message: 'x'.repeat(1001),
        sessionId: 'session123'
      });
      expect(validation3.valid).toBe(false);
      expect(validation3.error).toContain('too long');
    });

    test('should trim whitespace from messages', () => {
      const chatData = {
        type: 'chat-message',
        sessionId: 'session123',
        message: '  Hello with spaces  '
      };
      
      chatManager.handleChatMessage(mockWs, chatData);
      
      expect(mockServer.broadcastToRoom).toHaveBeenCalledWith(
        'session123',
        expect.objectContaining({
          message: 'Hello with spaces'
        }),
        mockWs
      );
    });
  });

  describe('Chat History', () => {
    test('should store chat messages in history', () => {
      const chatData = {
        type: 'chat-message',
        sessionId: 'session123',
        message: 'First message'
      };
      
      chatManager.handleChatMessage(mockWs, chatData);
      
      const history = chatManager.getChatHistory('session123');
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('First message');
      expect(history[0].user.email).toBe('test@example.com');
    });

    test('should limit chat history size', () => {
      // Set a small limit for testing
      chatManager.maxHistoryPerRoom = 3;
      
      // Send 5 messages
      for (let i = 1; i <= 5; i++) {
        chatManager.handleChatMessage(mockWs, {
          type: 'chat-message',
          sessionId: 'session123',
          message: `Message ${i}`
        });
      }
      
      const history = chatManager.getChatHistory('session123');
      expect(history).toHaveLength(3);
      expect(history[0].message).toBe('Message 3'); // First 2 should be removed
      expect(history[2].message).toBe('Message 5');
    });

    test('should send chat history to new users', () => {
      // Add some chat history
      chatManager.handleChatMessage(mockWs, {
        type: 'chat-message',
        sessionId: 'session123',
        message: 'Existing message'
      });
      
      // New user joins
      const newUser = { ...mockWs, userId: 'user456', userEmail: 'newuser@example.com' };
      chatManager.sendChatHistoryToUser(newUser, 'session123');
      
      expect(newUser.send).toHaveBeenCalledWith(
        JSON.stringify(expect.objectContaining({
          type: 'chat-history',
          room: 'session123',
          messages: expect.arrayContaining([
            expect.objectContaining({
              message: 'Existing message'
            })
          ])
        }))
      );
    });
  });

  describe('Chat Statistics', () => {
    test('should provide accurate chat statistics', () => {
      // Add messages to multiple rooms
      chatManager.handleChatMessage(mockWs, {
        type: 'chat-message',
        sessionId: 'session123',
        message: 'Message in room 1'
      });
      
      const mockWs2 = { ...mockWs, docName: 'session456/file.js' };
      chatManager.handleChatMessage(mockWs2, {
        type: 'chat-message',
        sessionId: 'session456',
        message: 'Message in room 2'
      });
      
      const stats = chatManager.getChatStats();
      
      expect(stats.totalRoomsWithChat).toBe(2);
      expect(stats.totalMessages).toBe(2);
      expect(stats.rooms).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid messages gracefully', () => {
      const invalidData = {
        type: 'chat-message',
        sessionId: 'session123'
        // missing message
      };
      
      const result = chatManager.broadcastValidatedChatMessage(mockWs, invalidData);
      
      expect(result).toBe(false);
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify(expect.objectContaining({
          type: 'chat-error',
          error: expect.stringContaining('required')
        }))
      );
    });
  });
});

// Manual test helper for local development
function createLocalChatTest() {
  console.log('💬 Creating local chat test setup...');
  
  // This creates test messages you can send via WebSocket client
  const testMessages = [
    {
      type: 'chat-message',
      sessionId: 'test-session',
      message: 'Hello from the chat manager!',
      timestamp: new Date().toISOString()
    },
    {
      type: 'chat-message',
      sessionId: 'test-session',
      message: 'This is a second message',
      timestamp: new Date().toISOString()
    },
    {
      type: 'chat-message',
      sessionId: 'test-session',
      message: '',  // This should trigger validation error
      timestamp: new Date().toISOString()
    }
  ];
  
  return {
    testMessages,
    description: 'Chat Manager local test - send these messages via WebSocket',
    instructions: [
      '1. Start your local server',
      '2. Connect to WebSocket endpoint',
      '3. Send user info first: {"type": "set-user-info", "userInfo": {"email": "test@example.com"}}',
      '4. Send test chat messages above',
      '5. Check server logs for chat broadcasting',
      '6. Try invalid messages to test validation'
    ]
  };
}

module.exports = {
  createLocalChatTest
};
