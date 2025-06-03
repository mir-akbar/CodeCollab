// Backend: YJS Document Manager (yjsDocumentManager.js)
const Y = require('yjs');
const fs = require('fs').promises;
const path = require('path');

class YjsDocumentManager {
  constructor() {
    // Store active YJS documents in memory
    this.documents = new Map(); // roomName -> Y.Doc
    this.documentTimestamps = new Map(); // roomName -> timestamp
    this.fileContentCache = new Map(); // filePath -> content
    
    // Clean up old documents every 30 minutes
    setInterval(() => this.cleanupOldDocuments(), 30 * 60 * 1000);
  }

  // Get or create a YJS document for a specific file
  async getOrCreateDocument(sessionId, fileName, filePath) {
    const roomName = `${sessionId}-${fileName}`;
    
    // Check if document already exists in memory
    if (this.documents.has(roomName)) {
      console.log(`📄 Retrieved existing YJS document for: ${roomName}`);
      this.updateTimestamp(roomName);
      return this.documents.get(roomName);
    }

    // Create new YJS document
    const doc = new Y.Doc();
    const ytext = doc.getText('monaco');
    
    try {
      // Try to load file content and initialize the document
      let fileContent = await this.getFileContent(filePath);
      
      if (fileContent && fileContent.trim().length > 0) {
        // Initialize YJS document with file content
        ytext.insert(0, fileContent);
        console.log(`📝 Initialized YJS document with file content for: ${roomName}`);
      } else {
        console.log(`📄 Created empty YJS document for: ${roomName}`);
      }
      
      // Store the document
      this.documents.set(roomName, doc);
      this.updateTimestamp(roomName);
      
      return doc;
      
    } catch (error) {
      console.error(`Error initializing YJS document for ${roomName}:`, error);
      // Still return the document, even if file reading failed
      this.documents.set(roomName, doc);
      this.updateTimestamp(roomName);
      return doc;
    }
  }

  // Get file content with caching
  async getFileContent(filePath) {
    if (!filePath) return '';
    
    // Check cache first
    if (this.fileContentCache.has(filePath)) {
      const cached = this.fileContentCache.get(filePath);
      // Cache for 5 minutes
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.content;
      }
    }

    try {
      // Read file from disk
      const fullPath = path.resolve(filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      // Cache the content
      this.fileContentCache.set(filePath, {
        content,
        timestamp: Date.now()
      });
      
      return content;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return '';
    }
  }

  // Update document timestamp for cleanup
  updateTimestamp(roomName) {
    this.documentTimestamps.set(roomName, Date.now());
  }

  // Clean up old documents (older than 2 hours)
  cleanupOldDocuments() {
    const cutoff = Date.now() - (2 * 60 * 60 * 1000); // 2 hours
    
    for (const [roomName, timestamp] of this.documentTimestamps.entries()) {
      if (timestamp < cutoff) {
        // Clean up document
        const doc = this.documents.get(roomName);
        if (doc) {
          try {
            doc.destroy();
          } catch (error) {
            console.warn(`Error destroying document ${roomName}:`, error);
          }
        }
        
        this.documents.delete(roomName);
        this.documentTimestamps.delete(roomName);
        console.log(`🧹 Cleaned up old YJS document: ${roomName}`);
      }
    }
    
    // Also clean up old file cache entries
    for (const [filePath, cached] of this.fileContentCache.entries()) {
      if (cached.timestamp < cutoff) {
        this.fileContentCache.delete(filePath);
      }
    }
  }

  // Get document state for sync
  getDocumentState(roomName) {
    const doc = this.documents.get(roomName);
    if (!doc) return null;
    
    return Y.encodeStateAsUpdate(doc);
  }

  // Apply update to document
  applyUpdate(roomName, update) {
    const doc = this.documents.get(roomName);
    if (!doc) return false;
    
    try {
      Y.applyUpdate(doc, new Uint8Array(update));
      this.updateTimestamp(roomName);
      return true;
    } catch (error) {
      console.error(`Error applying update to ${roomName}:`, error);
      return false;
    }
  }

  // Remove document (when no users are connected)
  removeDocument(roomName) {
    const doc = this.documents.get(roomName);
    if (doc) {
      try {
        doc.destroy();
      } catch (error) {
        console.warn(`Error destroying document ${roomName}:`, error);
      }
    }
    
    this.documents.delete(roomName);
    this.documentTimestamps.delete(roomName);
    console.log(`🗑️ Removed YJS document: ${roomName}`);
  }
}

// Singleton instance
const yjsManager = new YjsDocumentManager();
module.exports = yjsManager;

// ===============================================
// Backend: Socket.IO Handler (socket-handlers.js)
// ===============================================

const yjsManager = require('./yjsDocumentManager');
const { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } = require('y-protocols/awareness');

