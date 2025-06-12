/**
 * Code Execution Routes
 * Handles running code in different languages using JDoodle API
 */

const express = require("express");
const axios = require("axios");
const router = express.Router();

// JDoodle API Configuration
const JDoodle_CLIENT_ID = "35904526ef544c2fffb00bea8b6dba3a";
const JDoodle_CLIENT_SECRET = "d4225f339fc8f5f87735669b0f2884330d03afe54a980c34e762f24d62d20128";
const JDoodle_API_URL = "https://api.jdoodle.com/v1/execute";

/**
 * Execute code endpoint
 * POST /api/execute/run
 */
router.post("/run", async (req, res) => {
  const { language, code } = req.body;

  // Input validation
  if (!language || !code) {
    return res.status(400).json({ 
      error: "Language and code are required",
      success: false
    });
  }

  // Supported JDoodle language mappings
  const languageMapping = {
    javascript: { language: "nodejs", versionIndex: "4" },
    python: { language: "python3", versionIndex: "3" },
    java: { language: "java", versionIndex: "4" },
    js: { language: "nodejs", versionIndex: "4" },
    py: { language: "python3", versionIndex: "3" },
  };

  const langDetails = languageMapping[language.toLowerCase()];
  if (!langDetails) {
    return res.status(400).json({ 
      error: `Unsupported language: ${language}. Supported languages: javascript, python, java`,
      success: false
    });
  }

  try {
    console.log(`🚀 Executing ${language} code...`);
    
    // Make request to JDoodle API
    const response = await axios.post(JDoodle_API_URL, {
      clientId: JDoodle_CLIENT_ID,
      clientSecret: JDoodle_CLIENT_SECRET,
      script: code,
      language: langDetails.language,
      versionIndex: langDetails.versionIndex,
    });

    const output = response.data.output || "No output";
    const memory = response.data.memory;
    const cpuTime = response.data.cpuTime;

    console.log(`✅ Code execution completed`);

    res.json({ 
      output,
      memory,
      cpuTime,
      success: true
    });
  } catch (error) {
    console.error("❌ Code execution error:", error.message);
    
    // Handle specific JDoodle errors
    if (error.response) {
      return res.status(500).json({ 
        error: `Execution service error: ${error.response.data?.error || error.response.statusText}`,
        success: false
      });
    }
    
    res.status(500).json({ 
      error: "Internal server error during code execution",
      success: false
    });
  }
});

/**
 * Get supported languages endpoint
 * GET /api/execute/languages
 */
router.get("/languages", (req, res) => {
  res.json({
    success: true,
    languages: [
      { name: "JavaScript", code: "javascript", extensions: [".js"] },
      { name: "Python", code: "python", extensions: [".py"] },
      { name: "Java", code: "java", extensions: [".java"] }
    ]
  });
});

module.exports = router;
