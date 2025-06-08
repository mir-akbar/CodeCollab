const express = require("express");
const Message = require("../models/Message");

module.exports = (io) => {
  const router = express.Router();

  // Get Messages
  router.get("/messages", async (req, res) => {
    try {
      const messages = await Message.find().sort({ timestamp: 1 });
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // WebSocket for Chat
  io.on("connection", (socket) => {
    console.log("A user connected to chat");

    socket.on("sendMessage", async (message) => {
      const { sender, content, sessionId } = message;

      try {
        const newMessage = new Message({
          sender,
          content,
          session: sessionId
        });

        const savedMessage = await newMessage.save();
        io.emit("receiveMessage", savedMessage);
      } catch (err) {
        console.error("Error saving message:", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected from chat");
    });
  });

  return router;
};
