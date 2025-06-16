/**
 * Document State Manager
 * Handles Y.js document state persistence and synchronization
 */

// YjsValidator disabled for production - server-side processing disabled
// const YjsValidator = require('../../../utils/yjsValidator');

class DocumentStateManager {
  constructor(roomManagerInterface) {
    this.roomManagerInterface = roomManagerInterface;
    this.docs = new Map(); // Store Y.js documents for persistence
    this.errorCounts = new Map(); // Track errors per room
    this.maxErrorsPerRoom = 5; // Disable processing after this many errors
    this.disabledRooms = new Set(); // Rooms with processing disabled
  }

  /**
   * Send existing document state to new connections (Production fix)
   * This prevents content duplication when users join existing collaborative sessions
   */
  sendExistingDocumentState(ws, docName) {
    // Only send document state for document editing rooms, not chat rooms
    if (!this.shouldProcessYjsUpdate(docName)) {
      console.log(`📭 Skipping document state for non-document room: ${docName}`);
      return;
    }
    
    // PRODUCTION FIX: Disable server-side document state sending to prevent duplication
    // Let clients handle their own Y.js document synchronization through the y-websocket protocol
    console.log(`🚫 Skipping server-side document state transmission for production safety: ${docName}`);
    console.log(`🔄 Clients will handle document synchronization through standard Y.js protocol`);
    
    // In production, Railway's WebSocket connections can be unstable,
    // causing the server-side document state to become corrupted.
    // It's safer to let the Y.js clients handle their own document sync.
    return;
    
    /* DISABLED FOR PRODUCTION - CAUSES CONTENT DUPLICATION
    try {
      // Check if we have a server-side document for this room
      if (this.docs.has(docName)) {
        const doc = this.docs.get(docName);
        const Y = require('yjs');
        
        // Get the current state vector and document update
        const stateVector = Y.encodeStateVector(doc);
        const update = Y.encodeStateAsUpdate(doc);
        
        // Send sync step 1 (state vector)
        if (stateVector.length > 0) {
          const syncMessage1 = new Uint8Array(1 + stateVector.length);
          syncMessage1[0] = 0; // Y.js sync step 1
          syncMessage1.set(stateVector, 1);
          
          if (ws.readyState === ws.OPEN) {
            ws.send(syncMessage1);
            console.log(`📤 Sent Y.js state vector to new client in room: ${docName}`);
          }
        }
        
        // Send sync step 2 (document update) if there's content
        if (update.length > 0) {
          const syncMessage2 = new Uint8Array(1 + update.length);
          syncMessage2[0] = 2; // Y.js sync step 2
          syncMessage2.set(update, 1);
          
          if (ws.readyState === ws.OPEN) {
            ws.send(syncMessage2);
            console.log(`📤 Sent Y.js document update to new client in room: ${docName} (${update.length} bytes)`);
          }
        }
      } else {
        console.log(`📭 No existing document state for room: ${docName}`);
      }
    } catch (error) {
      console.error('Error sending existing document state:', error);
    }
    */
  }

