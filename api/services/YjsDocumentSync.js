/**
 * Y-WebSocket Document Synchronization Service
 * Handles Y.js document synchronization between WebSocket rooms and MongoDB files
 */

class YjsDocumentSync {
  constructor(fileStorageCore, yjsServer = null) {
    this.fileStorageCore = fileStorageCore;
    this.yjsServer = yjsServer;
  }

  /**
   * Set Y-WebSocket server
   */
  setYjsServer(yjsServer) {
    this.yjsServer = yjsServer;
    console.log('🔌 Y-WebSocket server connected to document sync service');
  }

  /**
   * Y-WebSocket Document Synchronization - sync Y.js document state to file
   * Enhanced for pure Y-WebSocket collaboration with room notifications
   */
  async syncDocumentToFile(sessionId, filePath, yjsDocumentState, cognitoId = null) {
    if (!this.yjsServer) {
      throw new Error('Y-WebSocket server required for document synchronization');
    }

    try {
      console.log(`🔄 Y-WebSocket: Syncing document to file ${filePath} in session ${sessionId}`);
      
      // Convert Y.js document state to text content
      const Y = require('yjs');
      const doc = new Y.Doc();
      Y.applyUpdate(doc, new Uint8Array(yjsDocumentState));
      const ytext = doc.getText('monaco');
      const content = ytext.toString();
      
      // Update the file content in MongoDB
      const updatedFile = await this.fileStorageCore.updateFileContent(sessionId, filePath, content, cognitoId);
      
      // Notify Y-WebSocket room about document synchronization
      const roomId = `${sessionId}-${filePath}`;
      if (this.yjsServer.hasRoom(roomId)) {
        this.yjsServer.broadcastToRoom(roomId, {
          type: 'file-synced',
          sessionId,
          filePath,
          syncedBy: cognitoId || 'system',
          timestamp: new Date().toISOString()
        });
        console.log(`📡 Y-WebSocket: Notified room ${roomId} about file synchronization`);
      }
      
      return updatedFile;
    } catch (error) {
      console.error('❌ Y-WebSocket: Error syncing document to file:', error);
      throw error;
    }
  }

  /**
   * Y-WebSocket Document Synchronization - get Y.js document state from file
   * Enhanced for pure Y-WebSocket collaboration with room setup
   */
  async getDocumentFromFile(sessionId, filePath) {
    if (!this.yjsServer) {
      throw new Error('Y-WebSocket server required for document retrieval');
    }

    try {
      console.log(`📥 Y-WebSocket: Retrieving document from file ${filePath} in session ${sessionId}`);
      
      let content = '';
      
      try {
        // Try to get the file content from MongoDB
        const file = await this.fileStorageCore.getFile(sessionId, filePath);
        content = file.content.toString('utf8');
        console.log(`📄 Y-WebSocket: Retrieved file content (${content.length} characters)`);
      } catch (error) {
        // If file doesn't exist, start with empty content
        if (error.message === 'File not found') {
          content = '';
          console.log(`📝 Y-WebSocket: File not found, starting with empty content`);
        } else {
          throw error;
        }
      }

      // Create Y.js document with the content
      const Y = require('yjs');
      const doc = new Y.Doc();
      const ytext = doc.getText('monaco');
      
      if (content.length > 0) {
        ytext.insert(0, content);
      }
      
      // Ensure Y-WebSocket room exists for this file
      const roomId = `${sessionId}-${filePath}`;
      if (!this.yjsServer.hasRoom(roomId)) {
        this.yjsServer.createRoom(roomId);
        console.log(`🏠 Y-WebSocket: Created room ${roomId} for file collaboration`);
      }
      
      // Notify Y-WebSocket room about document retrieval
      this.yjsServer.broadcastToRoom(roomId, {
        type: 'document-loaded',
        sessionId,
        filePath,
        contentLength: content.length,
        timestamp: new Date().toISOString()
      });
      
      // Return the document state as a Uint8Array
      const documentState = Y.encodeStateAsUpdate(doc);
      console.log(`🔄 Y-WebSocket: Document state prepared for room ${roomId}`);
      
      return documentState;
    } catch (error) {
      console.error('❌ Y-WebSocket: Error getting document from file:', error);
      throw error;
    }
  }

  /**
   * Create collaboration room for a file
   */
  createCollaborationRoom(sessionId, filePath) {
    if (!this.yjsServer) {
      throw new Error('Y-WebSocket server required for room creation');
    }

    const roomId = `${sessionId}-${filePath}`;
    if (!this.yjsServer.hasRoom(roomId)) {
      this.yjsServer.createRoom(roomId);
      console.log(`🏠 Y-WebSocket: Created collaboration room ${roomId}`);
      return roomId;
    }
    return roomId;
  }

  /**
   * Notify collaboration room about file events
   */
  notifyCollaborationRoom(sessionId, filePath, eventData) {
    if (!this.yjsServer) {
      console.warn('Y-WebSocket server not available for room notification');
      return;
    }

    const roomId = `${sessionId}-${filePath}`;
    console.log(`📢 [YJS SYNC] Broadcasting to collaboration room:`, {
      roomId,
      eventType: eventData.type,
      sessionId,
      filePath,
      hasFile: !!eventData.file,
      timestamp: new Date().toISOString()
    });

    this.yjsServer.broadcastToRoom(roomId, {
      ...eventData,
      sessionId,
      filePath,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ [YJS SYNC] Event broadcasted to room: ${roomId}`);
  }
}

module.exports = YjsDocumentSync;
