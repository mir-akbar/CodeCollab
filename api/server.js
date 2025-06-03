// Load and validate environment configuration
const { config, validateEnvironment } = require('./config/environment');

// Validate environment variables on startup
try {
  validateEnvironment();
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const Y = require('yjs');
const fileStorageService = require("./services/fileStorageService");
require("./db/index.js");

// Import routes
const videoChat = require("./routes/videoChat");
const fileUpload = require("./routes/fileUpload");
const chat = require("./routes/chat");
const getFile = require("./routes/getFile");
const execute = require("./routes/execute");
const sessions = require("./routes/sessions");
const fileVersions = require("./routes/fileVersions");

// Import middleware
const { errorLogger, errorHandler, notFoundHandler } = require("./middleware/errorHandler");


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.CORS_ORIGIN,
  },
  transports: ["websocket", "polling"],
});

app.use(cors({
  origin: config.CORS_ORIGIN
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Apply error logging middleware
app.use(errorLogger);

const connectedUsers = new Map();
const fileContents = new Map();
const roomUsers = new Map();
const userSessions = new Map();
// Store YJS document states in memory (use Redis/MongoDB in production)
const yjsRooms = new Map();
// Store sync timers for debouncing
yjsRooms.syncTimers = new Map();
let sharedCode = "";
let currentEditor = null;

const videoNamespace = io.of("/video-chat");
videoChat(videoNamespace);

app.use("/file-upload", fileUpload(io));
app.use("/chat", chat(io));
app.use("/files", getFile(io));
app.use("/file-versions", fileVersions(io));
app.use("/execute", execute);
app.use("/sessions", sessions);

// Health check endpoint for session system (frontend compatibility)
const SessionController = require("./controllers/sessionController");
const sessionController = new SessionController();
app.get("/session/health", sessionController.healthCheck);

io.on("connection", (socket) => {

  socket.on("register-user", (email) => {
    if (email) {
      if (!userSessions.has(email)) {
        userSessions.set(email, new Set());
      }
      if (!userSessions.get(email).has(socket.id)) {
        userSessions.get(email).add(socket.id);
      }
      connectedUsers.set(socket.id, { id: socket.id, email });
      io.emit("active-users", Array.from(userSessions.keys()));
    }
  });
  

  socket.on("join-room", (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);

    if (!roomUsers.has(room)) {
      roomUsers.set(room, new Set());
    }
    roomUsers.get(room).add(socket.id);

    io.to(room).emit("room-users", Array.from(roomUsers.get(room)));
  });

  socket.on("leave-room", (room) => {
    socket.leave(room);
    if (roomUsers.has(room)) {
      roomUsers.get(room).delete(socket.id);
      if (roomUsers.get(room).size === 0) {
        roomUsers.delete(room);
      }
    }
    io.to(room).emit("room-users", Array.from(roomUsers.get(room) || []));
  });

  // socket.emit("code-update", { code: sharedCode, author: "System" });

  socket.on('code-change', async (data) => {
      let { code, user, directory = "", fileName, sessionId } = data;
      if (!code || !user || !sessionId || !fileName) return;

      console.log(`📂 Directory received: ${directory}`);
      console.log(`🔄 Code change detected from: ${user}`);

      try {
        // Construct the file path for MongoDB storage
        let filePath = fileName;
        if (directory && directory !== "" && directory !== "/") {
          // Clean up directory path
          const cleanDir = directory.replace(/^\/uploads\/extracted\/[^/]+\//, "");
          if (cleanDir && cleanDir !== "") {
            filePath = `${cleanDir}/${fileName}`;
          }
        }

        // Update file content in MongoDB
        const contentBuffer = Buffer.from(code, 'utf8');
        await fileStorageService.updateFileContent(sessionId, filePath, contentBuffer);
        console.log(`✅ File updated in MongoDB: ${filePath}`);

        // Emit updates
        socket.broadcast.emit('code-update', { code, author: user, sessionId });
        socket.broadcast.emit('editing-user', user);
        socket.emit('code-update', { code, author: user, sessionId });
        socket.emit('editing-user', user);
      } catch (error) {
        console.error("❌ Error updating file in MongoDB:", error);
      }
    });

  
    socket.on("cursor-move", (data) => {
    socket.broadcast.emit("remote-cursor", data);
  });

  // YJS-specific handlers
  socket.on('yjs-join-room', ({ room }) => {
    socket.join(room);
    console.log(`User ${socket.id} joined YJS room: ${room}`);
  });  socket.on('yjs-leave-room', async ({ room }) => {
    socket.leave(room);
    console.log(`User ${socket.id} left YJS room: ${room}`);
    
    // Clean up room data if no one is in the room
    const roomClients = io.sockets.adapter.rooms.get(room);
    if (!roomClients || roomClients.size === 0) {
      // Extract sessionId and filePath for final sync
      const lastDashIndex = room.lastIndexOf('-');
      if (lastDashIndex > 0) {
        const sessionId = room.substring(0, lastDashIndex);
        const filePath = room.substring(lastDashIndex + 1);
        
        console.log(`🔍 Cleanup sync - Session: ${sessionId}, File: ${filePath}`);
        
        if (sessionId && filePath && yjsRooms.has(room)) {
          try {
            // Final sync to MongoDB before cleanup
            const roomData = yjsRooms.get(room);
            if (roomData.doc && roomData.isInitialized) {
              const finalState = Y.encodeStateAsUpdate(roomData.doc);
              await fileStorageService.syncYjsDocumentToFile(sessionId, filePath, finalState);
              console.log(`📝 Final sync for room cleanup: ${filePath}`);
            }
          } catch (error) {
            console.error('Error during final sync:', error);
          }
          
          // Clean up memory
          yjsRooms.delete(room);
          if (yjsRooms.syncTimers) {
            clearTimeout(yjsRooms.syncTimers.get(room));
            yjsRooms.syncTimers.delete(room);
          }
          console.log(`🧹 Cleaned up YJS room: ${room}`);
        }
      }
    }
  });socket.on('yjs-update', ({ room, update, origin }) => {
    // Initialize room data structure if it doesn't exist
    if (!yjsRooms.has(room)) {
      yjsRooms.set(room, {
        doc: new Y.Doc(), // Store the actual YJS document for proper state management
        lastSyncTime: Date.now(),
        isInitialized: false
      });
    }
    
    const roomData = yjsRooms.get(room);
      // Apply the update to the room's YJS document
    try {
      Y.applyUpdate(roomData.doc, new Uint8Array(update));
      
      // Mark room as initialized since we have content
      roomData.isInitialized = true;
      
      // Broadcast to others in the room (excluding the sender)
      socket.to(room).emit('yjs-update', { update, origin });
      
      // Extract sessionId and filePath from room name for MongoDB sync
      const lastDashIndex = room.lastIndexOf('-');
      if (lastDashIndex > 0) {
        const sessionId = room.substring(0, lastDashIndex);
        const filePath = room.substring(lastDashIndex + 1);
        
        // Debounce the MongoDB sync to avoid excessive writes
        if (!yjsRooms.syncTimers) yjsRooms.syncTimers = new Map();
        
        clearTimeout(yjsRooms.syncTimers.get(room));
        yjsRooms.syncTimers.set(room, setTimeout(async () => {
          try {
            // Use the current document state (not accumulated updates)
            const currentState = Y.encodeStateAsUpdate(roomData.doc);
            await fileStorageService.syncYjsDocumentToFile(sessionId, filePath, currentState);
            console.log(`📝 Synced YJS document to MongoDB: ${filePath}`);
            roomData.lastSyncTime = Date.now();
          } catch (error) {
            console.error('Error syncing YJS document to MongoDB:', error);
          }
        }, 2000)); // 2 second debounce
      }
    } catch (error) {
      console.error('Error applying YJS update:', error);
    }
  });

  socket.on('yjs-awareness-update', ({ room, update, origin }) => {
    socket.to(room).emit('yjs-awareness-update', { update, origin });
  });  socket.on('yjs-request-sync', async ({ room }) => {
    // Extract sessionId and filePath from room name (format: sessionId-fileName)
    const lastDashIndex = room.lastIndexOf('-');    if (lastDashIndex <= 0) {
      console.error(`❌ Invalid room format for sync request: ${room}`);
      socket.emit('yjs-sync-response', { update: null, room });
      return;
    }
    
    const sessionId = room.substring(0, lastDashIndex);
    const filePath = room.substring(lastDashIndex + 1);
    
    console.log(`🔍 Sync request - Session: ${sessionId}, File: ${filePath}`);
    
    try {
      // Check if we have an existing YJS document in memory
      if (yjsRooms.has(room)) {        const roomData = yjsRooms.get(room);        
        if (roomData.doc && roomData.isInitialized) {
          // Return the current state of the in-memory document
          const currentState = Y.encodeStateAsUpdate(roomData.doc);
          
          // Validate state size to prevent memory issues
          if (currentState.length > 10 * 1024 * 1024) { // 10MB limit
            console.error(`📊 In-memory YJS document too large: ${currentState.length} bytes for ${filePath}`);
            socket.emit('yjs-sync-response', { update: null, room });
            return;
          }
          
          // Safe array conversion with chunked processing for large arrays
          let updateArray;
          try {
            if (currentState.length > 1024 * 1024) { // 1MB threshold for chunked processing
              console.log(`📊 Using chunked array conversion for large document: ${currentState.length} bytes`);
              updateArray = [];
              const chunkSize = 64 * 1024; // 64KB chunks
              for (let i = 0; i < currentState.length; i += chunkSize) {
                const chunk = currentState.slice(i, i + chunkSize);
                updateArray.push(...Array.from(chunk));
              }
            } else {
              updateArray = Array.from(currentState);
            }
          } catch (arrayError) {
            console.error(`📊 Memory state array conversion failed for ${filePath}:`, arrayError.message);
            socket.emit('yjs-sync-response', { update: null, room });
            return;
          }
          
          socket.emit('yjs-sync-response', { update: updateArray, room });
          console.log(`📤 Sent YJS state from memory: ${filePath}, size: ${currentState.length}`);
          return;
        }
      }
      
      // Initialize room with document from MongoDB
      if (!yjsRooms.has(room)) {
        yjsRooms.set(room, {
          doc: new Y.Doc(),
          lastSyncTime: Date.now(),
          isInitialized: false
        });
      }
      
      const roomData = yjsRooms.get(room);
        // Try to load the document state from MongoDB
      try {
        const documentState = await fileStorageService.getYjsDocumentFromFile(sessionId, filePath);
        if (documentState && documentState.length > 0) {
          // Validate document state size to prevent memory issues
          if (documentState.length > 10 * 1024 * 1024) { // 10MB limit
            console.error(`📊 YJS document too large: ${documentState.length} bytes for ${filePath}`);
            throw new Error('Document too large');
          }
          
          // Apply the loaded state to our room document
          Y.applyUpdate(roomData.doc, documentState);
          roomData.isInitialized = true;
            // Safe array conversion with chunked processing for large arrays
          let updateArray;
          try {
            if (documentState.length > 1024 * 1024) { // 1MB threshold for chunked processing
              console.log(`📊 Using chunked array conversion for MongoDB document: ${documentState.length} bytes`);
              updateArray = [];
              const chunkSize = 64 * 1024; // 64KB chunks
              for (let i = 0; i < documentState.length; i += chunkSize) {
                const chunk = documentState.slice(i, i + chunkSize);
                updateArray.push(...Array.from(chunk));
              }
            } else {
              updateArray = Array.from(documentState);
            }
          } catch (arrayError) {
            console.error(`📊 Array conversion failed for ${filePath}:`, arrayError.message);
            throw new Error('Invalid document state format');
          }
          
          socket.emit('yjs-sync-response', { update: updateArray, room });
          console.log(`📂 Loaded and sent YJS document from MongoDB: ${filePath}, size: ${documentState.length}`);
          return;
        }
      } catch (loadError) {
        console.warn(`Could not load YJS document from MongoDB: ${loadError.message}`);
      }      // If no document found in MongoDB, initialize empty document
      roomData.doc.getText('monaco'); // Initialize the text type
      roomData.isInitialized = true;
      
      const emptyState = Y.encodeStateAsUpdate(roomData.doc);
      
      // Safe array conversion (empty states should be small, but let's be safe)
      let updateArray;
      try {
        updateArray = Array.from(emptyState);
      } catch (arrayError) {
        console.error(`📊 Empty state array conversion failed for ${filePath}:`, arrayError.message);
        // Fallback to empty array
        updateArray = [];
      }
      
      socket.emit('yjs-sync-response', { update: updateArray, room });
      console.log(`📭 Sent empty YJS document for: ${filePath}`);
        } catch (error) {
      console.error('Error handling YJS sync request:', error);
      socket.emit('yjs-sync-response', { update: null, room });
    }
  });
  

  socket.on("disconnect", () => {
    socket.broadcast.emit("cursor-disconnect", { user: socket.userEmail });
  });

  socket.on("join-file", (fileName) => {
    socket.join(fileName);
    if (fileContents.has(fileName)) {
      socket.emit("file-update", {
        fileName,
        code: fileContents.get(fileName),
        author: "System",
      });
    } else {
      fileContents.set(fileName, "");
    }
  });

  const path = require("path");
const fs = require("fs");

socket.on("file-change", async (data) => {
  const { filePath, content, room, sessionId } = data;
  const fileName = path.basename(filePath);
  fileContents.set(fileName, content);

  io.to(room).emit("file-update", {
    fileName,
    code: content,
    author: "System",
    sessionId: sessionId,
  });

  try {
    // Save to MongoDB instead of filesystem
    const contentBuffer = Buffer.from(content, "utf8");
    await fileStorageService.updateFileContent(sessionId, filePath, contentBuffer);
    console.log(`File ${fileName} saved to MongoDB under session ${sessionId}.`);
  } catch (error) {
    console.error("Error saving file to MongoDB:", error);
  }
});



  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      const { email } = userInfo;
      userSessions.get(email)?.delete(socket.id);
      if (userSessions.get(email)?.size === 0) {
        userSessions.delete(email);
      }
    }
    connectedUsers.delete(socket.id);
    io.emit("active-users", Array.from(userSessions.keys()));
    
    for (const [room, users] of roomUsers.entries()) {
      users.delete(socket.id);
      if (users.size === 0) {
        roomUsers.delete(room);
      } else {
        io.to(room).emit("room-users", Array.from(users));
      }
    }
  });
});

app.get("/active-users", (req, res) => {
  res.json(Array.from(userSessions.keys()));
});

// Add error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

server.listen(config.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${config.PORT}`);
  console.log(`📋 Environment: ${config.NODE_ENV}`);
  console.log(`🔗 MongoDB: Connected`);
  console.log(`🏗️  API Structure: Enhanced with Controllers & Middleware`);
});
