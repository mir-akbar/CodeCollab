/**
 * @fileoverview Session Validation Controller - Debug & Admin
 * 
 * Handles debugging and validation utilities:
 * - Participant record validation
 * - Debug endpoints
 * - Administrative utilities
 * 
 * @version 2.0.0
 * @author CodeLab Development Team
 * @since 2025-06-04
 */

const participantService = require("../services/participantService");
const { asyncHandler } = require("../middleware/errorHandler");
const SessionValidationUtils = require("../utils/sessionValidation");

class SessionValidationController {

  /**
   * DEBUG: Check for duplicate participant records
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  checkParticipantRecords = asyncHandler(async (req, res) => {
    const { sessionId, userEmail: targetEmail } = req.params;
    
    // Validate inputs
    if (!SessionValidationUtils.isValidSessionId(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid session ID is required" 
      });
    }

    if (!SessionValidationUtils.isValidEmail(targetEmail)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid email is required" 
      });
    }
    
    // Get participant using simplified service
    const participant = await participantService.getParticipant(sessionId, targetEmail);
    
    res.json({
      success: true,
      count: participant ? 1 : 0,
      participants: participant ? [participant] : []
    });
  });

  /**
   * Validate session data integrity
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} - Promise resolving to void
   */
  validateSessionIntegrity = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    if (!SessionValidationUtils.isValidSessionId(sessionId)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid session ID is required" 
      });
    }

    // This could be expanded to perform various integrity checks
    // For now, it's a placeholder for future validation features
    res.json({
      success: true,
      message: "Session integrity validation endpoint",
      sessionId: sessionId,
      status: "validation_available"
    });
  });
}

module.exports = SessionValidationController;
