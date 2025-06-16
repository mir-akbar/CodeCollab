/**
 * File Event Manager
 * Handles file-related event broadcasting for collaborative sessions
 * Extracted from YjsWebSocketServer for better separation of concerns
 */

class FileEventManager {
  constructor(roomManager) {
    this.roomManager = roomManager;
    this.fileEvents = new Map(); // Track recent file events per room
    this.maxEventsPerRoom = 100; // Limit event history to prevent memory issues
  }

  /**
   * Check if message type is file-related
   */
  isFileMessage(type) {
    const fileMessageTypes = [
      'file-upload-progress',
      'file-deleted',
      'file-uploaded'
    ];
    return fileMessageTypes.includes(type);
  }

  /**
   * Handle file-related messages
   */
  handleFileMessage(ws, data) {
    const { type } = data;
    
    switch (type) {
      case 'file-upload-progress':
        this.broadcastUploadProgress(ws, data);
        break;
      case 'file-deleted':
        this.broadcastFileDeleted(ws, data);
        break;
      case 'file-uploaded':
        this.broadcastFileUploaded(ws, data);
        break;
      default:
        console.warn(`⚠️ Unknown file message type: ${type}`);
    }
  }

  /**
   * Broadcast file upload progress to all users in the room
   */
  broadcastUploadProgress(ws, data) {
    const { room, sessionId, fileName, progress, totalSize, uploadedSize } = data;
    const roomName = room || sessionId;
    
    if (!roomName) {
      console.warn('⚠️ No room specified for file upload progress');
      return;
    }

    console.log(`📤 Broadcasting file upload progress in room: ${roomName} - ${fileName} (${progress || 'unknown'}%)`);
    
    const progressData = {
      type: 'file-upload-progress',
      room: roomName,
      sessionId: roomName,
      fileName,
      progress,
      totalSize,
      uploadedSize,
      user: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName || ws.userEmail?.split('@')[0] || 'Anonymous'
      },
      timestamp: new Date().toISOString()
    };

    // Store in event history
    this.storeFileEvent(roomName, progressData);
    
    // Broadcast to all users in room (including sender for progress updates)
    this.roomManager.broadcastToRoom(roomName, progressData);
    