// Track rooms and their connected users
const rooms = new Map(); // roomName -> Set of socket IDs
const roomAwareness = new Map(); // roomName -> Awareness instance

function handleYjsEvents(io, socket) {
  // Handle room joining
  socket.on('yjs-join-room', async ({ room }) => {
    try {
      console.log(`🔌 Socket ${socket.id} joining YJS room: ${room}`);
      
      // Parse room name to get session and file info
      const [sessionId, ...fileNameParts] = room.split('-');
      const fileName = fileNameParts.join('-');
      
      // Get file path from your existing file management system
      const filePath = await getFilePathForSession(sessionId, fileName);
      
      // Get or create YJS document with file content
      const doc = await yjsManager.getOrCreateDocument(sessionId, fileName, filePath);
      
      // Join socket room
      socket.join(room);
      
      // Track room membership
      if (!rooms.has(room)) {
        rooms.set(room, new Set());
        // Create awareness for this room
        roomAwareness.set(room, new Awareness(doc));
      }
      rooms.get(room).add(socket.id);
      
      console.log(`✅ Socket ${socket.id} joined room ${room}, total users: ${rooms.get(room).size}`);
      
    } catch (error) {
      console.error(`Error joining YJS room ${room}:`, error);
      socket.emit('yjs-error', { message: 'Failed to join room' });
    }
  });

  // Handle sync request
  socket.on('yjs-request-sync', ({ room }) => {
    try {
      const documentState = yjsManager.getDocumentState(room);
      
      socket.emit('yjs-sync-response', {
        content: documentState ? Array.from(documentState) : null
      });
      
      console.log(`📤 Sent sync response for room: ${room}`);
      
    } catch (error) {
      console.error(`Error handling sync request for ${room}:`, error);
      socket.emit('yjs-sync-response', { content: null });
    }
  });

  // Handle YJS updates
  socket.on('yjs-update', ({ room, update, origin }) => {
    try {
      // Apply update to server-side document
      const success = yjsManager.applyUpdate(room, update);
      
      if (success) {
        // Broadcast to other clients in the room
        socket.to(room).emit('yjs-update', { update, origin });
        console.log(`🔄 Broadcasted YJS update for room: ${room}`);
      }
      
    } catch (error) {
      console.error(`Error handling YJS update for ${room}:`, error);
    }
  });

  // Handle awareness updates
  socket.on('yjs-awareness-update', ({ room, update, origin }) => {
    try {
      const awareness = roomAwareness.get(room);
      if (awareness) {
        // Apply awareness update
        applyAwarenessUpdate(awareness, new Uint8Array(update), origin);
        
        // Broadcast to other clients
        socket.to(room).emit('yjs-awareness-update', { update, origin });
        console.log(`👥 Broadcasted awareness update for room: ${room}`);
      }
      
    } catch (error) {
      console.error(`Error handling awareness update for ${room}:`, error);
    }
  });

  // Handle room leaving
  socket.on('yjs-leave-room', ({ room }) => {
    handleLeaveRoom(socket, room);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Socket ${socket.id} disconnected`);
    
    // Remove from all rooms
    for (const [room, sockets] of rooms.entries()) {
      if (sockets.has(socket.id)) {
        handleLeaveRoom(socket, room);
      }
    }
  });
}

function handleLeaveRoom(socket, room) {
  try {
    socket.leave(room);
    
    if (rooms.has(room)) {
      rooms.get(room).delete(socket.id);
      
      // If no more users in room, clean up
      if (rooms.get(room).size === 0) {
        console.log(`🧹 No more users in room ${room}, cleaning up...`);
        
        rooms.delete(room);
        
        // Clean up awareness
        if (roomAwareness.has(room)) {
          try {
            roomAwareness.get(room).destroy();
          } catch (error) {
            console.warn(`Error destroying awareness for ${room}:`, error);
          }
          roomAwareness.delete(room);
        }
        
        // Optionally remove the YJS document (or keep it cached)
        // yjsManager.removeDocument(room);
      }
      
      console.log(`✅ Socket ${socket.id} left room ${room}`);
    }
    
  } catch (error) {
    console.error(`Error leaving room ${room}:`, error);
  }
}

// Helper function to get file path - adapt this to your existing system
async function getFilePathForSession(sessionId, fileName) {
  // This should integrate with your existing file management system
  // For example, if files are stored in session-specific directories:
  return path.join('./uploads', sessionId, fileName);
}

module.exports = { handleYjsEvents };

// ===============================================
// Backend: Main Server Integration (server.js)
// ===============================================

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { handleYjsEvents } = require('./socket-handlers');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Handle socket connections
io.on('connection', (socket) => {
  console.log(`🔌 New socket connection: ${socket.id}`);
  
  // Set up YJS event handlers
  handleYjsEvents(io, socket);
  
  // Your existing socket handlers...
});

server.listen(3000, () => {
  console.log('🚀 Server running on port 3000');
});