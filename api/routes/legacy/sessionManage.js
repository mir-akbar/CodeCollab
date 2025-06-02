const express = require("express");
const router = express.Router();
const SessionManagement = require("../models/SessionManagement");

// GET MY SESSIONS
router.get("/get-my-sessions", async (req, res) => {
  const userEmail = req.query.email;
  if (!userEmail) return res.status(400).json({ error: "Email is required" });

  try {
    const results = await SessionManagement.find({ email: userEmail });

    const sessionsMap = {};
    for (const row of results) {
      const {
        session_id,
        _id: id,
        name,
        description,
        uploaded_at,
        email,
        invited_email,
        access
      } = row;

      if (!sessionsMap[session_id]) {
        sessionsMap[session_id] = {
          id,
          sessionId: session_id,
          name,
          createdAt: uploaded_at,
          isCreator: email === userEmail,
          status: "active",
          type: "mySessions",
          access: "edit",
          description,
          participants: [],
          creator: email
        };
      }

      if (invited_email) {
        sessionsMap[session_id].participants.push({
          email: invited_email,
          name: invited_email.split("@")[0],
          access
        });
      }

      if (!sessionsMap[session_id].participants.some(p => p.email === email)) {
        sessionsMap[session_id].participants.unshift({
          email,
          name: email.split("@")[0],
          access
        });
      }
    }

    res.json(Object.values(sessionsMap));
  } catch (err) {
    console.error("MongoDB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET SHARED SESSIONS
router.get("/get-shared-sessions", async (req, res) => {
  const userEmail = req.query.email;
  if (!userEmail) return res.status(400).json({ error: "Email is required" });

  try {
    const results = await SessionManagement.find({ invited_email: userEmail });

    const sessionsMap = {};
    for (const row of results) {
      const {
        session_id,
        _id: id,
        name,
        description,
        uploaded_at,
        email,
        invited_email,
        access
      } = row;

      if (!sessionsMap[session_id]) {
        sessionsMap[session_id] = {
          id,
          sessionId: session_id,
          name,
          createdAt: uploaded_at,
          isCreator: false,
          status: "active",
          type: "sharedFromOthers",
          access,
          description,
          participants: [],
          creator: email
        };
      }

      if (invited_email) {
        sessionsMap[session_id].participants.push({
          email: invited_email,
          name: invited_email.split("@")[0],
          access
        });
      }

      if (!sessionsMap[session_id].participants.some(p => p.email === email)) {
        sessionsMap[session_id].participants.unshift({
          email,
          name: email.split("@")[0],
          access
        });
      }
    }

    res.json(Object.values(sessionsMap));
  } catch (err) {
    console.error("MongoDB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// CREATE SESSION
router.post("/create-session", async (req, res) => {
  const { name, description, sessionId, email } = req.body;
  if (!sessionId || !email) return res.status(400).json({ message: "Session ID and email are required" });

  try {
    await SessionManagement.create({ name, description, session_id: sessionId, email });
    res.status(200).json({ message: "New session created successfully!" });
  } catch (err) {
    console.error("MongoDB Error:", err);
    res.status(500).json({ message: "Failed to create session." });
  }
});

// DELETE SESSION
router.post("/delete-session", async (req, res) => {
  const { sessionId } = req.body;
  try {
    const result = await SessionManagement.deleteMany({ session_id: sessionId });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Session not found." });
    res.status(200).json({ message: "Session deleted successfully!" });
  } catch (err) {
    console.error("MongoDB Error:", err);
    res.status(500).json({ message: "Failed to delete session." });
  }
});

// LEAVE SESSION
router.post("/leave-session", async (req, res) => {
  const { id } = req.body;
  try {
    const result = await SessionManagement.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ message: "Session not found." });
    res.status(200).json({ message: "Session deleted successfully!" });
  } catch (err) {
    console.error("MongoDB Error:", err);
    res.status(500).json({ message: "Failed to delete session." });
  }
});

// INVITE SESSION
router.post("/invite-session", async (req, res) => {
  const { sessionId, email, id, access } = req.body;
  try {
    const existing = await SessionManagement.findOne({ session_id: sessionId, invited_email: email });
    if (existing) {
      existing.invited_email = email;
      await existing.save();
      return res.status(200).json({ message: "Invitation updated successfully!" });
    } else {
      const source = await SessionManagement.findById(id);
      if (!source) return res.status(404).json({ message: "Original session not found." });

      await SessionManagement.create({
        name: source.name,
        email: source.email,
        invited_email: email,
        file_name: source.file_name,
        file_path: source.file_path,
        session_id: source.session_id,
        access,
        description: source.description
      });

      return res.status(200).json({ message: "Invitation sent successfully!" });
    }
  } catch (err) {
    console.error("MongoDB Error:", err);
    res.status(500).json({ message: "Failed to invite session." });
  }
});

// ACTIVE USERS
router.post("/active-users", async (req, res) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: "session_id is required" });

  try {
    const allSessions = await SessionManagement.find({ session_id });
    const uniqueEmails = [...new Set(allSessions.map(doc => doc.email))];
    const latestUsers = [];

    for (const email of uniqueEmails) {
      const latest = await SessionManagement.findOne({ session_id, email }).sort({ uploaded_at: -1 });
      if (latest) latestUsers.push(latest);
    }

    res.json(latestUsers);
  } catch (err) {
    console.error("MongoDB Error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

module.exports = router;
