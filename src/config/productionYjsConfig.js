/**
 * Production Y.js Configuration
 * Optimized settings for Railway deployment to prevent content duplication
 */

export const PRODUCTION_YJS_CONFIG = {
  // Disable server-side document persistence to prevent conflicts
  serverSideProcessing: false,
  
  // WebSocket connection settings optimized for Railway
  websocket: {
    // Shorter heartbeat interval for Railway's connection stability
    heartbeatInterval: 15000, // 15 seconds
    
    // More aggressive reconnection for Railway environment
    reconnectInterval: 2000, // 2 seconds
    maxReconnectAttempts: 10,
    
    // Disable server-side document sync messages
    disableServerSync: true,
    
    // Enable client-side content deduplication
    enableClientDeduplication: true
  },
  
  // Document initialization settings
  document: {
    // Prevent multiple initialization attempts
    initializationTimeout: 5000, // 5 seconds
    
    // Enable content validation before initialization
    validateContentBeforeInit: true,
    
    // Disable server-side document state restoration
    disableServerStateRestore: true,
    
    // Enable client-side content reconciliation
    enableContentReconciliation: true
  },
  
  // Collaboration settings for production
  collaboration: {
    // Delay before enabling collaboration to let content settle
    enableDelay: 1000, // 1 second
    
    // Enable content conflict resolution
    enableConflictResolution: true,
    
    // Prefer local content over remote in case of conflicts during initialization
    preferLocalContent: true,
    
    // Enable awareness debouncing for better performance
    awarenessDebounce: 300 // 300ms
  },
  
  // Error handling for production
  errorHandling: {
    // Maximum errors before disabling features
    maxErrors: 3,
    
    // Enable graceful degradation
    enableGracefulDegradation: true,
    
    // Disable problematic features after errors
    disableOnError: true
  },
  
  // Logging settings for production debugging
  logging: {
    enableDebugLogs: true,
    enablePerformanceLogs: true,
    enableErrorLogs: true,
    
    // Prefix for production logs
    logPrefix: '[PROD-YJS]'
  }
};

export default PRODUCTION_YJS_CONFIG;
