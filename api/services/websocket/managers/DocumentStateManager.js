/**
 * Document State Manager
 * Handles Y.js document state persistence and synchronization
 */

class DocumentStateManager {
  constructor(roomManagerInterface) {
    this.roomManagerInterface = roomManagerInterface;
    this.docs = new Map(); // Store Y.js documents for persistence
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
  }

  /**
   * Process Y.js updates to maintain server-side document state (Production fix)
   */
  processYjsUpdate(room, updateBuffer) {
    try {
      const Y = require('yjs');
      
      // Get or create document for this room
      if (!this.docs.has(room)) {
        this.docs.set(room, new Y.Doc());
        console.log(`📝 Created new server-side Y.js document for room: ${room}`);
      }
      
      const doc = this.docs.get(room);
      
      // Apply the update to maintain state
      Y.applyUpdate(doc, updateBuffer);
      
      // Log current document state for debugging
      const content = doc.getText('monaco').toString();
      console.log(`🔄 Server-side Y.js update applied for room ${room} (content length: ${content.length})`);
      
    } catch (error) {
      console.error('Error processing Y.js update for server state:', error);
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
      documents: Array.from(this.docs.entries()).map(([name, doc]) => {
        try {
          const content = doc.getText('monaco').toString();
          return {
            name,
            contentLength: content.length,
            hasContent: content.length > 0
          };
        } catch (error) {
          return {
            name,
            contentLength: 0,
            hasContent: false,
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
    console.log('🧹 Document State Manager cleaned up');
  }
}

module.exports = DocumentStateManager;
