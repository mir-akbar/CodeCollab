/**
 * Code Editor Services Index
 * Exports refactored collaboration services
 */

// Core managers (available for direct use if needed)
export { YjsConnectionManager } from './core/YjsConnectionManager.js';
export { MonacoBindingManager } from './core/MonacoBindingManager.js';
export { UserPresenceManager } from './core/UserPresenceManager.js';
export { CursorStyleManager } from './core/CursorStyleManager.js';

// Main service (refactored version as default)
export { codeCollaborationService } from './codeCollaborationService.js';
export { default } from './codeCollaborationService.js';
