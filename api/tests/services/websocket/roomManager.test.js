/**
 * Room Manager Tests
 * Tests for room management functionality
 */

const RoomManager = require('../RoomManager');

describe('RoomManager', () => {
  let roomManager;
  let mockWs1, mockWs2;

  beforeEach(() => {
    roomManager = new RoomManager();

    mockWs1 = {
      readyState: 1, // WebSocket.OPEN
      OPEN: 1,
      send: jest.fn(),
      userId: 'user1',
      userEmail: 'user1@example.com',
      joinedAt: new Date(),
      docName: 'test-room'
    };

    mockWs2 = {
      readyState: 1,
      OPEN: 1,
      send: jest.fn(),
      userId: 'user2',
      userEmail: 'user2@example.com',
      joinedAt: new Date(),
      docName: 'test-room'
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('room management', () => {
    it('should create new room', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const created = roomManager.createRoom('new-room');
      
      expect(created).toBe(true);
      expect(roomManager.hasRoom('new-room')).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('🏠 Created new Y-WebSocket room: new-room');
      
      consoleSpy.mockRestore();
    });

    it('should not create room if it already exists', () => {
      roomManager.createRoom('existing-room');
      const created = roomManager.createRoom('existing-room');
      
      expect(created).toBe(false);
    });

    it('should check if room exists', () => {
      expect(roomManager.hasRoom('non-existent')).toBe(false);
      
      roomManager.createRoom('test-room');
      expect(roomManager.hasRoom('test-room')).toBe(true);
    });
  });

  describe('client management', () => {
    it('should add client to room', () => {
      roomManager.addClientToRoom('test-room', mockWs1);
      
      expect(roomManager.hasRoom('test-room')).toBe(true);
      expect(roomManager.getRoomSize('test-room')).toBe(1);
      
      const clients = roomManager.getRoomClients('test-room');
      expect(clients.has(mockWs1)).toBe(true);
    });

    it('should add multiple clients to room', () => {
      roomManager.addClientToRoom('test-room', mockWs1);
      roomManager.addClientToRoom('test-room', mockWs2);
      
      expect(roomManager.getRoomSize('test-room')).toBe(2);
    });

    it('should remove client from room', () => {
      roomManager.addClientToRoom('test-room', mockWs1);
      roomManager.addClientToRoom('test-room', mockWs2);
      
      const roomDeleted = roomManager.removeClientFromRoom('test-room', mockWs1);
      
      expect(roomDeleted).toBe(false); // Room still exists
      expect(roomManager.getRoomSize('test-room')).toBe(1);
    });

    it('should delete empty room when last client removed', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      roomManager.addClientToRoom('test-room', mockWs1);
      const roomDeleted = roomManager.removeClientFromRoom('test-room', mockWs1);
      
      expect(roomDeleted).toBe(true); // Room was deleted
      expect(roomManager.hasRoom('test-room')).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('🗑️  Removed empty room: test-room');
      
      consoleSpy.mockRestore();
    });

    it('should get room users', () => {
      roomManager.addClientToRoom('test-room', mockWs1);
      roomManager.addClientToRoom('test-room', mockWs2);
      
      const users = roomManager.getRoomUsers('test-room');
      
      expect(users).toHaveLength(2);
      expect(users[0]).toEqual({
        userId: 'user1',
        email: 'user1@example.com',
        joinedAt: mockWs1.joinedAt,
        docName: 'test-room'
      });
    });

    it('should return empty array for non-existent room', () => {
      const users = roomManager.getRoomUsers('non-existent');
      expect(users).toEqual([]);
    });

    it('should filter out closed connections from room users', () => {
      mockWs2.readyState = 3; // WebSocket.CLOSED
      
      roomManager.addClientToRoom('test-room', mockWs1);
      roomManager.addClientToRoom('test-room', mockWs2);
      
      const users = roomManager.getRoomUsers('test-room');
      expect(users).toHaveLength(1);
      expect(users[0].userId).toBe('user1');
    });
  });

  describe('broadcasting', () => {
    beforeEach(() => {
      roomManager.addClientToRoom('test-room', mockWs1);
      roomManager.addClientToRoom('test-room', mockWs2);
    });

    it('should broadcast message to all clients except sender', () => {
      const message = { type: 'test-message', content: 'hello' };
      
      roomManager.broadcastToRoom('test-room', message, mockWs1);
      
      expect(mockWs1.send).not.toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should broadcast to all clients if no excludeWs provided', () => {
      const message = { type: 'test-message', content: 'hello' };
      
      roomManager.broadcastToRoom('test-room', message);
      
      expect(mockWs1.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should log collaboration events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const message = { 
        type: 'file-ready-for-collaboration',
        file: { path: 'test.js' },
        timestamp: new Date().toISOString()
      };
      
      roomManager.broadcastToRoom('test-room', message);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '📢 [Y-WEBSOCKET] Broadcasting collaboration event:',
        expect.objectContaining({
          room: 'test-room',
          messageType: 'file-ready-for-collaboration',
          clientCount: 2,
          hasFile: true,
          filePath: 'test.js'
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should send message to specific user', () => {
      const message = { type: 'private-message', content: 'hello user2' };
      
      roomManager.sendToUser('test-room', 'user2', message);
      
      expect(mockWs1.send).not.toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should handle send errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockWs2.send.mockImplementation(() => {
        throw new Error('Send failed');
      });
      
      const message = { type: 'test-message', content: 'hello' };
      roomManager.broadcastToRoom('test-room', message);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending message to client:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Y.js message broadcasting', () => {
    beforeEach(() => {
      roomManager.addClientToRoom('test-room', mockWs1);
      roomManager.addClientToRoom('test-room', mockWs2);
      mockWs1.docName = 'test-room';
    });

    it('should broadcast Y.js message and process update if enabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockProcessUpdate = jest.fn();
      const yjsMessage = new Uint8Array([1, 2, 3]);
      
      roomManager.broadcastYjsMessage(mockWs1, yjsMessage, true, mockProcessUpdate);
      
      expect(mockProcessUpdate).toHaveBeenCalledWith('test-room', yjsMessage);
      expect(mockWs2.send).toHaveBeenCalledWith(yjsMessage);
      expect(consoleSpy).toHaveBeenCalledWith('📡 Broadcasting Y.js message in room "test-room" to 1 other clients');
      
      consoleSpy.mockRestore();
    });

    it('should broadcast Y.js message without processing if disabled', () => {
      const mockProcessUpdate = jest.fn();
      const yjsMessage = new Uint8Array([1, 2, 3]);
      
      roomManager.broadcastYjsMessage(mockWs1, yjsMessage, false, mockProcessUpdate);
      
      expect(mockProcessUpdate).not.toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalledWith(yjsMessage);
    });

    it('should handle missing room name', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockWs1.docName = null;
      
      roomManager.broadcastYjsMessage(mockWs1, new Uint8Array([1, 2, 3]), true, jest.fn());
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ No room name for WebSocket, cannot broadcast');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('heartbeat', () => {
    it('should start heartbeat with WebSocket server', () => {
      jest.useFakeTimers();
      const mockWss = {
        clients: new Set([mockWs1, mockWs2])
      };
      
      mockWs1.isAlive = false;
      mockWs1.terminate = jest.fn();
      mockWs1.ping = jest.fn();
      
      mockWs2.isAlive = true;
      mockWs2.ping = jest.fn();
      
      roomManager.startHeartbeat(mockWss);
      
      jest.advanceTimersByTime(30000);
      
      expect(mockWs1.terminate).toHaveBeenCalled();
      expect(mockWs2.ping).toHaveBeenCalled();
      expect(mockWs2.isAlive).toBe(false);
      
      jest.useRealTimers();
    });

    it('should stop heartbeat', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.useFakeTimers();
      
      roomManager.startHeartbeat({ clients: new Set() });
      roomManager.stopHeartbeat();
      
      expect(consoleSpy).toHaveBeenCalledWith('💔 Heartbeat stopped');
      
      jest.useRealTimers();
      consoleSpy.mockRestore();
    });
  });

  describe('statistics', () => {
    it('should return room statistics', () => {
      roomManager.addClientToRoom('room1', mockWs1);
      roomManager.addClientToRoom('room2', mockWs2);
      roomManager.addClientToRoom('room2', {});
      
      const stats = roomManager.getRoomStats();
      
      expect(stats).toEqual({
        totalRooms: 2,
        rooms: [
          { name: 'room1', clientCount: 1 },
          { name: 'room2', clientCount: 2 }
        ]
      });
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.useFakeTimers();
      
      roomManager.addClientToRoom('test-room', mockWs1);
      roomManager.startHeartbeat({ clients: new Set() });
      
      roomManager.cleanup();
      
      expect(roomManager.rooms.size).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('🧹 Room Manager cleaned up');
      
      jest.useRealTimers();
      consoleSpy.mockRestore();
    });
  });
});
