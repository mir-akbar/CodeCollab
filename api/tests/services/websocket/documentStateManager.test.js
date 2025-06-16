/**
 * Document State Manager Tests
 * Tests for Y.js document persistence functionality
 */

const DocumentStateManager = require('../DocumentStateManager');

// Mock Y.js
const mockYjs = {
  Doc: jest.fn(() => ({
    getText: jest.fn(() => ({
      toString: jest.fn(() => 'mock document content')
    })),
    destroy: jest.fn()
  })),
  encodeStateVector: jest.fn(() => new Uint8Array([1, 2, 3])),
  encodeStateAsUpdate: jest.fn(() => new Uint8Array([4, 5, 6])),
  applyUpdate: jest.fn()
};

jest.mock('yjs', () => mockYjs);

describe('DocumentStateManager', () => {
  let documentStateManager;
  let mockRoomManagerInterface;
  let mockWs;

  beforeEach(() => {
    mockRoomManagerInterface = {
      broadcastToRoom: jest.fn()
    };

    documentStateManager = new DocumentStateManager(mockRoomManagerInterface);

    mockWs = {
      readyState: 1, // WebSocket.OPEN
      OPEN: 1,
      send: jest.fn()
    };

    jest.clearAllMocks();
  });

  describe('shouldProcessYjsUpdate', () => {
    it('should return false for chat rooms', () => {
      expect(documentStateManager.shouldProcessYjsUpdate('chat-room1')).toBe(false);
      expect(documentStateManager.shouldProcessYjsUpdate('chat/room1')).toBe(false);
    });

    it('should return false for video rooms', () => {
      expect(documentStateManager.shouldProcessYjsUpdate('video-call1')).toBe(false);
      expect(documentStateManager.shouldProcessYjsUpdate('video/call1')).toBe(false);
    });

    it('should return false for system rooms', () => {
      expect(documentStateManager.shouldProcessYjsUpdate('system-config')).toBe(false);
      expect(documentStateManager.shouldProcessYjsUpdate('system/config')).toBe(false);
    });

    it('should return true for document editing rooms', () => {
      expect(documentStateManager.shouldProcessYjsUpdate('session123/file.js')).toBe(true);
      expect(documentStateManager.shouldProcessYjsUpdate('session123-file.js')).toBe(true);
      expect(documentStateManager.shouldProcessYjsUpdate('room1')).toBe(true);
    });
  });

  describe('sendExistingDocumentState', () => {
    it('should skip non-document rooms', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      documentStateManager.sendExistingDocumentState(mockWs, 'chat-room1');

      expect(consoleSpy).toHaveBeenCalledWith('📭 Skipping document state for non-document room: chat-room1');
      expect(mockWs.send).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should send existing document state if document exists', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockDoc = new mockYjs.Doc();
      documentStateManager.docs.set('session123/file.js', mockDoc);

      documentStateManager.sendExistingDocumentState(mockWs, 'session123/file.js');

      expect(mockYjs.encodeStateVector).toHaveBeenCalledWith(mockDoc);
      expect(mockYjs.encodeStateAsUpdate).toHaveBeenCalledWith(mockDoc);
      expect(mockWs.send).toHaveBeenCalledTimes(2); // State vector + document update
      
      consoleSpy.mockRestore();
    });

    it('should log when no existing document state', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      documentStateManager.sendExistingDocumentState(mockWs, 'session123/file.js');

      expect(consoleSpy).toHaveBeenCalledWith('📭 No existing document state for room: session123/file.js');
      expect(mockWs.send).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockWs.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      const mockDoc = new mockYjs.Doc();
      documentStateManager.docs.set('session123/file.js', mockDoc);

      documentStateManager.sendExistingDocumentState(mockWs, 'session123/file.js');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending existing document state:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('processYjsUpdate', () => {
    it('should create new document if not exists', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const updateBuffer = new Uint8Array([1, 2, 3]);

      documentStateManager.processYjsUpdate('session123/file.js', updateBuffer);

      expect(mockYjs.Doc).toHaveBeenCalled();
      expect(documentStateManager.docs.has('session123/file.js')).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('📝 Created new server-side Y.js document for room: session123/file.js');
      
      consoleSpy.mockRestore();
    });

    it('should apply update to existing document', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockDoc = new mockYjs.Doc();
      documentStateManager.docs.set('session123/file.js', mockDoc);
      const updateBuffer = new Uint8Array([1, 2, 3]);

      documentStateManager.processYjsUpdate('session123/file.js', updateBuffer);

      expect(mockYjs.applyUpdate).toHaveBeenCalledWith(mockDoc, updateBuffer);
      expect(consoleSpy).toHaveBeenCalledWith('🔄 Server-side Y.js update applied for room session123/file.js (content length: 19)');
      
      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockYjs.applyUpdate.mockImplementation(() => {
        throw new Error('Apply update failed');
      });

      const updateBuffer = new Uint8Array([1, 2, 3]);
      documentStateManager.processYjsUpdate('session123/file.js', updateBuffer);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing Y.js update for server state:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getDocumentStats', () => {
    it('should return document statistics', () => {
      const mockDoc1 = new mockYjs.Doc();
      const mockDoc2 = new mockYjs.Doc();
      documentStateManager.docs.set('room1', mockDoc1);
      documentStateManager.docs.set('room2', mockDoc2);

      const stats = documentStateManager.getDocumentStats();

      expect(stats).toEqual({
        totalDocuments: 2,
        documents: [
          { name: 'room1', contentLength: 19, hasContent: true },
          { name: 'room2', contentLength: 19, hasContent: true }
        ]
      });
    });

    it('should handle document errors in stats', () => {
      const mockDoc = new mockYjs.Doc();
      mockDoc.getText.mockImplementation(() => {
        throw new Error('getText failed');
      });
      documentStateManager.docs.set('error-room', mockDoc);

      const stats = documentStateManager.getDocumentStats();

      expect(stats.documents[0]).toEqual({
        name: 'error-room',
        contentLength: 0,
        hasContent: false,
        error: 'getText failed'
      });
    });
  });

  describe('cleanup', () => {
    it('should destroy all documents and clear map', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockDoc1 = new mockYjs.Doc();
      const mockDoc2 = new mockYjs.Doc();
      
      documentStateManager.docs.set('room1', mockDoc1);
      documentStateManager.docs.set('room2', mockDoc2);

      documentStateManager.cleanup();

      expect(mockDoc1.destroy).toHaveBeenCalled();
      expect(mockDoc2.destroy).toHaveBeenCalled();
      expect(documentStateManager.docs.size).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('🧹 Document State Manager cleaned up');
      
      consoleSpy.mockRestore();
    });

    it('should handle document destroy errors', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockDoc = new mockYjs.Doc();
      mockDoc.destroy.mockImplementation(() => {
        throw new Error('Destroy failed');
      });
      
      documentStateManager.docs.set('error-room', mockDoc);

      documentStateManager.cleanup();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error destroying document for room error-room:', expect.any(Error));
      expect(documentStateManager.docs.size).toBe(0);
      
      consoleErrorSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});
