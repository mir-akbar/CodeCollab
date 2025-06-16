/**
 * Y.js Message Validator
 * Validates Y.js binary messages to prevent corruption errors
 */

class YjsValidator {
  /**
   * Validate if a buffer contains valid Y.js binary data
   * @param {Buffer|Uint8Array} buffer - The buffer to validate
   * @returns {boolean} - True if the buffer appears to be valid Y.js data
   */
  static isValidYjsBuffer(buffer) {
    try {
      // Basic checks
      if (!buffer || buffer.length === 0) {
        return false;
      }
      
      // Convert to Uint8Array if needed
      let uint8Array;
      if (Buffer.isBuffer(buffer)) {
        uint8Array = new Uint8Array(buffer);
      } else if (buffer instanceof Uint8Array) {
        uint8Array = buffer;
      } else {
        return false;
      }
      
      // Y.js binary messages have specific patterns
      // Most Y.js updates start with specific byte sequences
      
      // Minimum size check - Y.js updates are rarely smaller than 2 bytes
      if (uint8Array.length < 2) {
        return false;
      }
      
      // Check for obvious corruption patterns
      // Y.js typically doesn't have all zeros or all 255s
      const allSame = uint8Array.every(byte => byte === uint8Array[0]);
      if (allSame && (uint8Array[0] === 0 || uint8Array[0] === 255)) {
        return false;
      }
      
      // Check for reasonable byte distribution
      // Valid Y.js data should have some variety in byte values
      const uniqueBytes = new Set(uint8Array.slice(0, Math.min(10, uint8Array.length)));
      if (uniqueBytes.size === 1 && uint8Array.length > 5) {
        return false; // Suspicious - too uniform
      }
      
      return true;
      
    } catch (error) {
      console.warn('Error validating Y.js buffer:', error);
      return false;
    }
  }
  
  /**
   * Safely convert various buffer types to Uint8Array for Y.js
   * @param {Buffer|Uint8Array|any} data - The data to convert
   * @returns {Uint8Array|null} - Converted data or null if invalid
   */
  static toSafeUint8Array(data) {
    try {
      if (data instanceof Uint8Array) {
        return data;
      }
      
      if (Buffer.isBuffer(data)) {
        return new Uint8Array(data);
      }
      
      // Try to handle other array-like objects
      if (data && typeof data.length === 'number' && data.length > 0) {
        return new Uint8Array(data);
      }
      
      return null;
    } catch (error) {
      console.warn('Error converting to Uint8Array:', error);
      return null;
    }
  }
  
  /**
   * Validate and prepare Y.js update data
   * @param {any} updateData - The update data to validate
   * @returns {Object} - {isValid: boolean, data: Uint8Array|null, error: string|null}
   */
  static validateYjsUpdate(updateData) {
    try {
      // Convert to safe format
      const uint8Array = this.toSafeUint8Array(updateData);
      
      if (!uint8Array) {
        return {
          isValid: false,
          data: null,
          error: 'Unable to convert data to Uint8Array'
        };
      }
      
      // Validate the buffer
      if (!this.isValidYjsBuffer(uint8Array)) {
        return {
          isValid: false,
          data: null,
          error: 'Buffer does not appear to contain valid Y.js data'
        };
      }
      
      return {
        isValid: true,
        data: uint8Array,
        error: null
      };
      
    } catch (error) {
      return {
        isValid: false,
        data: null,
        error: error.message
      };
    }
  }
}

module.exports = YjsValidator;
