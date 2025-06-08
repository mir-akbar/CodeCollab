const express = require("express");
const axios = require("axios");
const router = express.Router();

const JDoodle_CLIENT_ID = "35904526ef544c2fffb00bea8b6dba3a";
const JDoodle_CLIENT_SECRET = "d4225f339fc8f5f87735669b0f2884330d03afe54a980c34e762f24d62d20128";
const JDoodle_API_URL = "https://api.jdoodle.com/v1/execute";

router.post("/run", async (req, res) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: "Language and code are required" });
  }

  // Supported JDoodle language mappings
  const languageMapping = {
    javascript: { language: "nodejs", versionIndex: "4" },
    python: { language: "python3", versionIndex: "3" },
    java: { language: "java", versionIndex: "4" },
  };

  const langDetails = languageMapping[language.toLowerCase()];
  if (!langDetails) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  try {
    const response = await axios.post(JDoodle_API_URL, {
      clientId: JDoodle_CLIENT_ID,
      clientSecret: JDoodle_CLIENT_SECRET,
      script: code,
      language: langDetails.language,
      versionIndex: langDetails.versionIndex,
    });

    res.json({ output: response.data.output, memory: response.data.memory, cpuTime: response.data.cpuTime });
  } catch (error) {
    console.error("Execution Error:", error);
    res.status(500).json({ error: "Error executing code" });
  }
});

module.exports = router;
