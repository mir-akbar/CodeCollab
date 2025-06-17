/**
 * Y-WebSocket Document Synchronization Service
 * Handles Y.js document synchronization between WebSocket rooms and MongoDB files
 */

class YjsDocumentSync {
  constructor(fileStorageCore, yjsServer = null) {
    this.fileStorageCore = fileStorageCore;
    this.yjsServer = yjsServer;
    this.docs = new Map(); // Store Y.js documents to prevent duplication
    this.initializationAttempts = new Map(); // Track initialization attempts to prevent duplication
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
   * Enhanced for pure Y-WebSocket collaboration with room setup and production-safe deduplication
   */
  async getDocumentFromFile(sessionId, filePath) {
    if (!this.yjsServer) {
      throw new Error('Y-WebSocket server required for document retrieval');
    }

    try {
      console.log(`📥 Y-WebSocket: Retrieving document from file ${filePath} in session ${sessionId}`);
      
      const roomId = `${sessionId}-${filePath}`;
      
      // PRODUCTION FIX: Check if initialization is already in progress
      if (this.initializationAttempts.has(roomId)) {
        const attempt = this.initializationAttempts.get(roomId);
        if (Date.now() - attempt.startTime < 10000) { // 10 second timeout
          console.log(`🚫 CONCURRENT INITIALIZATION BLOCKED: Room ${roomId} is already being initialized`);
          // Wait a bit and try to get the document again
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (this.docs.has(roomId)) {
            const existingDoc = this.docs.get(roomId);
            const Y = require('yjs');
            return Y.encodeStateAsUpdate(existingDoc);
          }
        }
      }
      
      // Mark this room as being initialized
      this.initializationAttempts.set(roomId, { startTime: Date.now() });
      
      // PRODUCTION FIX: Check Y.js WebSocket server for existing documents first
      // This prevents duplication when Railway restarts connections
      if (this.yjsServer.docs && this.yjsServer.docs.has(roomId)) {
        const existingDoc = this.yjsServer.docs.get(roomId);
        const existingContent = existingDoc.getText('monaco').toString();
        
        if (existingContent.length > 0) {
          console.log(`♻️  Y-WebSocket: Found existing document in server (${existingContent.length} chars) for room ${roomId}`);
          console.log(`🔍 DUPLICATION CHECK: Using cached document to prevent re-initialization`);
          // Also store in our local docs for consistency
          this.docs.set(roomId, existingDoc);
          // Clear initialization attempt
          this.initializationAttempts.delete(roomId);
          const Y = require('yjs');
          return Y.encodeStateAsUpdate(existingDoc);
        }
      }
      
      // Check our local document cache
      if (this.docs.has(roomId)) {
        const existingDoc = this.docs.get(roomId);
        const existingContent = existingDoc.getText('monaco').toString();
        
        if (existingContent.length > 0) {
          console.log(`♻️  Y-WebSocket: Reusing local document content (${existingContent.length} chars) for room ${roomId}`);
          console.log(`🔍 DUPLICATION CHECK: Local cache hit, preventing MongoDB re-read`);
          // Also store in server docs for other connections
          if (this.yjsServer.docs) {
            this.yjsServer.docs.set(roomId, existingDoc);
          }
          const Y = require('yjs');
          return Y.encodeStateAsUpdate(existingDoc);
        }
      }
      
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

      // Create Y.js document with the content (only once per room)
      const Y = require('yjs');
      const doc = new Y.Doc();
      const ytext = doc.getText('monaco');
      
      // PRODUCTION SAFETY: Double-check if document was created by another process while we were reading file
      if (this.docs.has(roomId)) {
        const existingDoc = this.docs.get(roomId);
        const existingContent = existingDoc.getText('monaco').toString();
        if (existingContent.length > 0) {
          console.log(`🚫 RACE CONDITION PREVENTED: Another process created document for ${roomId} while reading file`);
          return Y.encodeStateAsUpdate(existingDoc);
        }
      }
      
      // Initialize content only if we have content and this is the first time
      if (content.length > 0) {
        ytext.insert(0, content);
        console.log(`📝 Y-WebSocket: Initialized NEW document with ${content.length} characters for ${roomId}`);
        console.log(`🔍 DUPLICATION CHECK: This is the FIRST initialization for this room`);
      } else {
        console.log(`📝 Y-WebSocket: Created empty document for ${roomId} (file was empty or not found)`);
      }
      
      // Store the document in BOTH locations to ensure persistence across connections
      this.docs.set(roomId, doc);
      if (this.yjsServer.docs) {
        this.yjsServer.docs.set(roomId, doc);
        console.log(`🔄 Y-WebSocket: Document stored in both local and server caches for ${roomId}`);
      }
      
      // Ensure Y-WebSocket room exists for this file
      if (!this.yjsServer.hasRoom(roomId)) {
        this.yjsServer.createRoom(roomId);
        console.log(`🏠 Y-WebSocket: Created room ${roomId} for file collaboration`);
      }
      
      // Notify Y-WebSocket room about document retrieval (only for new documents)
      this.yjsServer.broadcastToRoom(roomId, {
        type: 'document-initialized',
        sessionId,
        filePath,
        contentLength: content.length,
        timestamp: new Date().toISOString(),
        isFirstInitialization: true
      });
      
      // Return the document state as a Uint8Array
      const documentState = Y.encodeStateAsUpdate(doc);
      console.log(`🔄 Y-WebSocket: Document state prepared for room ${roomId} (production-safe initialization)`);
      
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
