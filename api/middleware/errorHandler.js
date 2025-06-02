/**
 * Error Handling Middleware
 * Centralized error handling for the API
 */

/**
 * Error logging middleware
 */
const errorLogger = (err, req, res, next) => {
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  
  next(err);
};

/**
 * Main error handler
 */
const errorHandler = (err, req, res, next) => {
  // Set default error status and message
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
    details = Object.values(err.errors).map(e => e.message);
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    status = 409;
    message = 'Duplicate entry';
    details = 'Resource already exists';
  } else if (err.name === 'MongoNetworkError') {
    status = 503;
    message = 'Database connection error';
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    success: false,
    error: message,
    ...(details && { details }),
    ...(isDevelopment && { stack: err.stack })
  };

  res.status(status).json(errorResponse);
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`
  });
};

/**
 * Async error wrapper for route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorLogger,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
