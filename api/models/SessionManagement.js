const mongoose = require("mongoose");

const SessionManagementSchema = new mongoose.Schema({
  name: String,
  email: String,
  invited_email: String,
  description: String,
  file_name: String,
  file_path: String,
  session_id: String,
  uploaded_at: { type: Date, default: Date.now },
  access: { type: String, default: "edit" },
});

module.exports = mongoose.model("SessionManagement", SessionManagementSchema);
