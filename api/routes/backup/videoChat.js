const express = require("express");
const router = express.Router();

module.exports = (io) => {
  const users = {}; // socket.id => { roomId, session }

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", ({ roomId, session }) => {
      socket.join(roomId);
      users[socket.id] = { roomId, session };

      // Notify other users in the room
      socket.to(roomId).emit("user-connected", socket.id, session);
    });

    socket.on("offer", ({ offer, to, session }) => {
      if (users[to] && users[to].session === session) {
        socket.to(to).emit("offer", { offer, from: socket.id, session });
      }
    });

    socket.on("answer", ({ answer, to, session }) => {
      if (users[to] && users[to].session === session) {
        socket.to(to).emit("answer", { answer, from: socket.id, session });
      }
    });

    socket.on("candidate", ({ candidate, to, session }) => {
      if (users[to] && users[to].session === session) {
        socket.to(to).emit("candidate", { candidate, from: socket.id, session });
      }
    });

    socket.on("disconnect", () => {
      const user = users[socket.id];
      if (user) {
        const { roomId, session } = user;
        socket.to(roomId).emit("user-disconnected", socket.id, session);
        delete users[socket.id];
      }
      console.log("User disconnected from video:", socket.id);
    });
  });

  return router;
};
