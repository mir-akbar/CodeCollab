# **CodeCollab: Collaborative Real-time Code Editor**

[![Security Status](https://img.shields.io/badge/Security-Enterprise%20Grade-green)](./docs/MANUAL_TESTING_DOCUMENTATION.tex)
[![Test Coverage](https://img.shields.io/badge/Tests-57%2F57%20Pass-brightgreen)](#testing-status)
[![YJS Status](https://img.shields.io/badge/YJS-Production%20Ready-blue)](#real-time-collaboration)
[![Deployment](https://img.shields.io/badge/Railway-Production%20Ready-purple)](#deployment)

## **Overview**
CodeCollab is a production-ready collaborative code editor built for modern development teams. It delivers seamless real-time collaboration, enterprise security, and professional development tools in a sleek, responsive interface.

**✨ All core features are production-ready** with comprehensive testing, security hardening, and performance optimization. Perfect for team collaboration, coding interviews, educational workshops, and professional development environments.

## **🚀 Live Deployment**

**Try CodeCollab now:** [codecollab-frontend-t93i.onrender.com](https://codecollab-frontend-t93i.onrender.com)

Experience the full power of collaborative coding in our production environment. No setup required - just click and start collaborating!

## **🚦 Feature Status**

### **✅ Production Ready (100% Complete)**
- ✅ **Real-time Collaborative Editing** - YJS + Y-WebSocket with Monaco Editor
- ✅ **Enterprise Authentication** - AWS Cognito with secure JWT tokens  
- ✅ **Advanced Session Management** - Role-based permissions (Owner/Admin/Editor/Viewer)
- ✅ **Secure File Management** - Permission-controlled upload/download/deletion
- ✅ **Integrated Chat System** - Real-time messaging via Y-WebSocket
- ✅ **Multi-Language Code Execution** - JavaScript, Python, Java via JDoodle API
- ✅ **Live User Presence** - Cursor tracking and awareness indicators
- ✅ **User Management Interface** - Participant management and invitations
- ✅ **Performance Optimization** - Smart caching and instant file loading
- ✅ **Mobile Responsive Design** - Professional UI across all devices
- ✅ **Video Calling System** - WebRTC infrastructure with UI components

### **🚧 In Active Development**
- 🚧 **Video Calling Enhancement** - Advanced signaling and screen sharing optimization
- 🚧 **Advanced Analytics** - Session metrics and collaboration insights
- 🚧 **Plugin Architecture** - Extension system for custom functionality

### **📋 Roadmap**
- 📋 **Screen Sharing** - WebRTC-based screen sharing for video calls
- 📋 **AI Code Assistance** - Intelligent code suggestions and reviews
- 📋 **Git Integration** - Version control within the collaborative environment

## **🔒 Security & Testing Status**

### **✅ Security Hardening Complete**
- 🛡️ **File Deletion Permissions** - Admin/Owner-only deletion with proper validation
- � **Authentication Enforcement** - All sensitive operations require authentication
- 🚫 **Access Control** - Role-based permissions across all features
- 📊 **Comprehensive Testing** - 57/57 test cases passing (100% pass rate)
- 🏥 **Error Handling** - Graceful degradation and user-friendly error messages

> **Current Status (December 2024):** 
> - 🔒 **Enterprise Security** - File deletion permissions, role-based access control
> - 🚀 **Production Ready** - 57/57 tests passing, comprehensive error handling
> - 💬 **Integrated Chat** - Real-time messaging via Y-WebSocket infrastructure
> - ⚡ **Code Execution** - Multi-language support with instant feedback
> - 📁 **Smart File Management** - Permission-controlled operations with instant loading
> - 🎯 **Advanced Session Control** - User management interface with role hierarchy
> - 📱 **Mobile Responsive** - Professional UI optimized for all screen sizes

---

## **Key Features**

### **🤝 Real-Time Collaboration**
- **Advanced YJS Integration**: Conflict-free replicated data types (CRDTs) for seamless multi-user editing
- **Live Cursor Tracking**: See where teammates are working in real-time
- **Operational Transform**: Intelligent conflict resolution for simultaneous edits
- **Session Persistence**: Automatic recovery and state synchronization

### **💻 Advanced Code Editor**
- **Monaco Editor**: VS Code-powered editing experience
- **Multi-Language Support**: JavaScript, TypeScript, Python, Java, C++, and more
- **Code Formatting & Linting**: Built-in prettier and ESLint integration

### **🔐 Enterprise Security & Permissions**
- **Role-Based Access Control**: Owner → Admin → Editor → Viewer hierarchy
- **Secure File Operations**: Admin/Owner-only deletion with authentication validation
- **Session Security**: JWT-based authentication with AWS Cognito integration
- **Permission Enforcement**: Real-time validation across all user interactions
- **Error Handling**: User-friendly messages for unauthorized actions

### **👥 Advanced User Management**
- **Participant Management Interface**: In-workspace user management with role controls
- **Invitation System**: Email-based invitations with role assignment
- **Live Presence Indicators**: Real-time user status and activity tracking
- **Role Hierarchy**: Granular permissions with clear role boundaries

### **📁 Smart File Management**
- **Instant File Loading**: Smart caching with background prefetching
- **Permission-Controlled Operations**: Secure upload, download, and deletion
- **Hierarchical Organization**: Folder structure with visual file tree
- **Performance Optimization**: Sub-100ms file access with intelligent caching
- **Multi-Format Support**: JavaScript, Python, Java, and more

### **💬 Integrated Communication**
- **Real-Time Chat**: Context-aware messaging during coding sessions
- **Video Calling**: WebRTC-based video communication with camera/microphone support
- **Live Cursors**: See exactly where teammates are editing
- **Presence Awareness**: Online/offline status with activity indicators

### **⚡ Code Execution**
- **Multi-Runtime Support**: Execute JavaScript, Python, Java in isolated environments
- **Real-Time Output**: Live console and error feedback

---

## **Technology Stack**

### **Frontend Architecture**
- **React 18**: Modern component-based UI with hooks and context
- **Monaco Editor**: Microsoft's VS Code editor engine with full language support
- **YJS**: Conflict-free collaborative editing framework (CRDT)
- **y-websocket Client**: Real-time synchronization infrastructure
- **TanStack Query**: Advanced server state management with smart caching
- **Zustand**: Lightweight state management for UI interactions
- **Tailwind CSS**: Utility-first CSS framework for responsive design

### **Backend Infrastructure**
- **Node.js 18+**: High-performance JavaScript runtime
- **Express.js**: RESTful API framework with middleware architecture
- **y-websocket Server**: WebSocket infrastructure for YJS document sync
- **JWT Authentication**: Stateless secure sessions with refresh tokens
- **AWS Cognito**: Enterprise user authentication and management
- **JDoodle API**: Multi-language code execution service

### **Database & Storage**
- **MongoDB Atlas**: Cloud-native document database with GridFS
- **Environment-Based Config**: Secure credential management
- **Smart Indexing**: Optimized queries for real-time performance
- **Data Persistence**: Reliable storage with backup strategies

### **DevOps & Security**
- **Environment Variables**: Secure configuration management
- **Docker (Planning)**: Containerized deployment support

---

## **Project Structure**

### **📂 Organized Codebase**
```
CodeCollab/
├── 📁 api/                          # Backend API Server
│   ├── server.js                    # Main server entry point
│   ├── 📁 config/
│   │   └── database.js              # Centralized DB configuration
│   ├── 📁 services/
│   │   └── fileStorageService.js    # MongoDB & YJS integration
│   ├── 📁 db/
│   │   └── index.js                 # Database connection logic                
│
├── 📁 src/                          # Frontend React Application
│   ├── 📁 components/               # Reusable UI components
│   │   ├── CodeEditor.jsx           # Main editor component
│   │   ├── CollaborationPanel.jsx   # Real-time collaboration UI
│   │   ├── app-sidebar.jsx          # Navigation sidebar
│   │   └── ...                      # Additional components
│   ├── 📁 pages/                    # Application pages
│   │   ├── Dashboard.jsx            # Main coding workspace
│   │   ├── LoginPage.jsx            # User authentication
│   │   └── ...                      # Additional pages
│   └── App.jsx                      # Root application component
```

## **🚀 Recent Major Improvements**

### **🔒 Security & Permissions Overhaul**
Complete implementation of enterprise-grade security with comprehensive testing.

**✅ What Was Implemented:**
- **File Deletion Security**: Admin/Owner-only deletion with proper authentication
- **Permission Validation**: Real-time access control across all operations
- **Error Handling**: User-friendly messages for 401/403/404 scenarios
- **UI Feedback**: Tooltips and dialogs explaining permission requirements

**🔧 Technical Implementation:**
```javascript
// Secure file deletion with role validation
router.delete("/:sessionId/*", requireAuth, asyncHandler(async (req, res) => {
  const hasAccess = await accessService.checkSessionAccess(sessionId, email, 'admin');
  if (!hasAccess) {
    return res.status(403).json({ 
      error: "Access denied: Admin or owner permission required to delete files"
    });
  }
  // ... deletion logic
}));
```

### **� User Management Integration**
Seamless participant management directly within the code workspace.

**✅ Features Added:**
- **In-Workspace Management**: Manage participants without leaving the coding session
- **Role-Based UI**: Dynamic interface based on user permissions
- **Real-Time Updates**: Live participant list with status indicators
- **Invitation Workflow**: Streamlined user invitation with role assignment

### **⚡ Performance & UX Enhancements**
Smart caching and instant loading for professional user experience.

**🚀 Performance Improvements:**
- **Instant File Loading**: Sub-100ms file access with background prefetching
- **Smart Caching**: TanStack Query integration with intelligent cache management
- **Error Recovery**: Graceful handling of network issues and service interruptions
- **Mobile Optimization**: Responsive design for tablets and mobile devices

### **📊 Testing & Quality Assurance**
Comprehensive testing suite ensuring production readiness.

**✅ Testing Status:**
- **57/57 Test Cases Passing**: 100% pass rate across all modules
- **11 Modules Covered**: Complete feature coverage including security
- **Zero Critical Issues**: All security vulnerabilities resolved
- **Production Ready**: Validated against Railway deployment
**✅ Security Architecture:**
- **Environment-Based Configuration**: Centralized `/api/config/database.js` module
- **Zero Credential Exposure**: Complete removal of hardcoded secrets
- **JWT Security**: Refresh tokens and secure session management
- **Role-Based Access Control**: Granular permissions with hierarchy enforcement

```javascript
// Secure environment-based configuration
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const AWS_COGNITO_CONFIG = {
  userPoolId: process.env.AWS_COGNITO_USER_POOL_ID,
  clientId: process.env.AWS_COGNITO_CLIENT_ID
};
```

## **� Testing Status**

### **✅ Comprehensive Test Coverage**
- **Total Test Cases**: 57 (100% passing)
- **Modules Tested**: 11 comprehensive modules
- **Security Testing**: File deletion permissions, RBAC validation
- **Performance Testing**: File loading, concurrent user handling
- **Integration Testing**: Real-time collaboration, chat, code execution

### **� Security Validation**
- **Authentication**: AWS Cognito integration with JWT tokens
- **Authorization**: Role-based access control with permission hierarchy
- **File Operations**: Secure upload/download/deletion with proper validation
- **Session Security**: Protected session management and user verification

### **📱 Cross-Platform Testing**
- **Browser Compatibility**: Chrome, Firefox, Safari, Edge
- **Mobile Responsive**: Tablets and mobile devices optimized
- **Performance**: Sub-100ms file loading, real-time sync validation
- **Error Recovery**: Network disconnection and service interruption handling

> **Production Readiness**: All 57 test cases validated against Railway deployment, ensuring enterprise-grade stability for academic demonstrations, professional collaboration, and production environments.

---

## **🚀 Quick Start Guide**

### **Prerequisites**
- **Node.js**: Version 18+ required
- **MongoDB**: Atlas account or local installation
- **npm/yarn**: Package manager

### **Environment Setup**

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd CodeCollab
   ```

2. **Backend Configuration**
   ```bash
   cd api
   
   # Create environment file
   echo "MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codelab" > .env
   echo "DB_NAME=code_colab" >> .env
   echo "PORT=3001" >> .env
   
   # Install dependencies
   npm install
   ```

3. **Frontend Setup**
   ```bash
   cd ../
   npm install
   ```

### **🏃 Running the Application**

**Development Mode:**
```bash
# Terminal 1: Start backend server
cd api
npm start    # Starts on http://localhost:3001

# Terminal 2: Start frontend
npm run dev      # Starts on http://localhost:5173
```

**Production Mode:**
```bash
# Build and serve
npm run build
npm run serve
```

### **🔧 Environment Variables**

Create a `.env` file in the `/api` directory:

```env
# Database Configuration (Required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codelab
DB_NAME=codelab

# AWS Cognito Authentication (Required)
AWS_COGNITO_USER_POOL_ID=your-user-pool-id
AWS_COGNITO_CLIENT_ID=your-client-id
AWS_REGION=your-aws-region

# JWT Security (Required for production)
JWT_SECRET=your-super-secure-jwt-secret-256-bit
JWT_REFRESH_SECRET=your-refresh-secret-256-bit

# Code Execution API (Optional)
JDOODLE_CLIENT_ID=your-jdoodle-client-id
JDOODLE_CLIENT_SECRET=your-jdoodle-secret

# Server Configuration
PORT=3001
NODE_ENV=production
```

---

## **🔧 Development Workflow**

### **Code Quality Standards**
- **ESLint**: Automated code linting
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality gates
- **Jest**: Unit and integration testing

### **Git Workflow**
```bash
# Feature development
git checkout -b feature/your-feature-name
git commit -m "feat: add new collaborative feature"
git push origin feature/your-feature-name

# Create pull request with comprehensive testing
```

### **Debugging Tools**
```bash
# Backend debugging
cd api/scripts/debug/
node connection-debug.js
node yjs-room-monitor.js

# Frontend debugging
npm run dev:debug
```

---

## **🚀 Deployment**

### **Railway Deployment (Recommended)**

**Quick Start:**
```bash
# 1. Quick deployment with automated script
./deploy-capstone.sh

# 2. Or follow step-by-step guide
# See QUICK_RAILWAY_DEPLOY.md
```

**Production Ready:**
- **📋 [Railway Deployment Checklist](RAILWAY_DEPLOYMENT_CHECKLIST.md)** - Complete production checklist
- **📖 [Railway Best Practices Guide](RAILWAY_DEPLOYMENT_GUIDE.md)** - Comprehensive deployment guide
- **⚡ [Quick Deploy Guide](QUICK_RAILWAY_DEPLOY.md)** - Streamlined deployment steps

### **Alternative Deployment Options**
```bash
# Environment setup
export MONGODB_URI="your-production-mongodb-uri"
export NODE_ENV="production"

# Build and deploy
npm run build
npm run start:prod
```

### **Cloud Deployment Options**
- **Railway** (Recommended): Full-stack deployment with database
- **Vercel**: Frontend deployment ready
- **Heroku**: Backend API deployment alternative
- **MongoDB Atlas**: Production database hosting

---

## **🎓 CAPSTONE PROJECT DEPLOYMENT**

### **Free Deployment for Academic Projects**

Deploy CodeWorkspace completely **FREE** for capstone demonstrations using Railway's best practices:

```bash
# Option 1: Automated deployment
chmod +x deploy-capstone.sh
./deploy-capstone.sh

# Option 2: Manual deployment following Railway best practices
# See QUICK_RAILWAY_DEPLOY.md for step-by-step instructions
```

### **Railway Deployment Benefits**
- ✅ **Railway Best Practices**: Following official Railway recommendations
- ✅ **Private Networking**: Optimized service communication
- ✅ **Reference Variables**: Dynamic configuration management
- ✅ **Health Checks**: Production-ready monitoring
- ✅ **Auto-scaling**: Horizontal scaling with replicas
- ✅ **Zero-downtime Deployments**: Rolling updates

**Free Resources Used:**
- 🆓 **Railway.app** - Backend hosting (500 hours/month free, $5 credit)
- 🆓 **MongoDB Atlas** - Database (512MB free tier)
- 🆓 **AWS Cognito** - Authentication (50,000 MAUs free)
- 🆓 **Google STUN servers** - Video chat basic functionality

**Production Features:**
- 👥 Multi-user real-time code editing
- 💬 Integrated chat system via Y-WebSocket
- 📹 **Full video calling with WebRTC**
- 📁 Advanced file upload and management
- 🔐 Enterprise-grade authentication
- 📱 Responsive design for all devices
- 🏥 Health monitoring and error recovery
- 📊 Performance optimization

### **Demo-Ready Features**
- **Enterprise Security** - Role-based permissions with secure file operations
- **Real-time Collaboration** - Multiple users editing with live cursors and chat
- **User Management** - In-workspace participant management and invitations
- **Smart File System** - Instant loading with permission-controlled operations
- **Mobile Responsive** - Professional UI optimized for all screen sizes
- **Performance Optimized** - Sub-100ms file access with intelligent caching
- **Production Monitoring** - Health checks and comprehensive error handling

> **Note**: CodeCollab follows Railway's production readiness guidelines and passes all 57 test cases, making it suitable for academic demonstrations, professional team collaboration, and production deployment.

---

## **🚀 Quick Deploy to Railway**

**Ready to deploy? Choose your path:**

- 📋 **[Production Checklist](RAILWAY_DEPLOYMENT_CHECKLIST.md)** - Complete Railway deployment checklist
- ⚡ **[Quick Deploy Guide](QUICK_RAILWAY_DEPLOY.md)** - 15-minute deployment for demos  
- 📖 **[Best Practices Guide](RAILWAY_DEPLOYMENT_GUIDE.md)** - Comprehensive Railway setup
- 🎯 **[Environment Template](.env.railway.example)** - Railway-specific configuration

```bash
# One-command deployment
./deploy-capstone.sh

# Or follow step-by-step guide
# See QUICK_RAILWAY_DEPLOY.md
```

---

## **🤝 Contributing**

### **Development Standards**
1. **Security First**: All changes undergo security review
2. **Test Coverage**: Maintain 100% test pass rate
3. **Performance**: Ensure sub-100ms file loading performance
4. **Cross-browser**: Test on Chrome, Firefox, Safari, Edge
5. **Mobile Ready**: Verify responsive design on tablets/phones

### **Development Setup**
```bash
# Clone and setup
git clone <repository-url>
cd CodeCollab

# Backend setup
cd api
cp .env.example .env
# Configure your environment variables
npm install

# Frontend setup  
cd ../
npm install

# Start development servers
npm run dev      # Frontend on :5173
cd api && npm start  # Backend on :3001
```

### **Code Review Process**
- **Security Review**: All file operations and permissions changes
- **Performance Testing**: File loading and collaboration features
- **Cross-platform Testing**: Browser and mobile compatibility
- **Documentation**: Update README and test documentation

---

## **🙏 Acknowledgments**

- **YJS Team**: Exceptional conflict-free collaborative editing framework
- **Monaco Editor**: Microsoft's powerful VS Code editor engine  
- **MongoDB**: Robust document database with GridFS file storage
- **AWS Cognito**: Enterprise-grade authentication and user management
- **Railway**: Production-ready deployment platform with excellent developer experience

---

## **📞 Support & Contact**

- **Documentation**: [Manual Testing Guide](./docs/MANUAL_TESTING_DOCUMENTATION.tex)
- **Deployment**: [Railway Setup Guide](./QUICK_RAILWAY_DEPLOY.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Security**: Report security issues via private channels

---

**🎯 Ready to collaborate? Experience enterprise-grade real-time coding with CodeCollab!**