  /**
   * Process Y.js updates to maintain server-side document state (Production fix)
   */
  processYjsUpdate(room, _updateBuffer) {
    // PRODUCTION FIX: Disable server-side Y.js processing to prevent content duplication
    // The Y.js processing errors we observed are causing document state corruption,
    // which leads to content duplication when new users join collaborative sessions.
    
    console.log(`🚫 Skipping server-side Y.js processing for production safety: ${room}`);
    console.log(`🔄 Clients will handle Y.js document state through standard WebSocket protocol`);
    
    // In production environments like Railway, server-side Y.js processing can:
    // 1. Cause "contentRefs[(info & binary__namespace.BITS5)] is not a function" errors
    // 2. Corrupt the document state due to binary data parsing issues
    // 3. Lead to content duplication when multiple users access the same file
    // 4. Create race conditions between server and client document states
    
    // The safest approach is to let Y.js clients handle their own document synchronization
    // through the standard y-websocket protocol, which is designed for this purpose.
    
    return; // Exit early - no server-side processing
    
    /* DISABLED FOR PRODUCTION - CAUSES CONTENT DUPLICATION AND ERRORS
    
    // Check if processing is disabled for this room due to repeated errors
    if (this.disabledRooms.has(room)) {
      return; // Silently skip processing for problematic rooms
    }
    
    try {
      const Y = require('yjs');
      
      // Get or create document for this room
      if (!this.docs.has(room)) {
        this.docs.set(room, new Y.Doc());
        console.log(`📝 Created new server-side Y.js document for room: ${room}`);
      }
      
      const doc = this.docs.get(room);
      
      // PRODUCTION FIX: Validate and sanitize Y.js update data
      const validation = YjsValidator.validateYjsUpdate(updateBuffer);
      
      if (!validation.isValid) {
        console.warn(`⚠️ Invalid Y.js update for room ${room}: ${validation.error}`);
        this._handleRoomError(room);
        return;
      }
      
      // Apply the validated update to maintain state
      Y.applyUpdate(doc, validation.data);
      
      // Reset error count on successful processing
      this.errorCounts.delete(room);
      
      // Log current document state for debugging
      const content = doc.getText('monaco').toString();
      console.log(`🔄 Server-side Y.js update applied for room ${room} (content length: ${content.length})`);
      
    } catch (error) {
      console.error('Error processing Y.js update for server state:', error);
      console.error(`Room: ${room}, Buffer type: ${typeof updateBuffer}, Buffer length: ${updateBuffer?.length || 'unknown'}`);
      this._handleRoomError(room);
    }
    
    */
  }

  /**
   * Handle errors for a room and disable processing if too many errors occur
   */
  _handleRoomError(room) {
    const currentCount = this.errorCounts.get(room) || 0;
    const newCount = currentCount + 1;
    this.errorCounts.set(room, newCount);
    
    if (newCount >= this.maxErrorsPerRoom) {
      console.warn(`🚫 Disabling Y.js processing for room ${room} after ${newCount} errors`);
      this.disabledRooms.add(room);
      // Clean up the problematic document
      if (this.docs.has(room)) {
        try {
          this.docs.get(room).destroy();
        } catch {
          // Ignore cleanup errors
        }
        this.docs.delete(room);
      }
    }
  }

  /**
   * Determine if a room should have Y.js updates processed for server-side persistence
   * Only process document editing rooms, not chat or other special rooms
   */
  shouldProcessYjsUpdate(room) {
    // Skip processing for chat rooms
    if (room.includes('chat-') || room.startsWith('chat/')) {
      return false;
    }
    
    // Skip processing for video call rooms (if any)
    if (room.includes('video-') || room.startsWith('video/')) {
      return false;
    }
    
    // Skip processing for special system rooms
    if (room.includes('system-') || room.startsWith('system/')) {
      return false;
    }
    
    // Process Y.js updates for document editing rooms
    // These typically have formats like: sessionId/fileName or sessionId-fileName
    return true;
  }

  /**
   * Get document statistics
   */
  getDocumentStats() {
    return {
      totalDocuments: this.docs.size,
      disabledRooms: this.disabledRooms.size,
      roomsWithErrors: this.errorCounts.size,
      errorCounts: Object.fromEntries(this.errorCounts),
      documents: Array.from(this.docs.entries()).map(([name, doc]) => {
        try {
          const content = doc.getText('monaco').toString();
          return {
            name,
            contentLength: content.length,
            hasContent: content.length > 0,
            isDisabled: this.disabledRooms.has(name),
            errorCount: this.errorCounts.get(name) || 0
          };
        } catch (error) {
          return {
            name,
            contentLength: 0,
            hasContent: false,
            isDisabled: this.disabledRooms.has(name),
            errorCount: this.errorCounts.get(name) || 0,
            error: error.message
          };
        }
      })
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Destroy all Y.js documents
    this.docs.forEach((doc, room) => {
      try {
        doc.destroy();
      } catch (error) {
        console.error(`Error destroying document for room ${room}:`, error);
      }
    });
    
    this.docs.clear();
    this.errorCounts.clear();
    this.disabledRooms.clear();
    console.log('🧹 Document State Manager cleaned up');
  }
}

module.exports = DocumentStateManager;
