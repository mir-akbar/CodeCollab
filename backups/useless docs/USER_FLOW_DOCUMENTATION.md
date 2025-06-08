# CodeLab - Complete User Flow Documentation

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [User Authentication Flow](#user-authentication-flow)
3. [Session Management Flow](#session-management-flow)
4. [Workspace & Collaboration Flow](#workspace--collaboration-flow)
5. [Real-time Features](#real-time-features)
6. [Architecture Components](#architecture-components)
7. [API Endpoints Reference](#api-endpoints-reference)

---

## 🎯 System Overview

CodeLab is a **real-time collaborative code editor** that enables multiple developers to work together on coding projects simultaneously. The system features AWS Cognito authentication, MongoDB session management, and YJS-powered real-time collaboration.

### Core Technologies
- **Frontend**: React 18 with Monaco Editor (VS Code engine)
- **Backend**: Node.js with Express.js
- **Database**: MongoDB Atlas with secure environment-based configuration
- **Authentication**: AWS Cognito User Pools
- **Real-time**: Socket.IO + YJS (Conflict-free Replicated Data Types)
- **File Management**: GridFS for large files

---

## 🔐 User Authentication Flow

### 1. Account Creation Journey

#### **Step 1: Sign Up Page** (`/signup`)
```
User Journey: Landing Page → Sign Up
Components: SignUpForm, SignUpPage
```

**User Actions:**
1. User navigates to `/signup` or clicks "Create Account" from login
2. Fills out registration form:
   - **Name**: Full name for profile
   - **Email**: Must be valid email (becomes username)
   - **Password**: Must meet security criteria:
     - ✅ At least 8 characters
     - ✅ At least 1 number
     - ✅ At least 1 special character
     - ✅ At least 1 uppercase letter
     - ✅ At least 1 lowercase letter
   - **Confirm Password**: Must match original password

**System Processing:**
```javascript
// src/utils/auth.js - signUp function
signUp(name, email, password, callback) → {
  // Creates CognitoUserAttribute objects
  // Calls userPool.signUp() with AWS Cognito
  // Handles registration errors (email exists, etc.)
}
```

**Validation Flow:**
- Real-time password strength indicators
- Form validation on blur/change events
- Error handling for existing accounts
- Success redirects to verification page

#### **Step 2: Email Verification** (`/verify`)
```
User Journey: Sign Up → Email Verification
Components: VerificationPage
```

**User Actions:**
1. User receives verification email from AWS Cognito
2. Enters 6-digit verification code
3. System validates code against AWS Cognito

**System Processing:**
```javascript
// src/utils/auth.js - confirmUser function
confirmUser(email, code, callback) → {
  // Creates CognitoUser object
  // Calls confirmRegistration() with verification code
  // Handles expired/invalid codes
}
```

**Error Handling:**
- `ExpiredCodeException`: Code has expired
- `CodeMismatchException`: Invalid verification code
- Automatic redirect to login on success

#### **Step 3: Login Process** (`/login`)
```
User Journey: Verification → Login
Components: LoginForm, LoginPage
```

**User Actions:**
1. User enters email and password
2. System authenticates against AWS Cognito
3. Successful login stores tokens and redirects

**System Processing:**
```javascript
// Enhanced Authentication Flow with TanStack Query
// src/hooks/useEnhancedAuth.js - useEnhancedLogin
useEnhancedLogin() → {
  // 1. Authenticates with AWS Cognito using JWT tokens
  // 2. Automatically syncs user data to MongoDB
  // 3. Creates user profile with preferences and statistics
  // 4. Manages session tokens securely
}

// Backend: Cognito JWT Verification + User Sync
// api/middleware/cognitoAuth.js - requireAuth
requireAuth() → {
  // 1. Verifies Cognito JWT token
  // 2. Calls UserSyncService.syncUserFromCognito()
  // 3. Creates/updates user in MongoDB
  // 4. Returns unified user object for session management
}
```

**Enhanced Token & User Management:**
```javascript
// Frontend: Secure token storage + user profile
{
  "accessToken": "JWT_ACCESS_TOKEN",
  "idToken": "JWT_ID_TOKEN",
  "userProfile": {
    "id": "mongodb_user_id",
    "cognitoId": "cognito_sub",
    "email": "user@example.com",
    "displayName": "User Display Name",
    "preferences": {
      "theme": "dark",
      "language": "en",
      "editor": { /* editor preferences */ },
      "notifications": { /* notification settings */ }
    },
    "sessionStats": {
      "sessionsCreated": 5,
      "sessionsJoined": 12,
      "totalCollaborationTime": 7200000
    }
  }
}

// Backend: Automatic User Synchronization
// api/services/userSyncService.js
UserSyncService.syncUserFromCognito() → {
  // 1. Finds or creates user in MongoDB using Cognito ID
  // 2. Syncs custom attributes from Cognito to MongoDB
  // 3. Updates user preferences and profile information
  // 4. Tracks login statistics and last activity
  // 5. Returns unified user object for session management
}
```

**Success Flow:**
- **New Users**: Automatic user creation in MongoDB with default preferences
- **Existing Users**: Profile sync and preference updates from Cognito custom attributes
- **Regular users** → `/sessions` (Session Management Page)
- **Users with pending session invites** → `/workspace?session=ID&access=ENCRYPTED`
- **Real-time preference sync** between frontend, Cognito, and MongoDB

---

## 📊 Session Management Flow

### 2. Session Dashboard Experience

#### **Sessions Page** (`/sessions`)
```
User Journey: Login → Sessions Dashboard
Components: SessionsPage, SessionManager, SessionList
```

**Page Initialization:**
```javascript
// Enhanced Sessions Page with TanStack Query Integration
// src/pages/SessionsPage.jsx
const { data: userProfile } = useUserProfile(); // Automatic user data from enhanced auth
const { data: sessions } = useSessions(); // Real-time session management

// User profile includes MongoDB user data synchronized from Cognito:
userProfile = {
  id: "mongodb_user_id",
  cognitoId: "cognito_sub", 
  email: "user@example.com",
  profile: {
    name: "User Name",
    displayName: "Display Name",
    avatar: { provider: 'generated' }
  },
  preferences: {
    theme: "dark",
    language: "en",
    editor: { /* personalized editor settings */ },
    notifications: { /* notification preferences */ }
  },
  sessionStats: {
    sessionsCreated: 5,
    sessionsJoined: 12,
    totalCollaborationTime: 7200000,
    loginCount: 25
  },
  lastActiveAt: "2024-01-15T10:30:00Z"
}

// Backend User Sync Process
// api/middleware/cognitoAuth.js automatically:
// 1. Verifies Cognito JWT on each request
// 2. Syncs user data between Cognito and MongoDB
// 3. Updates last activity and session statistics
// 4. Provides unified user object for session management
```

**Dashboard Features:**
1. **My Sessions**: Sessions created by the user
2. **Shared Sessions**: Sessions user was invited to
3. **Create New Session**: Button to create sessions
4. **Session Actions**: Invite, Delete, Join workspace

### 3. Session Creation Flow

#### **Create Session Dialog**
```
User Journey: Sessions Page → Create Session Dialog
Components: CreateSessionDialog
```

**User Actions:**
1. User clicks "Create Session" button
2. Fills out session details:
   - **Session Name**: Descriptive name for the project
   - **Description**: Optional project description
   - **Auto-generated Session ID**: Unique identifier

**API Flow:**
```javascript
// src/hooks/useSessions.js - createSession
POST /api/sessions → {
  name: "Project Name",
  description: "Project Description", 
  creator: "user@example.com",
  sessionId: "generated-uuid"
}
```

**Database Storage:**
```javascript
// MongoDB Document Structure
{
  _id: ObjectId,
  sessionId: "unique-session-id",
  name: "Project Name",
  description: "Project Description", 
  creator: "user@example.com",
  createdAt: Date,
  participants: [
    {
      email: "user@example.com",
      role: "owner",
      joinedAt: Date,
      status: "active"
    }
  ]
}
```

### 4. User Profile Management Flow

#### **Enhanced User Profile System**
```
User Journey: Seamless profile sync across Cognito ↔ MongoDB
Components: UserProfile, UserPreferences, UserSyncService
```

**Architecture Overview:**
```javascript
// Three-Layer User Management:
// 1. AWS Cognito: Authentication + Custom Attributes
// 2. MongoDB: Session Management + Statistics + Preferences  
// 3. Frontend: Real-time Profile + TanStack Query Caching

Frontend (React) ↔ MongoDB (Sessions) ↔ AWS Cognito (Auth)
       ↓                    ↓                    ↓
TanStack Query      UserSyncService      JWT Verification
```

**User Profile API Routes:**
```javascript
// Enhanced User Management Endpoints
GET    /api/user/profile          // Get complete user profile with session stats
PUT    /api/user/preferences      // Update user preferences (syncs to Cognito)
GET    /api/user/session-stats    // Get user's collaboration statistics
PUT    /api/user/last-active      // Update user's last activity timestamp

// Example API Response:
{
  "success": true,
  "user": {
    "id": "mongodb_user_id",
    "cognitoId": "cognito_sub",
    "email": "user@example.com",
    "profile": {
      "name": "User Name",
      "displayName": "Display Name",
      "avatar": {
        "provider": "generated",
        "url": null
      }
    },
    "preferences": {
      "theme": "dark",
      "language": "en", 
      "editor": {
        "fontSize": 14,
        "tabSize": 2,
        "wordWrap": true,
        "minimap": true,
        "autoSave": true
      },
      "notifications": {
        "email": true,
        "push": false,
        "sessionInvites": true,
        "sessionUpdates": false
      }
    },
    "subscription": {
      "tier": "free",
      "startDate": "2024-01-01T00:00:00Z",
      "features": ["basic_sessions", "collaboration"]
    },
    "sessionStats": {
      "sessionsCreated": 8,
      "sessionsJoined": 23,
      "totalCollaborationTime": 14400000,
      "loginCount": 47
    },
    "lastActiveAt": "2024-01-15T10:30:00Z",
    "status": "active"
  }
}
```

**User Synchronization Process:**
```javascript
// api/services/userSyncService.js - Core synchronization logic

class UserSyncService {
  // Automatic sync during authentication
  async syncUserFromCognito(cognitoTokenData) {
    // 1. Extract user data from Cognito JWT token
    // 2. Find existing user by cognitoId or create new user
    // 3. Sync custom attributes from Cognito to MongoDB:
    //    - Display name, theme, language preferences
    //    - Editor settings, notification preferences  
    //    - Subscription tier and features
    // 4. Update login statistics and last activity
    // 5. Return unified user object for session management
  }

  // Real-time preference updates
  async updateUserPreferences(userId, preferences) {
    // 1. Update preferences in MongoDB
    // 2. Sync critical preferences back to Cognito custom attributes
    // 3. Invalidate TanStack Query cache for real-time updates
    // 4. Return updated user profile
  }

  // Session statistics tracking
  async getUserSessionStats(userId) {
    // 1. Calculate real-time session statistics
    // 2. Track collaboration time, sessions created/joined
    // 3. Update user activity metrics
    // 4. Return comprehensive statistics object
  }
}
```

**Frontend Integration with TanStack Query:**
```javascript
// src/hooks/useEnhancedAuth.js - User profile management

// Real-time user profile with automatic sync
const { data: userProfile, isLoading } = useUserProfile();

// Update preferences with optimistic updates
const updatePreferencesMutation = useUpdateUserPreferences({
  onSuccess: () => {
    toast.success('Preferences updated successfully');
    // Automatic cache invalidation for real-time UI updates
  }
});

// Session statistics with automatic refresh
const { data: sessionStats } = useSessionStats({
  refetchInterval: 30000, // Refresh every 30 seconds during active sessions
  enabled: !!userProfile?.id
});
```

**Key Features:**
- **Seamless Sync**: Automatic user creation/update in MongoDB during Cognito authentication
- **Preference Management**: Real-time preference sync between Cognito custom attributes and MongoDB  
- **Session Statistics**: Comprehensive tracking of user collaboration metrics
- **Performance**: TanStack Query caching with optimistic updates for instant UI feedback
- **Fallback Handling**: Graceful degradation if sync fails, maintaining user session continuity
- **Security**: JWT token verification with automatic user validation on each request

### 5. Invitation & Collaboration Setup

#### **Invite Users to Session**
```
User Journey: Sessions Page → Invite Dialog → Send Invitations
Components: InviteDialog, ParticipantsList
```

**Role-Based Access Control:**
```javascript
// Role Hierarchy (High to Low):
const roles = {
  "owner": {
    permissions: ["all"],
    canInvite: ["admin", "editor", "viewer"],
    canManage: true
  },
  "admin": { 
    permissions: ["manage_users", "edit", "view"],
    canInvite: ["editor", "viewer"],
    canManage: true
  },
  "editor": {
    permissions: ["edit", "view"], 
    canInvite: ["viewer"],
    canManage: false
  },
  "viewer": {
    permissions: ["view"],
    canInvite: [],
    canManage: false
  }
}
```

**Invitation Methods:**

1. **Email Invitation:**
   ```javascript
   // API: POST /api/sessions/:sessionId/invite
   {
     inviteeEmail: "colleague@example.com",
     role: "editor", 
     inviterEmail: "user@example.com"
   }
   ```

2. **Shareable Link:**
   ```javascript
   // Generated invite link format:
   const inviteLink = `${baseUrl}/workspace?session=${sessionId}&access=${encryptedAccess}`;
   ```

**Permission Validation:**
```javascript
// src/utils/permissionValidation.js
validateInvite(session, inviterEmail, inviteeEmail, role) → {
  // Checks if inviter has permission to assign the role
  // Validates role hierarchy
  // Prevents duplicate invitations
  return { valid: boolean, message: string }
}
```

---

## 💻 Workspace & Collaboration Flow

### 6. Joining a Coding Session

#### **Workspace Entry** (`/workspace`)
```
User Journey: Sessions Page/Invite Link → Workspace
Components: CodeWorkspace, CodeEditor
```

**URL Parameter Processing:**
```javascript
// URL Format: /workspace?session=SESSION_ID&access=ENCRYPTED_ACCESS
const searchParams = new URLSearchParams(location.search);
const sessionId = searchParams.get("session");
const encryptedAccess = searchParams.get("access");
const access = decryptData(encryptedAccess); // "edit" or "view"
```

**Session Validation:**
```javascript
// API: GET /api/sessions/:sessionId?email=user@example.com
// Validates user has access to session
// Returns session details and user role
```

**Access Control Logic:**
```javascript
// Based on access level:
if (access === "edit") {
  setIsEditable(true);  // User can modify code
} else {
  setIsEditable(false); // Read-only mode
}
```

### 7. Workspace Layout & Components

#### **Main Workspace Structure**
```
┌─────────────────────────────────────────────────────────────┐
│ TopNavBar (File Path, Run Code, User Controls)             │
├─────────────────────────────────────────────────────────────┤
│ AppSidebar │ CodeEditorPanel   │ CollaborationPanel         │
│ (File Tree)│ (Monaco Editor)   │ (Chat/Video/Settings)      │
│            │                   │                            │
│            │                   │                            │
│            │                   │                            │
├─────────────────────────────────────────────────────────────┤
│ OutputPanel (Code Execution Results) - Toggleable          │
└─────────────────────────────────────────────────────────────┘
```

#### **Component Responsibilities:**

1. **AppSidebar** (`src/components/app-sidebar.jsx`):
   - File tree navigation
   - File upload/management  
   - Project structure display

2. **CodeEditorPanel** (`src/components/CodeEditorPanel.jsx`):
   - Monaco Editor integration
   - YJS real-time collaboration
   - Syntax highlighting for multiple languages
   - Live cursor tracking

3. **CollaborationPanel** (`src/components/CollaborationPanel.jsx`):
   - **Chat Tab**: Real-time messaging
   - **Video Tab**: WebRTC video calls
   - **Settings Tab**: Collaboration preferences

4. **TopNavBar** (`src/components/TopNavBar.jsx`):
   - Current file path breadcrumb
   - Code execution button
   - User session controls

### 8. File Management System

#### **File Upload & Organization**
```
User Journey: Workspace → Upload Files → File Tree Navigation
API: POST /api/upload
```

**Supported File Types:**
```javascript
const allowedExtensions = [".js", ".java", ".py", ".html", ".css", ".json", ".md"];
```

**File Storage:**
- **Small Files**: Direct MongoDB storage
- **Large Files**: GridFS chunked storage  
- **ZIP Files**: Automatic extraction with progress updates

**File Access Control:**
```javascript
// Permission-based file operations:
if (userRole === "viewer") {
  // Read-only access to all files
} else if (userRole === "editor" || userRole === "admin") {
  // Can upload, modify, and delete files
} else if (userRole === "owner") {
  // Full control including session management
}
```

---

## 🔄 Real-time Features

### 9. YJS Collaborative Editing

#### **Real-time Synchronization Architecture**
```javascript
// src/components/CodeEditorPanel.jsx - YJS Integration
const setupYjsBinding = () => {
  // 1. Create YJS document for file
  const doc = new Y.Doc();
  const ytext = doc.getText('monaco');
  
  // 2. Create SocketIO provider for real-time sync
  const provider = new SocketIOProvider(
    `file-sync-${currentFile}`, // Room name per file
    socket, 
    doc
  );
  
  // 3. Bind YJS to Monaco Editor
  const binding = new MonacoBinding(
    ytext,
    editor.getModel(),
    new Set([editor]),
    provider.awareness
  );
};
```

**Conflict Resolution:**
- **CRDT Technology**: YJS uses Conflict-free Replicated Data Types
- **Operational Transform**: Intelligent merge of simultaneous edits
- **Character-level Sync**: Changes propagated at character level
- **No Content Duplication**: Fixed previous array accumulation issues

#### **Live Cursor & User Presence**
```javascript
// Cursor tracking implementation:
editor.onDidChangeCursorPosition(() => {
  if (provider.awareness) {
    provider.awareness.setLocalStateField('cursor', {
      anchor: { lineNumber, column },
      head: { lineNumber, column }
    });
  }
});
```

**User Awareness Display:**
- **Live Cursors**: See where teammates are editing
- **User Colors**: Unique color per user
- **User Names**: Display next to cursors
- **Status Indicators**: Active/idle/offline states

### 10. Real-time Communication

#### **Integrated Chat System**
```
Components: ChatPanel, CollaborationPanel
WebSocket Events: sendMessage, receiveMessage
```

**Chat Features:**
- **Session-scoped**: Messages tied to specific sessions
- **User Attribution**: Messages show sender name/email
- **Persistent History**: Messages stored during session
- **Real-time Delivery**: Instant message propagation

**Chat Implementation:**
```javascript
// src/components/ChatPanel.jsx
const handleSendMessage = () => {
  const message = {
    sender: userEmail.replace("@gmail.com", ""),
    content: newMessage.trim(),
    sessionId: session,
    timestamp: Date.now()
  };
  
  socket.emit("sendMessage", message);
};
```

#### **Video Calling Integration**
```
Components: VideoPanel
Technology: WebRTC (planned feature)
```

**Video Features** (Future Implementation):
- **Peer-to-peer**: Direct WebRTC connections
- **Screen Sharing**: Share editor or entire screen
- **Audio/Video Toggle**: Flexible communication options

---

## 🏗️ Architecture Components

### 10. Authentication & Session Middleware

#### **Route Protection**
```javascript
// src/components/PrivateRoute.jsx
const PrivateRoute = ({ children }) => {
  const isAuth = isAuthenticated();
  return isAuth ? children : <Navigate to="/login" />;
};
```

**API Authentication Middleware:**
```javascript
// api/middleware/auth.js
const requireAuth = (req, res, next) => {
  const userEmail = req.body.email || req.query.email || req.headers['x-user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: 'User authentication required' });
  }
  req.userEmail = userEmail;
  next();
};
```

#### **Session Access Validation**
```javascript
const validateSessionAccess = async (req, res, next) => {
  const { sessionId } = req.params;
  const userEmail = req.body.email || req.query.email;
  
  // Check if user has access to the session
  const accessResult = await sessionService.checkSessionAccess(sessionId, userEmail);
  
  if (!accessResult.hasAccess) {
    return res.status(403).json({ error: 'Access denied to this session' });
  }
  
  next();
};
```

### 11. Database Architecture

#### **MongoDB Collections Structure**

**Sessions Collection:**
```javascript
{
  _id: ObjectId,
  sessionId: String, // Unique session identifier
  name: String,      // Human-readable session name
  description: String,
  creator: String,   // Email of session creator
  createdAt: Date,
  updatedAt: Date,
  participants: [
    {
      email: String,
      role: String,    // "owner", "admin", "editor", "viewer"
      joinedAt: Date,
      status: String,  // "active", "invited", "left"
      lastActive: Date
    }
  ],
  settings: {
    isPublic: Boolean,
    allowInvites: Boolean,
    maxParticipants: Number
  }
}
```

**Files Collection (GridFS):**
```javascript
{
  _id: ObjectId,
  filename: String,
  sessionId: String,
  uploadedBy: String,
  uploadedAt: Date,
  fileSize: Number,
  mimeType: String,
  metadata: {
    directory: String,
    language: String,
    version: Number
  }
}
```

#### **Session Service Layer**
```javascript
// api/services/session/ModularSessionService.js
class SessionService {
  async checkSessionAccess(sessionId, userEmail) {
    // Validates user permission to access session
    // Returns { hasAccess: boolean, role: string, access: string }
  }
  
  async updateLastActive(sessionId, userEmail) {
    // Updates user's last active timestamp
  }
  
  async addParticipant(sessionId, email, role, inviterEmail) {
    // Adds new participant with role validation
  }
}
```

### 12. Real-time Infrastructure

#### **Socket.IO Event System**
```javascript
// Server-side events (api/socket-handlers/):
socket.on('code-change', handleCodeChange);
socket.on('cursor-move', handleCursorMove);
socket.on('file-change', handleFileChange);
socket.on('sendMessage', handleMessage);
socket.on('register-user', handleUserRegistration);
```

**YJS Backend Integration:**
```javascript
// YJS room management per file:
const yjsRooms = new Map();

const getOrCreateRoom = (roomName) => {
  if (!yjsRooms.has(roomName)) {
    yjsRooms.set(roomName, {
      doc: new Y.Doc(),
      connections: new Set()
    });
  }
  return yjsRooms.get(roomName);
};
```

---

## 📡 API Endpoints Reference

### Authentication Endpoints
```
POST /api/auth/login          - User login
POST /api/auth/logout         - User logout  
POST /api/auth/verify         - Email verification
GET  /api/auth/status         - Check auth status
```

### Session Management Endpoints
```
GET    /api/sessions                    - Get user's sessions
POST   /api/sessions                    - Create new session
GET    /api/sessions/:sessionId         - Get session details
DELETE /api/sessions/:sessionId         - Delete session
POST   /api/sessions/:sessionId/invite  - Invite user to session
POST   /api/sessions/:sessionId/leave   - Leave session
GET    /api/sessions/check-access       - Validate session access
```

### File Management Endpoints
```
POST   /api/upload                      - Upload files to session
GET    /api/files/:sessionId            - Get session files
DELETE /api/files/:sessionId/:fileId    - Delete file
GET    /api/files/versions/:fileId      - Get file versions
```

### Real-time Endpoints
```
POST   /api/sessions/active-users       - Get active session users
POST   /api/sessions/update-activity    - Update user activity
GET    /api/sessions/health             - Health check
```

### Code Execution Endpoints
```
POST   /api/execute/run                 - Execute code
GET    /api/execute/languages           - Get supported languages
POST   /api/execute/stop                - Stop execution
```

---

## 🔧 Development & Deployment

### Environment Configuration
```javascript
// Required environment variables:
VITE_AWS_COGNITO_USER_POOL_ID=your_user_pool_id
VITE_AWS_COGNITO_CLIENT_ID=your_client_id  
VITE_API_URL=http://localhost:5000
MONGODB_URI=mongodb+srv://your_connection_string
```

### Security Features
- **Environment-based Config**: No hardcoded credentials
- **Encrypted Session Data**: CryptoJS encryption for session links
- **Role-based Authorization**: Granular permission system
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured CORS policies

### Performance Optimizations
- **YJS CRDT**: Eliminates content duplication in collaborative editing
- **MongoDB Indexing**: Optimized queries for session lookup
- **Socket.IO Rooms**: Isolated communication channels per session
- **File Chunking**: GridFS for large file handling
- **Connection Pooling**: Efficient database connections

---

## 🎯 User Experience Summary

### Complete User Journey:
1. **Discovery**: User visits landing page → Signs up for account
2. **Verification**: Confirms email → Completes account setup  
3. **Authentication**: Logs in → Redirected to sessions dashboard
4. **Session Creation**: Creates new session or joins existing one
5. **Collaboration Setup**: Invites team members with appropriate roles
6. **Development Work**: Real-time collaborative coding with live features
7. **Communication**: Integrated chat and future video calling
8. **Project Management**: File organization and version control

### Key User Benefits:
- **Zero-Setup Collaboration**: No local software installation required
- **Real-time Synchronization**: See changes instantly across all users
- **Role-based Security**: Granular control over session access
- **Professional Development Environment**: VS Code-quality editing experience
- **Integrated Communication**: Chat and video calling within the workspace
- **Cross-platform Compatibility**: Works on any device with a web browser

---

*This documentation covers the complete user flow through CodeLab's collaborative coding platform. For technical implementation details, refer to the source code in the respective component and API directories.*
