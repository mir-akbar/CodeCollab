const mongoose = require("mongoose");

const SessionManagementFilesSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileType: { type: String, enum: ["file", "folder"], required: true },
  filePath: { type: String, required: true },
  parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: "SessionManagementFiles", default: null },
  content: { type: Buffer, default: null },
  mimeType: { type: String, default: null },
  uploadDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SessionManagementFiles", SessionManagementFilesSchema);
