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
const { Server } = require('socket.io');

// Import configuration and database
const { config } = require('./config/environment');
const { connectDB } = require('./config/database');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const sessionRoutes = require('./routes/sessions');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

/**
 * CodeLab API Server Class
 * Encapsulates server initialization and configuration
 */
class CodeLabServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: [
          config.FRONTEND_URL || "http://localhost:5173",
          "http://localhost:5173",
          "http://localhost:3000",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:3000"
        ],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        credentials: true
      }
    });
    this.port = config.PORT || 5000;
  }

  /**
   * Configure Express middleware
   */
  setupMiddleware() {
    console.log('🔧 Setting up middleware...');

    // CORS configuration
    this.app.use(cors({
      origin: [
        config.FRONTEND_URL || "http://localhost:5173",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
      ],
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

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development'
      });
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
          user: '/api/user',
          sessions: '/api/sessions',
          docs: '/api/docs'
        }
      });
    });

    // Mount authentication routes
    this.app.use('/api/auth', authRoutes);

    // Mount user profile routes
    this.app.use('/api/user', userRoutes);

    // Mount session routes
    this.app.use('/api/sessions', sessionRoutes);

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
          }
        }
      });
    });

    // 404 handler for undefined routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
        availableEndpoints: ['/health', '/api', '/api/sessions', '/api/docs']
      });
    });

    console.log('✅ Routes setup complete');
  }

  /**
   * Setup Socket.IO for real-time collaboration
   */
  setupSocketIO() {
    console.log('🔌 Setting up Socket.IO...');

    // Connection handling
    this.io.on('connection', (socket) => {
      console.log(`👤 User connected: ${socket.id}`);

      // Join session room
      socket.on('join-session', (sessionId) => {
        socket.join(`session-${sessionId}`);
        console.log(`🏠 User ${socket.id} joined session ${sessionId}`);
        
        // Notify other participants
        socket.to(`session-${sessionId}`).emit('user-joined', {
          userId: socket.id,
          timestamp: new Date().toISOString()
        });
      });

      // Leave session room
      socket.on('leave-session', (sessionId) => {
        socket.leave(`session-${sessionId}`);
        console.log(`🚪 User ${socket.id} left session ${sessionId}`);
        
        // Notify other participants
        socket.to(`session-${sessionId}`).emit('user-left', {
          userId: socket.id,
          timestamp: new Date().toISOString()
        });
      });

      // Handle real-time code changes
      socket.on('code-change', (data) => {
        const { sessionId, changes } = data;
        socket.to(`session-${sessionId}`).emit('code-update', {
          changes,
          userId: socket.id,
          timestamp: new Date().toISOString()
        });
      });

      // Handle cursor position updates
      socket.on('cursor-move', (data) => {
        const { sessionId, position } = data;
        socket.to(`session-${sessionId}`).emit('cursor-update', {
          position,
          userId: socket.id,
          timestamp: new Date().toISOString()
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`👋 User disconnected: ${socket.id}`);
      });
    });

    console.log('✅ Socket.IO setup complete');
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
      console.log('✅ Database connection established');

      // Setup server components
      this.setupMiddleware();
      this.setupRoutes();
      this.setupSocketIO();
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
    
    // Close Socket.IO
    this.io.close();
    
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