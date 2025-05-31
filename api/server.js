const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const fileStorageService = require("./services/fileStorageService");
require("./db/index.js");
const videoChat = require("./routes/videoChat");
const fileUpload = require("./routes/fileUpload");
const chat = require("./routes/chat");
const getFile = require("./routes/getFile");
const execute = require("./routes/execute");
const sessionManage = require("./routes/sessionManage");


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
  transports: ["websocket", "polling"],
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const connectedUsers = new Map();
const fileContents = new Map();
const roomUsers = new Map();
const userSessions = new Map();
let sharedCode = "";
let currentEditor = null;

const videoNamespace = io.of("/video-chat");
videoChat(videoNamespace);

app.use("/file-upload", fileUpload(io));
app.use("/chat", chat(io));
app.use("/files", getFile(io));
app.use("/execute", execute);
app.use("/manage_session", sessionManage);

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

server.listen(3012, () => {
  console.log("Server running on http://localhost:3012");
});
