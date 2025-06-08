/**
 * @fileoverview Session Controller - Core CRUD Operations
 * 
 * Handles basic session operations:
 * - Session creation and retrieval
 * - Access control validation
 * - Core session management
 * 
 * @version 2.0.0
 * @author CodeLab Development Team
 * @since 2025-06-04
 */

const sessionService = require("../services/sessionService");
const accessService = require("../services/accessService");
const { asyncHandler } = require("../middleware/errorHandler");
const SessionValidationUtils = require("../utils/sessionValidation");

class SessionController {

  /**
   * Get all sessions for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  getUserSessions = asyncHandler(async (req, res) => {
    const { userEmail } = req;
    
    console.log('SessionController.getUserSessions called with userEmail:', userEmail);
    
    // Validate user email
    if (!SessionValidationUtils.isValidEmail(userEmail)) {
      console.log('Email validation failed for:', userEmail);
      return res.status(400).json({
        success: false,
        error: "Invalid user email format"
      });
    }
    
    console.log('Email validation passed, fetching sessions for:', userEmail);
    
    // Get user sessions using simplified service
    const sessions = await sessionService.getUserSessions(userEmail);
    
    console.log('Sessions retrieved:', sessions.length);
    
    res.json({
      success: true,
      sessions: sessions,
      total: sessions.length,
      userEmail: userEmail
    });
  });

  /**
   * Get a specific session by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  getSessionById = asyncHandler(async (req, res) => {
    const { sessionId } = req;

    // Validate session ID
    if (!SessionValidationUtils.isValidSessionId(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid session ID format. Session ID must contain only letters, numbers, hyphens, and underscores."
      });
    }

    const session = await sessionService.getSessionById(sessionId);
    
    if (!session) {
      return res.status(404).json({ 
        success: false,
        error: "Session not found or you don't have access to it" 
      });
    }

    res.json({
      success: true,
      session: session
    });
  });

  /**
   * Create a new session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  createSession = asyncHandler(async (req, res) => {
    const { name, description, creator, sessionId } = req.body;
    
    // Enhanced validation
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Session name is required and must be a valid string"
      });
    }

    if (!SessionValidationUtils.isValidEmail(creator)) {
      return res.status(400).json({
        success: false,
        error: "Creator email is required and must be a valid email address"
      });
    }

    // Sanitize inputs
    const sanitizedName = SessionValidationUtils.sanitizeInput(name);
    const sanitizedDescription = description ? SessionValidationUtils.sanitizeInput(description) : '';

    if (sanitizedName.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Session name cannot be empty after sanitization"
      });
    }

    if (sanitizedName.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Session name must be 100 characters or less"
      });
    }
    
    const session = await sessionService.createSession({
      name: sanitizedName,
      description: sanitizedDescription,
      creator: creator.trim().toLowerCase(),
      sessionId: sessionId
    });

    res.status(201).json({ 
      success: true,
      message: "Session created successfully",
      session: session,
      sessionId: session.sessionId
    });
  });

  /**
   * Delete a session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  deleteSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    await sessionService.archiveSession(sessionId);

    res.status(200).json({ 
      success: true,
      message: "Session archived successfully" 
    });
  });

  /**
   * Update session details (name, description, settings)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  updateSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { name, description } = req.body;

    // Validate session ID
    if (!SessionValidationUtils.isValidSessionId(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Valid session ID is required"
      });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) {
      const sanitizedName = name.trim();
      if (sanitizedName.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Session name cannot be empty"
        });
      }
      updateData.name = sanitizedName;
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    const session = await sessionService.updateSession(sessionId, updateData);

    res.status(200).json({
      success: true,
      message: "Session updated successfully",
      session: session
    });
  });

  /**
   * Check session access
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  checkAccess = asyncHandler(async (req, res) => {
    const { sessionId, email } = req.query;

    if (!SessionValidationUtils.isValidSessionId(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid session ID is required" 
      });
    }

    if (!SessionValidationUtils.isValidEmail(email)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid email is required" 
      });
    }

    const hasAccess = await accessService.checkSessionAccess(sessionId, email.trim().toLowerCase());
    res.json({
      success: true,
      hasAccess: hasAccess
    });
  });
}

module.exports = SessionController;
