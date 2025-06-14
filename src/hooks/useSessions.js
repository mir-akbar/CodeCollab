/**
 * Session Hooks - Backward Compatibility
 * Re-exports from modular session hooks for existing imports
 * 
 * @deprecated Import from './sessions/index.js' instead for better tree-shaking
 */

// Re-export all hooks for backward compatibility
export * from './sessions/index.js';

// Default export for main actions hook
export { default } from './sessions/index.js';
