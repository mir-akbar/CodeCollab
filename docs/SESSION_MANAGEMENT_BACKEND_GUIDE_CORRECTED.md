# Session Management Backend Guide - Corrected

## Overview

This guide provides accurate documentation for the session management backend system based on the actual codebase implementation. The system uses a controller-service pattern with Express.js routes, MongoDB, and email-based authentication.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints](#api-endpoints)
3. [Authentication & Middleware](#authentication--middleware)
4. [Database Schema](#database-schema)
5. [Error Handling](#error-handling)
6. [Frontend Integration](#frontend-integration)
7. [Complete Backend File Structure](#complete-backend-file-structure)

## Architecture Overview

### System Components

- **Controller Pattern**: Uses `SessionController` class with asyncHandler middleware
- **Service Layer**: `SessionService` handles business logic
- **Authentication**: Email-based via `x-user-email` header
- **Response Format**: Consistent `{success: boolean, ...}` structure
- **Middleware**: `requireAuth`, `validateSessionAccess`, `validateSessionCreation`, `validateSessionInvitation`

### Technology Stack

- **Backend Framework**: Express.js with asyncHandler middleware
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Header-based email authentication (`x-user-email`)
- **Validation**: Custom validation middleware
- **Error Handling**: Centralized asyncHandler wrapper

## API Endpoints

All API endpoints are prefixed with `/api/sessions` and run on port **3001**.

### Base URL
```
http://localhost:3001/api/sessions
```

### Session Routes (from `/api/routes/sessions.js`)

#### 1. Get All Sessions for User
```http
GET /api/sessions/
```
- **Middleware**: `requireAuth`
- **Controller**: `sessionController.getUserSessions`
- **Purpose**: Main endpoint to get all sessions for authenticated user

#### 2. Get Specific Session by ID
```http
GET /api/sessions/:sessionId
```
- **Middleware**: `validateSessionAccess`
- **Controller**: `sessionController.getSessionById`
- **Purpose**: Get details of a specific session

#### 3. Get User Sessions (Alternative endpoint)
```http
GET /api/sessions/user-sessions
```
- **Middleware**: `requireAuth`
- **Controller**: `sessionController.getUserSessions`
- **Purpose**: Combines created and shared sessions

#### 4. Get My Sessions (Created by user)
```http
GET /api/sessions/get-my-sessions
```
- **Middleware**: `requireAuth`
- **Controller**: `sessionController.getUserSessions`
- **Special**: Sets `req.filterCreatedOnly = true`
- **Purpose**: Returns only sessions created by the user

#### 5. Get Shared Sessions (Invited sessions)
```http
GET /api/sessions/get-shared-sessions
```
- **Middleware**: `requireAuth`
- **Controller**: `sessionController.getUserSessions`
- **Special**: Sets `req.filterSharedOnly = true`
- **Purpose**: Returns only sessions user was invited to

#### 6. Create Session
```http
POST /api/sessions/
```
- **Middleware**: `requireAuth`, `validateSessionCreation`
- **Controller**: `sessionController.createSession`
- **Purpose**: Create a new session

#### 7. Invite User to Session
```http
POST /api/sessions/:sessionId/invite
```
- **Middleware**: `validateSessionAccess`, `validateSessionInvitation`
- **Controller**: `sessionController.inviteToSession`
- **Purpose**: Invite a user to join a session

#### 8. Remove Participant from Session
```http
POST /api/sessions/:sessionId/remove-participant
```
- **Middleware**: `validateSessionAccess`
- **Controller**: `sessionController.removeParticipant`
- **Purpose**: Remove a participant from the session

#### 9. Transfer Ownership
```http
POST /api/sessions/:sessionId/transfer-ownership
```
- **Middleware**: `validateSessionAccess`
- **Controller**: `sessionController.transferOwnership`
- **Purpose**: Transfer session ownership to another user

#### 10. Update Participant Role
```http
POST /api/sessions/:sessionId/update-role
```
- **Middleware**: `validateSessionAccess`
- **Controller**: `sessionController.updateParticipantRole`
- **Purpose**: Update a participant's role in the session

#### 11. Leave Session
```http
POST /api/sessions/:sessionId/leave
```
- **Middleware**: `validateSessionAccess`
- **Controller**: `sessionController.leaveSession`
- **Purpose**: Leave a session (participant removes themselves)

#### 12. Delete Session
```http
DELETE /api/sessions/:sessionId
```
- **Middleware**: `validateSessionAccess`
- **Controller**: `sessionController.deleteSession`
- **Purpose**: Delete a session (owner only)

#### 13. Check Session Access
```http
GET /api/sessions/check-access
```
- **Controller**: `sessionController.checkAccess`
- **Purpose**: Check if user has access to a session
- **Query Parameters**: `sessionId`, `email`

#### 14. Get Active Users in Session
```http
POST /api/sessions/active-users
```
- **Controller**: `sessionController.getActiveUsers`
- **Purpose**: Get list of currently active users in a session

#### 15. Update User Activity
```http
POST /api/sessions/update-activity
```
- **Controller**: `sessionController.updateActivity`
- **Purpose**: Update user's last active timestamp

### Migration and Debugging Routes

#### 16. Get Migration Status
```http
GET /api/sessions/migration-status
```
- **Controller**: `sessionController.getMigrationStatus`
- **Purpose**: Check current migration status

#### 17. Enable New System
```http
POST /api/sessions/enable-new-system
```
- **Controller**: `sessionController.enableNewSystem`
- **Purpose**: Switch to new session management system

#### 18. Enable Legacy System
```http
POST /api/sessions/enable-legacy-system
```
- **Controller**: `sessionController.enableLegacySystem`
- **Purpose**: Switch back to legacy system (rollback)

## Authentication & Middleware

### Authentication Method
The system uses email-based authentication via headers:

```javascript
// Required header for all authenticated requests
{
  "x-user-email": "user@example.com"
}
```

### Middleware Functions

#### 1. `requireAuth`
- **Purpose**: Validates user email from headers
- **Location**: `/api/middleware/auth.js`
- **Usage**: Basic authentication for user identification

```javascript
const requireAuth = (req, res, next) => {
  const userEmail = req.body.email || req.query.email || req.headers['x-user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ 
      error: 'User authentication required' 
    });
  }
  
  req.userEmail = userEmail;
  next();
};
```

#### 2. `validateSessionAccess`
- **Purpose**: Validates user has access to specific session
- **Location**: `/api/middleware/auth.js`
- **Usage**: Session-specific authorization

```javascript
const validateSessionAccess = async (req, res, next) => {
  const { sessionId } = req.params;
  const userEmail = req.body.email || req.query.email || req.headers['x-user-email'];

  const accessResult = await sessionService.checkSessionAccess(sessionId, userEmail);
  
  if (!accessResult.hasAccess) {
    return res.status(403).json({ 
      error: 'Access denied to this session' 
    });
  }

  req.sessionId = sessionId;
  req.userEmail = userEmail;
  next();
};
```

#### 3. `validateSessionCreation`
- **Purpose**: Validates session creation data
- **Location**: `/api/middleware/validation.js`
- **Usage**: Input validation for session creation

#### 4. `validateSessionInvitation`
- **Purpose**: Validates invitation data with smart field detection
- **Location**: `/api/middleware/validation.js`
- **Usage**: Input validation for user invitations

```javascript
const validateSessionInvitation = (req, res, next) => {
  // Smart field detection for backward compatibility
  let inviteeEmail = req.body.inviteeEmail || 
    (req.body.email && !req.body.inviterEmail ? req.body.email : null);
  
  let inviterEmail = req.body.inviterEmail || 
    (req.body.email && req.body.inviteeEmail ? req.body.email : null) ||
    req.headers['x-user-email'];
  
  // Support both 'role' and 'access' fields
  const userRole = req.body.role || req.body.access || 'editor';
  
  // Validation and normalization
  req.body.inviteeEmail = inviteeEmail.trim().toLowerCase();
  req.body.inviterEmail = inviterEmail.trim().toLowerCase();
  
  // Convert legacy access values (edit → editor, view → viewer)
  if (userRole === 'edit') req.body.role = 'editor';
  else if (userRole === 'view') req.body.role = 'viewer';
  else req.body.role = userRole;
  
  next();
};
```

## Database Schema

### Session Model (`/api/models/Session.js`)

```javascript
{
  sessionId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  creator: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
    index: true
  },
  settings: {
    isPrivate: { type: Boolean, default: false },
    allowGuestAccess: { type: Boolean, default: false },
    maxParticipants: { type: Number, default: 50 },
    allowSelfInvite: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: false }
  },
  createdAt: Date,
  updatedAt: Date
}
```

### SessionParticipant Model (`/api/models/SessionParticipant.js`)

```javascript
{
  sessionId: {
    type: String,
    required: true,
    index: true,
    ref: 'Session'
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    default: function() {
      return this.userEmail ? this.userEmail.split('@')[0] : 'Unknown';
    }
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'editor', 'viewer'],
    default: 'viewer'
  },
  status: {
    type: String,
    enum: ['active', 'invited', 'left', 'removed'],
    default: 'invited'
  },
  invitedBy: {
    type: String,
    required: true // Email of the user who sent the invitation
  },
  joinedAt: {
    type: Date,
    default: null // Set when status changes to 'active'
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  legacy: {
    originalAccess: String, // Store original 'edit'/'view' values
    migrationComplete: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Key Features:
- **Compound Indexes**: `{sessionId, userEmail}` (unique), `{userEmail, status}`, `{sessionId, status}`, `{sessionId, role}`
- **Static Methods**: `getActiveParticipants()`, `hasAccess()`
- **Instance Methods**: `convertLegacyAccess()` for migration
- **Role System**: Four-tier hierarchy (owner → admin → editor → viewer)
- **Status Tracking**: invited → active → left/removed workflow

## Error Handling

### Response Format

The system uses a consistent response format:

#### Success Response
```javascript
{
  "success": true,
  "message": "Operation completed successfully",
  "session": { ... },        // For session operations
  "sessionId": "abc123",     // For creation operations
  "total": 5,                // For list operations
  "userEmail": "user@email"  // For user-specific operations
}
```

#### Error Response
```javascript
{
  "success": false,
  "error": "User-friendly error message",
  "details": "Technical error details"
}
```

### Common Error Scenarios

#### 1. Authentication Required (401)
```javascript
{
  "error": "User authentication required"
}
```

#### 2. Access Denied (403)
```javascript
{
  "success": false,
  "error": "Access denied to this session"
}
```

#### 3. Resource Not Found (404)
```javascript
{
  "success": false,
  "error": "Session not found"
}
```

#### 4. Validation Error (400)
```javascript
{
  "success": false,
  "error": "Failed to create session",
  "details": "Validation error details"
}
```

### Controller Error Handling

The controllers use `asyncHandler` wrapper for consistent error handling:

```javascript
// Example from sessionController.js
getSessionById = asyncHandler(async (req, res) => {
  const { sessionId, userEmail } = req;

  const session = await this.sessionService.getSessionDetails(sessionId);
  
  if (!session) {
    return res.status(404).json({ 
      success: false,
      error: "Session not found" 
    });
  }

  res.json({
    success: true,
    session: session
  });
});
```

## Frontend Integration

### API Client Setup

Based on the actual implementation, the frontend should use:

```javascript
// API configuration
const API_URL = 'http://localhost:3001/api';

// Request headers
const headers = {
  'Content-Type': 'application/json',
  'x-user-email': userEmail
};
```

### Example API Calls

#### Get User Sessions
```javascript
const getUserSessions = async (userEmail) => {
  const response = await fetch('/api/sessions', {
    headers: {
      'x-user-email': userEmail
    }
  });
  
  const data = await response.json();
  return data.sessions;
};
```

#### Create Session
```javascript
const createSession = async (sessionData, userEmail) => {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-email': userEmail
    },
    body: JSON.stringify({
      name: sessionData.name,
      description: sessionData.description,
      creator: userEmail
    })
  });
  
  return await response.json();
};
```

#### Invite User to Session
```javascript
const inviteToSession = async (sessionId, inviteeEmail, role, inviterEmail) => {
  const response = await fetch(`/api/sessions/${sessionId}/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-email': inviterEmail
    },
    body: JSON.stringify({
      email: inviterEmail,
      inviteeEmail: inviteeEmail,
      role: role,
      inviterEmail: inviterEmail
    })
  });
  
  return await response.json();
};
```

#### Delete Session
```javascript
const deleteSession = async (sessionId, userEmail) => {
  const response = await fetch(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'x-user-email': userEmail
    },
    body: JSON.stringify({
      userEmail: userEmail
    })
  });
  
  return await response.json();
};
```

## Complete Backend File Structure

Based on the comprehensive analysis, here's the complete session-related backend structure:

### Core Session Files
```
/api/
├── controllers/
│   └── sessionController.js         ✅ Complete controller with 17 methods
├── models/
│   ├── Session.js                   ✅ New normalized session model
│   ├── SessionParticipant.js        ✅ Participant relationship model  
│   └── SessionManagement.js         ✅ Legacy model (compatibility)
├── services/
│   ├── sessionService.js            ✅ Primary service implementation
│   └── integrated-session-service.js ✅ Alternative service with transactions
├── routes/
│   ├── sessions.js                  ✅ Main RESTful routes (18 endpoints)
│   ├── sessions_debug.js            ✅ Debug version with logging
│   └── sessionManage.js             ✅ Legacy routes (compatibility)
├── middleware/
│   ├── auth.js                      ✅ Authentication & access validation
│   ├── validation.js                ✅ Input validation & sanitization
│   └── errorHandler.js              ✅ Async error handling wrapper
└── utils/
    ├── sessionUtils.js              ✅ Utility functions
    ├── permissions.js               ✅ Role-based permission system
    └── validators.js                ✅ Input validation helpers
```

### Method Coverage Summary

#### SessionController (17 Methods)
- ✅ `getUserSessions` - Get all sessions for user
- ✅ `getSessionById` - Get specific session details
- ✅ `createSession` - Create new session
- ✅ `inviteToSession` - Invite user to session
- ✅ `leaveSession` - Leave session
- ✅ `deleteSession` - Delete session (owner only)
- ✅ `checkAccess` - Check session access
- ✅ `getActiveUsers` - Get active users in session
- ✅ `updateActivity` - Update user activity timestamp
- ✅ `removeParticipant` - Remove participant from session
- ✅ `transferOwnership` - Transfer session ownership
- ✅ `updateParticipantRole` - Update participant role
- ✅ `getMigrationStatus` - Get migration status
- ✅ `enableNewSystem` - Switch to new system
- ✅ `enableLegacySystem` - Switch to legacy system
- ✅ `healthCheck` - System health check
- ✅ `checkParticipantRecords` - Debug participant records

#### SessionService (20+ Methods)
- ✅ Public API methods (getUserSessions, createSession, etc.)
- ✅ New system implementations (_getUserSessionsNew, _createSessionNew, etc.)
- ✅ Permission checking helpers
- ✅ Validation and sanitization methods
- ✅ Role conversion utilities
- ✅ Migration and health check methods

#### Middleware Functions
- ✅ `requireAuth` - Basic email authentication
- ✅ `validateSessionAccess` - Session-specific authorization
- ✅ `validateLeaveAccess` - Lenient access for leave operations
- ✅ `validateSessionCreation` - Session creation validation
- ✅ `validateSessionInvitation` - Smart invitation validation
- ✅ `validateFileUpload` - File upload validation
- ✅ `asyncHandler` - Error handling wrapper

### Database Schema Completeness

#### Session Model Features
- ✅ Unique sessionId with indexing
- ✅ Creator tracking and status management
- ✅ Comprehensive settings object
- ✅ Pre-save validation middleware
- ✅ Static helper methods

#### SessionParticipant Model Features  
- ✅ Compound indexes for performance
- ✅ Role hierarchy (owner → admin → editor → viewer)
- ✅ Status workflow (invited → active → left/removed)
- ✅ Legacy compatibility fields
- ✅ Static query methods
- ✅ Instance conversion methods

### API Route Completeness

#### RESTful Endpoints (18 Total)
1. ✅ `GET /` - Main user sessions endpoint
2. ✅ `GET /:sessionId` - Specific session details
3. ✅ `GET /user-sessions` - Alternative sessions endpoint
4. ✅ `GET /get-my-sessions` - Created sessions only
5. ✅ `GET /get-shared-sessions` - Invited sessions only
6. ✅ `POST /` - Create session
7. ✅ `POST /:sessionId/invite` - Invite user
8. ✅ `POST /:sessionId/remove-participant` - Remove participant
9. ✅ `POST /:sessionId/transfer-ownership` - Transfer ownership
10. ✅ `POST /:sessionId/update-role` - Update participant role
11. ✅ `POST /:sessionId/leave` - Leave session
12. ✅ `DELETE /:sessionId` - Delete session
13. ✅ `GET /check-access` - Check session access
14. ✅ `POST /active-users` - Get active users
15. ✅ `POST /update-activity` - Update user activity
16. ✅ `GET /migration-status` - Migration status
17. ✅ `POST /enable-new-system` - Enable new system
18. ✅ `POST /enable-legacy-system` - Enable legacy system

### Legacy Compatibility

#### Legacy Routes (sessionManage.js)
- ✅ `GET /get-my-sessions` - Legacy format sessions
- ✅ `GET /get-shared-sessions` - Legacy format shared sessions
- ✅ `POST /create-session` - Legacy session creation
- ✅ `POST /delete-session` - Legacy session deletion
- ✅ `POST /leave-session` - Legacy leave functionality
- ✅ `POST /invite-session` - Legacy invitation system
- ✅ `POST /active-users` - Legacy active users

#### Migration Strategy
- ✅ Dual-system support (new + legacy)
- ✅ Gradual migration with feature flags
- ✅ Backward compatibility maintained
- ✅ Data format converters
- ✅ Migration status tracking

---

**All session-related backend functionality is documented and verified complete!** 🎉
