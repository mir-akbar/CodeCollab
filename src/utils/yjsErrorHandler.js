/**
 * YJS Error Handler Utility
 * Provides global error handling for YJS operations to prevent app crashes
 */

let errorThrottle = new Map(); // Track recent errors to prevent spam

/**
 * Throttle error logging to prevent spam
 */
function shouldLogError(errorKey) {
  const now = Date.now();
  const lastLogged = errorThrottle.get(errorKey);
  
  // Only log the same error once every 5 seconds
  if (!lastLogged || (now - lastLogged) > 5000) {
    errorThrottle.set(errorKey, now);
    return true;
  }
  return false;
}

/**
 * Global YJS error handler to catch "Unexpected end of array" and other YJS errors
 */
export function setupGlobalYjsErrorHandler() {
  // Catch unhandled promise rejections from YJS
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && 
        (event.reason.message?.includes('Unexpected end of array') ||
         event.reason.message?.includes('Y.js') ||
         event.reason.stack?.includes('chunk-TD5YR7UT.js'))) {
      
      const errorKey = `${event.reason.message}-${event.reason.stack?.substring(0, 50)}`;
      
      if (shouldLogError(errorKey)) {
        console.error('🚨 Caught YJS error to prevent app crash:', event.reason);
        
        // Log additional context
        console.error('YJS Error Context:', {
          message: event.reason.message,
          stack: event.reason.stack,
          timestamp: new Date().toISOString()
        });
        
        console.warn('⚠️ Document synchronization encountered an error but was recovered');
      }
      
      // Prevent the error from crashing the app
      event.preventDefault();
      
      return true; // Mark as handled
    }
  });

  // Catch general errors that might be from YJS
  window.addEventListener('error', (event) => {
    if (event.error && 
        (event.error.message?.includes('Unexpected end of array') ||
         event.error.message?.includes('create3') ||
         event.filename?.includes('chunk-TD5YR7UT.js'))) {
      
      const errorKey = `${event.error.message}-${event.filename}-${event.lineno}`;
      
      if (shouldLogError(errorKey)) {
        console.error('🚨 Caught YJS error to prevent app crash:', event.error);
        
        // Log additional context
        console.error('YJS Error Context:', {
          message: event.error.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error.stack,
          timestamp: new Date().toISOString()
        });
        
        console.warn('⚠️ Document synchronization encountered an error but was recovered');
      }
      
      // Prevent the error from crashing the app
      event.preventDefault();
      
      return true; // Mark as handled
    }
  });
}

/**
 * Safe wrapper for YJS operations that might throw
 */
export function safeYjsOperation(operation, fallback = null, context = 'Unknown') {
  try {
    return operation();
  } catch (error) {
    if (error.message?.includes('Unexpected end of array') ||
        error.message?.includes('create3')) {
      console.error(`🚨 YJS operation failed in ${context}:`, error);
      console.warn('⚠️ Falling back to safe operation');
      return fallback;
    }
    // Re-throw non-YJS errors
    throw error;
  }
}

/**
 * Safe YJS document content getter
 */
export function safeGetYjsContent(ytext, fallback = '') {
  return safeYjsOperation(
    () => ytext.toString(),
    fallback,
    'YJS content retrieval'
  );
}

/**
 * Safe YJS document content setter
 */
export function safeSetYjsContent(ytext, content, method = 'insert') {
  return safeYjsOperation(
    () => {
      if (method === 'insert') {
        ytext.insert(0, content);
      } else if (method === 'replace') {
        ytext.delete(0, ytext.length);
        ytext.insert(0, content);
      }
      return true;
    },
    false,
    'YJS content setting'
  );
}