    console.log(`✅ File upload progress broadcasted in room: ${roomName}`);
  }

  /**
   * Broadcast file deletion notification
   */
  broadcastFileDeleted(ws, data) {
    const { room, sessionId, fileName, filePath } = data;
    const roomName = room || sessionId;
    
    if (!roomName) {
      console.warn('⚠️ No room specified for file deletion');
      return;
    }

    console.log(`🗑️ Broadcasting file deletion in room: ${roomName} - ${fileName || filePath}`);
    
    const deletionData = {
      type: 'file-deleted',
      room: roomName,
      sessionId: roomName,
      fileName: fileName || filePath,
      filePath,
      user: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName || ws.userEmail?.split('@')[0] || 'Anonymous'
      },
      timestamp: new Date().toISOString()
    };

    // Store in event history
    this.storeFileEvent(roomName, deletionData);
    
    // Broadcast to all users in room except sender
    this.roomManager.broadcastToRoom(roomName, deletionData, ws);
    
    console.log(`✅ File deletion broadcasted in room: ${roomName}`);
  }

  /**
   * Broadcast file upload notification
   */
  broadcastFileUploaded(ws, data) {
    const { room, sessionId, fileName, filePath, fileSize, fileType } = data;
    const roomName = room || sessionId;
    
    if (!roomName) {
      console.warn('⚠️ No room specified for file upload');
      return;
    }

    console.log(`📁 Broadcasting file upload in room: ${roomName} - ${fileName || filePath}`);
    
    const uploadData = {
      type: 'file-uploaded',
      room: roomName,
      sessionId: roomName,
      fileName: fileName || filePath,
      filePath,
      fileSize,
      fileType,
      user: {
        userId: ws.userId,
        email: ws.userEmail,
        name: ws.userName || ws.userEmail?.split('@')[0] || 'Anonymous'
      },
      timestamp: new Date().toISOString()
    };

    // Store in event history
    this.storeFileEvent(roomName, uploadData);
    
    // Broadcast to all users in room except sender
    this.roomManager.broadcastToRoom(roomName, uploadData, ws);
    
    console.log(`✅ File upload broadcasted in room: ${roomName}`);
  }

  /**
   * Store file event in history (for recent events tracking)
   */
  storeFileEvent(roomName, eventData) {
    if (!this.fileEvents.has(roomName)) {
      this.fileEvents.set(roomName, []);
    }
    
    const events = this.fileEvents.get(roomName);
    events.push({
      type: eventData.type,
      fileName: eventData.fileName,
      user: eventData.user,
      timestamp: eventData.timestamp,
      ...(eventData.progress && { progress: eventData.progress }),
      ...(eventData.fileSize && { fileSize: eventData.fileSize }),
      ...(eventData.fileType && { fileType: eventData.fileType })
    });
    
    // Limit history size to prevent memory issues
    if (events.length > this.maxEventsPerRoom) {
      events.splice(0, events.length - this.maxEventsPerRoom);
    }
    
    console.log(`📝 Stored file event in room ${roomName} history (${events.length} events)`);
  }

  /**
   * Get recent file events for a room
   */
  getFileEvents(roomName, limit = 20) {
    if (!this.fileEvents.has(roomName)) {
      return [];
    }
    
    const events = this.fileEvents.get(roomName);
    const requestedLimit = Math.min(limit, this.maxEventsPerRoom);
    
    return events.slice(-requestedLimit);
  }

  /**
   * Send recent file events to a new user joining a room
   */
  sendFileHistoryToUser(ws, roomName) {
    const events = this.getFileEvents(roomName, 10); // Send last 10 file events
    
    if (events.length > 0) {
      console.log(`📜 Sending ${events.length} recent file events to ${ws.userEmail} in room: ${roomName}`);
      
      // Send file history as a special message type
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'file-history',
          room: roomName,
          events: events,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }

  /**
   * Handle user disconnection - clean up file event state if needed
   */
  handleUserDisconnect(ws) {
    // File events don't require special cleanup on disconnect
    // History is maintained for other users
    console.log(`👋 User ${ws.userEmail} disconnected - file event state maintained`);
  }

  /**
   * Clear file event history for a room (admin function)
   */
  clearFileHistory(roomName) {
    if (this.fileEvents.has(roomName)) {
      this.fileEvents.delete(roomName);
      console.log(`🗑️ Cleared file event history for room: ${roomName}`);
      return true;
    }
    return false;
  }

  /**
   * Get file event statistics
   */
  getFileEventStats() {
    const totalRoomsWithFileEvents = this.fileEvents.size;
    const totalEvents = Array.from(this.fileEvents.values())
      .reduce((sum, events) => sum + events.length, 0);
    
    const roomStats = Array.from(this.fileEvents.entries()).map(([roomName, events]) => {
      const eventsByType = events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {});
      
      return {
        roomName,
        totalEvents: events.length,
        eventsByType,
        lastEvent: events.length > 0 ? events[events.length - 1].timestamp : null
      };
    });

    return {
      totalRoomsWithFileEvents,
      totalEvents,
      rooms: roomStats
    };
  }

  /**
   * Validate file event data
   */
  validateFileEvent(data) {
    const { type, room, sessionId } = data;
    
    if (!type || typeof type !== 'string') {
      return { valid: false, error: 'Event type is required and must be a string' };
    }
    
    if (!room && !sessionId) {
      return { valid: false, error: 'Room or sessionId is required' };
    }
    
    // Type-specific validation
    switch (type) {
      case 'file-upload-progress':
        if (!data.fileName) {
          return { valid: false, error: 'fileName is required for upload progress' };
        }
        break;
      case 'file-deleted':
        if (!data.fileName && !data.filePath) {
          return { valid: false, error: 'fileName or filePath is required for file deletion' };
        }
        break;
      case 'file-uploaded':
        if (!data.fileName && !data.filePath) {
          return { valid: false, error: 'fileName or filePath is required for file upload' };
        }
        break;
    }
    
    return { valid: true };
  }

  /**
   * Enhanced broadcast with validation
   */
  broadcastValidatedFileEvent(ws, data) {
    const validation = this.validateFileEvent(data);
    
    if (!validation.valid) {
      console.warn(`⚠️ Invalid file event from ${ws.userEmail}: ${validation.error}`);
      
      // Send error back to sender
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'file-event-error',
          error: validation.error,
          timestamp: new Date().toISOString()
        }));
      }
      return false;
    }
    
    // Proceed with broadcasting valid event
    this.handleFileMessage(ws, data);
    return true;
  }

  /**
   * Get active file uploads (progress events from last 5 minutes)
   */
  getActiveFileUploads(roomName) {
    const events = this.getFileEvents(roomName);
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    return events.filter(event => {
      return event.type === 'file-upload-progress' && 
             new Date(event.timestamp).getTime() > fiveMinutesAgo &&
             event.progress < 100;
    });
  }

  /**
   * Cleanup all file event state
   */
  cleanup() {
    console.log('🧹 Cleaning up file event manager...');
    this.fileEvents.clear();
  }
}

module.exports = FileEventManager;
