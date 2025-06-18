/**
 * @fileoverview CodeLab API Server - Fresh Implementation
 * 
 * A clean, modern Express.js server implementation that works exclusively
 * with the new modular architecture. This server replaces all legacy code
 * with modern patterns and provides a solid foundation for the CodeLab API.
 * 
 * Features:
 * - Clean Express server setup with modern middleware
 * - Modular route integration (starting with new session routes)
 * - Real-time Socket.IO collaboration support
 * - Comprehensive error handling and logging
 * - MongoDB connection with Atlas/local fallback
 * - CORS configuration for frontend integration
 * - Security middleware and validation
 * 
 * @version 2.0.0
 * @author CodeLab Development Team
 * @since 2025-06-04
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');

// Import configuration and database
const { config } = require('./config/environment');
const { connectDB } = require('./config/database');

// Import Y-WebSocket server
const YjsWebSocketServer = require('./services/yjsWebSocketServer');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const sessionRoutes = require('./routes/sessions');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const fileRoutes = require('./routes/files'); // Unified file management
const fileVersionRoutes = require('./routes/fileVersions');
const executeRoutes = require('./routes/execute');
// Note: videoTurnRoutes removed - using OpenRelay TURN servers instead

/**
 * CodeLab API Server Class
 * Encapsulates server initialization and configuration
 */
class CodeLabServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    
    // Initialize Y-WebSocket server
    this.yjsServer = new YjsWebSocketServer(this.server);
    
    this.port = config.PORT || 5000;
  }

  /**
   * Configure Express middleware
   */
  setupMiddleware() {
    console.log('🔧 Setting up middleware...');

    // CORS configuration
    const allowedOrigins = [
      config.FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000"
    ];

    // Add production frontend URL if different from FRONTEND_URL
    if (process.env.NODE_ENV === 'production') {
      allowedOrigins.push(
        "https://codecollab-frontend-production.up.railway.app",
        process.env.CORS_ORIGIN
      );
    }

    // Debug CORS origins in production
    if (process.env.NODE_ENV === 'production') {
      console.log('🔍 CORS allowed origins:', allowedOrigins.filter(Boolean));
    }

    this.app.use(cors({
      origin: allowedOrigins.filter(Boolean), // Remove any undefined values
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-session-token']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Cookie parsing middleware for HTTP-only cookies
    this.app.use(cookieParser());

    // Request logging middleware
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`${timestamp} - ${req.method} ${req.path}`);
      next();
    });

    // Enhanced health check endpoint for Railway deployment
    this.app.get('/health', async (req, res) => {
      try {
        // Check database connection
        const { mongoose } = require('mongoose');
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        
        // Basic service checks
        const checks = {
          database: dbStatus,
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            external: Math.round(process.memoryUsage().external / 1024 / 1024)
          },
          uptime: Math.round(process.uptime()),
          version: '2.0.0',
          environment: process.env.NODE_ENV || 'development',
          port: this.port,
          videoSignaling: this.yjsServer ? this.yjsServer.getVideoSignalingStats() : null
        };
        
        // If database is disconnected, return 503
        if (dbStatus === 'disconnected') {
          return res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            checks,
            error: 'Database connection lost'
          });
        }
        
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          checks
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    console.log('✅ Middleware setup complete');
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    console.log('🛣️  Setting up routes...');

    // API root endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        message: 'CodeLab API v2.0 - Clean Architecture',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          auth: '/api/auth',
          users: '/api/users',
          sessions: '/api/sessions',
          files: '/api/files',
          'file-versions': '/api/file-versions',
          'code-execution': '/api/execute',
          docs: '/api/docs'
        }
      });
    });

    // Mount authentication routes
    this.app.use('/api/auth', authRoutes);

    // Mount user profile routes
    this.app.use('/api/users', userRoutes);

    // Mount session routes
    this.app.use('/api/sessions', sessionRoutes);

    // Mount file management routes (unified)
    this.app.use('/api/files', fileRoutes(this.yjsServer));
    this.app.use('/api/file-versions', fileVersionRoutes());

    // Mount code execution routes
    this.app.use('/api/execute', executeRoutes);

    // API documentation endpoint
    this.app.get('/api/docs', (req, res) => {
      res.json({
        title: 'CodeLab API Documentation',
        version: '2.0.0',
        description: 'Modern collaborative coding platform API',
        routes: {
          sessions: {
            base: '/api/sessions',
            methods: ['GET', 'POST', 'PATCH', 'DELETE'],
            features: [
              'Session CRUD operations',
              'Participant management',
              'Real-time collaboration',
              'Activity monitoring'
            ]
          },            files: {
              base: '/api/file-upload',
              methods: ['POST'],
              features: [
                'Y-WebSocket file uploads',
                'ZIP file extraction',
                'Real-time collaboration events'
              ]
            },            'files-yjs': {
              base: '/api/file-upload-yjs',
              methods: ['POST', 'GET'],
              features: [
                'Hybrid MongoDB + Y-WebSocket uploads',
                'Real-time collaboration progress',
                'Enhanced error handling'
              ]
            },
          'file-operations': {
            base: '/api',
            endpoints: ['/get-file', '/by-session', '/hierarchy', '/delete-file'],
            features: [
              'File content retrieval',
              'Session file listing',
              'File hierarchy management'
            ]
          }
        }
      });
    });

    // 404 handler for undefined routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
        availableEndpoints: ['/health', '/api', '/api/sessions', '/api/file-upload', '/api/file-upload-yjs', '/api/docs']
      });
    });

    console.log('✅ Routes setup complete');
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    console.log('🛡️  Setting up error handling...');

    // Use centralized error handler
    this.app.use(errorHandler);

    // Global error handlers
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    console.log('✅ Error handling setup complete');
  }

  /**
   * Start the server
   */
  async start() {
    try {
      console.log('🚀 Starting CodeLab API Server...');
      console.log('═══════════════════════════════════════');

      // Connect to database
      console.log('📊 Connecting to database...');
      await connectDB();
      console.log('✅ Database connection established');      // Setup server components
      this.setupMiddleware();
      this.setupRoutes();
      this.yjsServer.initialize(); // Initialize Y-WebSocket server
      this.setupErrorHandling();

      // Start listening
      this.server.listen(this.port, () => {
        console.log('═══════════════════════════════════════');
        console.log('🎉 CodeLab API Server is running!');
        console.log(`📍 Server URL: http://localhost:${this.port}`);
        console.log(`📊 Database: ${config.DB_NAME}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Frontend URL: ${config.FRONTEND_URL || 'http://localhost:5173'}`);
        console.log('═══════════════════════════════════════');
        console.log('📋 Available endpoints:');
        console.log('   • GET  /health           - Health check');
        console.log('   • GET  /api              - API information');
        console.log('   • GET  /api/docs         - API documentation');
        console.log('   • ALL  /api/sessions/*   - Session management');
        console.log('═══════════════════════════════════════');
        console.log('✨ Ready for collaborative coding!');
      });

    } catch (error) {
      console.error('💥 Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down server...');
    
    // Close Y-WebSocket server
    this.yjsServer.shutdown();
    
    // Close HTTP server
    this.server.close(() => {
      console.log('✅ Server closed');
    });

    // Close database connection
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('✅ Database connection closed');

    process.exit(0);
  }
}

// Initialize and start server
const server = new CodeLabServer();

// Handle shutdown signals
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());

// Start the server
server.start().catch(error => {
  console.error('💥 Server startup failed:', error);
  process.exit(1);
});

// Export for testing
module.exports = { CodeLabServer };