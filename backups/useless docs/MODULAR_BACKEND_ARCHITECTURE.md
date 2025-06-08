# CodeLab Modular Backend Architecture Documentation

## Overview

This document provides comprehensive documentation for the modernized CodeLab backend architecture, featuring a modular, scalable design with enhanced session management, role-based permissions, and improved data consistency.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Models](#core-models)
3. [Controllers](#controllers)
4. [Middleware](#middleware)
5. [Services](#services)
6. [Permission System](#permission-system)
7. [Environment Configuration](#environment-configuration)
8. [Database Design](#database-design)
9. [API Routes](#api-routes)
10. [Security Features](#security-features)
11. [Error Handling](#error-handling)

---

## Architecture Overview

The modular backend architecture is designed with separation of concerns, providing:

- **Modular Controller Pattern**: Organized controllers for different functionality areas
- **Service Layer**: Business logic abstraction through dedicated services
- **Comprehensive Permission System**: Role-based access control with session-specific settings
- **Enhanced Data Models**: Improved schemas with validation and business logic
- **Middleware Stack**: Authentication, validation, and error handling layers
- **MongoDB Integration**: Modern database design with proper indexing and relationships

### Key Benefits

- ✅ **Scalability**: Modular design allows easy feature additions
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Security**: Comprehensive permission system and validation
- ✅ **Performance**: Optimized database queries and caching
- ✅ **Reliability**: Robust error handling and data validation

---

## Core Models

### 1. Session Model (`/api/models/Session.js`)

The primary model for collaborative coding sessions with enhanced features:

#### Schema Structure

```javascript
{
  sessionId: String,           // Unique 6-20 character identifier
  name: String,               // 3-100 character session name
  description: String,        // Optional description (max 500 chars)
  creator: ObjectId,          // Reference to User model
  status: String,             // 'active', 'archived', 'deleted'
  settings: {
    isPrivate: Boolean,       // Public/private session
    allowGuestAccess: Boolean, // Non-authenticated access
    maxParticipants: Number,  // 1-1000 participant limit
    invitePolicy: String,     // 'closed', 'approval-required', 'self-invite', 'open'
    allowRoleRequests: Boolean, // Enable role change requests
    allowedDomains: [String]  // Email domain restrictions
  },
  activity: {
    lastActivity: Date,       // Last session activity
    participantCount: Number, // Current active participants
    totalEdits: Number        // Total edit operations
  }
}
```

#### Key Methods

- `canUserJoin(userEmail)` - Validates if user can join session
- `isAtCapacity(currentCount)` - Checks participant limit
- `archive()` - Archives session and updates participants
- `canModifySettingValue(setting, value, userRole)` - Validates setting changes
- `ensureOwner()` - Verifies session ownership

#### Business Rules

- Private sessions cannot have open invite policy
- Guest access requires appropriate invite policies
- Session IDs are auto-generated if not provided
- Participant count cannot exceed maxParticipants setting

### 2. SessionParticipant Model (`/api/models/SessionParticipant.js`)

Manages participant relationships and permissions:

#### Schema Structure

```javascript
{
  sessionId: String,          // Reference to Session
  user: ObjectId,            // Reference to User model
  role: String,              // 'owner', 'admin', 'editor', 'viewer'
  status: String,            // 'active', 'invited', 'left', 'removed'
  invitedBy: ObjectId,       // User who invited this participant
  joinedAt: Date,            // When user joined
  leftAt: Date,              // When user left/was removed
  lastActive: Date,          // Last activity timestamp
  inviteData: {
    message: String,         // Invitation message
    expiresAt: Date,         // Invitation expiration
    acceptedAt: Date,        // Acceptance timestamp
    rejectedAt: Date         // Rejection timestamp
  },
  sessionActivity: {
    editsCount: Number,      // Edit operations by user
    timeSpent: Number,       // Time in session (minutes)
    lastContribution: Date   // Last edit timestamp
  }
}
```

#### Key Methods

- `hasPermission(action)` - Check role-based permissions
- `canAssignRole(targetRole)` - Validate role assignments
- `acceptInvitation()` - Accept invitation and activate participant
- `updateActivity(activityType)` - Track user activity
- `isInvitationExpired()` - Check invitation validity

#### Static Methods

- `findSessionOwner(sessionId)` - Get session owner with user data
- `getActiveParticipants(sessionId)` - Get all active participants
- `createInvitation(inviteData)` - Create new invitation

### 3. FileStorage Model (`/api/models/FileStorage.js`)

MongoDB-based file storage replacing filesystem approach:

#### Schema Structure

```javascript
{
  sessionId: String,         // Associated session
  fileName: String,          // Original filename
  filePath: String,          // Virtual file path in session
  fileContent: String,       // Base64 encoded content
  fileSize: Number,          // File size in bytes
  fileType: String,          // File extension/type
  uploadedBy: String,        // User email
  lastModified: Date,        // Last modification time
  isDirectory: Boolean,      // Directory flag
  parentPath: String         // Parent directory path
}
```

#### Key Features

- MongoDB storage eliminates filesystem dependencies
- Hierarchical file organization
- Version control capabilities
- Efficient querying with proper indexing

### 4. Permissions Model (`/api/models/permissions.js`)

Centralized permission system with comprehensive role management:

#### Role Hierarchy

```javascript
{
  viewer: 1,    // Read-only access
  editor: 2,    // Edit + view permissions
  admin: 3,     // Management permissions (no ownership transfer)
  owner: 4      // Full control including ownership transfer
}
```

#### Permission Matrix

| Role   | View | Edit | Invite | Remove | Change Roles | Delete | Transfer |
|--------|------|------|--------|--------|--------------|--------|----------|
| Viewer | ✅   | ❌   | ❌     | ❌     | ❌           | ❌     | ❌       |
| Editor | ✅   | ✅   | ✅*    | ❌     | ❌           | ❌     | ❌       |
| Admin  | ✅   | ✅   | ✅     | ✅**   | ✅**         | ❌     | ❌       |
| Owner  | ✅   | ✅   | ✅     | ✅     | ✅           | ✅     | ✅       |

\* Editors can only invite viewers and editors  
\** Admins cannot remove owners or assign admin/owner roles

#### Invite Policies

- `closed` - Only owner/admins can invite
- `approval-required` - Invites need approval
- `self-invite` - Users can request to join
- `open` - Anyone can join freely

---

## Controllers

### 1. SessionController (`/api/controllers/sessionController.js`)

Handles core session CRUD operations:

#### Methods

- `getUserSessions(req, res)` - Retrieve user's sessions
- `getSessionById(req, res)` - Get specific session details
- `createSession(req, res)` - Create new session
- `deleteSession(req, res)` - Delete session (owner only)
- `checkAccess(req, res)` - Validate session access

#### Features

- Comprehensive input validation
- Sanitized output for security
- Role-based filtering
- Error handling with detailed messages

### 2. SessionParticipantController (`/api/controllers/sessionParticipantController.js`)

Manages participant operations:

#### Methods

- `inviteToSession(req, res)` - Send session invitations
- `removeParticipant(req, res)` - Remove participants
- `transferOwnership(req, res)` - Transfer session ownership
- `updateParticipantRole(req, res)` - Change participant roles
- `leaveSession(req, res)` - Leave session

#### Features

- Permission validation before operations
- Automatic owner uniqueness enforcement
- Activity tracking integration
- Invitation expiration handling

### 3. SessionActivityController (`/api/controllers/sessionActivityController.js`)

Tracks user activity and session metrics:

#### Methods

- `getActiveUsers(req, res)` - Get currently active users
- `updateActivity(req, res)` - Update user activity timestamp
- `healthCheck(req, res)` - System health monitoring

#### Features

- Real-time activity tracking
- Performance metrics collection
- Session analytics support

### 4. SessionValidationController (`/api/controllers/sessionValidationController.js`)

Provides validation and debugging tools:

#### Methods

- `checkParticipantRecords(req, res)` - Debug participant data
- `validateSessionIntegrity(req, res)` - Check session consistency

#### Features

- Data integrity validation
- Debugging support for development
- Consistency checks across models

---

## Middleware

### 1. Authentication Middleware (`/api/middleware/auth.js`)

Handles user authentication and session access validation:

#### Functions

- `validateSessionAccess` - Verify user access to session
- `validateLeaveAccess` - Lenient validation for leave operations
- `requireAuth` - Ensure user authentication
- `requireAdmin` - Admin-only access (placeholder)

#### Features

- Session access validation
- User email verification
- Flexible authentication for different operations

### 2. Validation Middleware (`/api/middleware/validation.js`)

Input validation and sanitization:

#### Functions

- `validateSessionCreation` - Session creation data validation
- `validateSessionInvitation` - Invitation data validation
- `validateFileUpload` - File upload validation
- `validateQueryParams` - Query parameter validation

#### Features

- Comprehensive input validation
- Data sanitization and normalization
- Role/access field compatibility
- Email format validation

### 3. Error Handler Middleware (`/api/middleware/errorHandler.js`)

Centralized error handling:

#### Functions

- `errorLogger` - Log errors with context
- `errorHandler` - Format and respond to errors
- `notFoundHandler` - Handle 404 routes
- `asyncHandler` - Wrap async functions

#### Features

- Detailed error logging
- Environment-specific error responses
- Consistent error format
- Stack trace protection in production

---

## Services

### 1. ModularSessionService (`/api/services/session/ModularSessionService.js`)

Core session business logic:

#### Methods

- `getUserSessions(userEmail, user)` - Get all user sessions
- `getSessionDetails(sessionId)` - Fetch session with participants
- `createSession(sessionData)` - Create new session with validation
- `deleteSession(sessionId, userEmail)` - Delete session with permissions
- `checkSessionAccess(sessionId, userEmail)` - Validate access

#### Features

- Unified session management
- Permission-aware operations
- Data consistency enforcement
- Efficient database queries

### 2. FileStorageService (`/api/services/fileStorageService.js`)

MongoDB-based file management:

#### Methods

- `storeFile(sessionId, fileData)` - Store file in MongoDB
- `getFile(sessionId, filePath)` - Retrieve file content
- `getSessionFiles(sessionId)` - List session files
- `deleteFile(sessionId, filePath)` - Remove file
- `getFileHierarchy(sessionId)` - Get folder structure

#### Features

- Database file storage
- Hierarchical organization
- Efficient querying
- Content type handling

---

## Permission System

### Role-Based Access Control (RBAC)

The permission system provides granular control over session operations:

#### Core Principles

1. **Hierarchical Roles**: Higher roles inherit lower role permissions
2. **Session-Specific Settings**: Invite policies and domain restrictions
3. **Action-Based Permissions**: Specific permissions for each operation
4. **Validation at Multiple Layers**: Client-side and server-side validation

#### Permission Functions

```javascript
// Check basic role permission
hasPermission(role, action)

// Check with session settings
canPerformActionWithSettings(role, action, sessionSettings, userEmail)

// Role assignment validation
canAssignRole(currentRole, targetRole)

// Setting modification permissions
canModifySetting(userRole, settingName)
```

#### Domain Restrictions

Sessions can restrict access by email domain:

```javascript
settings: {
  allowedDomains: ['company.com', 'partner.org']
}
```

#### Invite Policy Impact

Different invite policies affect permissions:

- **Closed**: Only admins/owners can invite
- **Approval Required**: Invitations need owner approval
- **Self-Invite**: Users can request access
- **Open**: Free join (with domain restrictions if set)

---

## Environment Configuration

### Database Configuration (`/api/config/environment.js`)

Secure MongoDB connection with environment variables:

```javascript
{
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  COGNITO_REGION: process.env.COGNITO_REGION,
  COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
  CORS_ORIGIN: process.env.CORS_ORIGIN
}
```

#### Features

- Environment-based configuration
- Secure credential management
- Connection pooling
- Error handling and retry logic

---

## Database Design

### Indexing Strategy

Optimized indexes for performance:

#### Session Model Indexes

```javascript
// Primary access patterns
{ creator: 1, status: 1 }
{ status: 1, 'activity.lastActivity': -1 }
{ 'settings.isPrivate': 1, status: 1 }

// Complex queries
{ 
  status: 1, 
  'settings.isPrivate': 1, 
  'settings.invitePolicy': 1,
  'activity.lastActivity': -1 
}

// Text search
{ name: 'text', description: 'text' }
```

#### SessionParticipant Model Indexes

```javascript
// Unique constraint
{ sessionId: 1, user: 1 }

// Query optimization
{ user: 1, status: 1 }
{ sessionId: 1, status: 1 }
{ sessionId: 1, role: 1 }
```

### Data Relationships

- **Session ↔ SessionParticipant**: One-to-many relationship
- **User ↔ SessionParticipant**: Referenced user data
- **Session ↔ FileStorage**: Session-scoped file storage

---

## API Routes

### Session Routes (`/api/routes/sessions.js`)

```javascript
// Core operations
GET    /sessions                    // Get user sessions
GET    /sessions/:sessionId         // Get session details
POST   /sessions                    // Create session
DELETE /sessions/:sessionId         // Delete session

// Participant management
POST   /sessions/:sessionId/invite           // Invite user
POST   /sessions/:sessionId/remove-participant // Remove participant
POST   /sessions/:sessionId/transfer-ownership // Transfer ownership
POST   /sessions/:sessionId/update-role      // Update role
POST   /sessions/:sessionId/leave            // Leave session

// Activity tracking
POST   /sessions/active-users       // Get active users
POST   /sessions/update-activity    // Update activity

// Validation
GET    /sessions/:sessionId/validate // Validate integrity
```

### Middleware Stack

Each route uses appropriate middleware:

1. **Authentication**: `requireAuth` or `validateSessionAccess`
2. **Validation**: Input validation middleware
3. **Business Logic**: Controller methods
4. **Error Handling**: Centralized error middleware

---

## Security Features

### 1. Input Validation

- Email format validation
- Session ID format validation
- Input sanitization
- Length restrictions
- Type checking

### 2. Access Control

- Role-based permissions
- Session-specific validation
- Owner verification
- Domain restrictions

### 3. Data Protection

- Secure database connections
- Environment variable configuration
- Error message sanitization
- Production stack trace hiding

### 4. Business Rule Enforcement

- Ownership uniqueness
- Setting compatibility validation
- Participant limits
- Invitation expiration

---

## Error Handling

### Error Types

1. **Validation Errors** (400): Invalid input data
2. **Authentication Errors** (401): Missing/invalid credentials
3. **Authorization Errors** (403): Insufficient permissions
4. **Not Found Errors** (404): Resource doesn't exist
5. **Conflict Errors** (409): Duplicate resources
6. **Server Errors** (500): Internal server issues

### Error Response Format

```javascript
{
  success: false,
  error: "Human-readable error message",
  details: "Additional error details (development only)",
  stack: "Error stack trace (development only)"
}
```

### Error Logging

- Structured error logging
- Request context inclusion
- Timestamp and correlation IDs
- Environment-specific verbosity

---

## Migration from Legacy System

### Key Improvements

1. **Unified Session Model**: Replaced multiple tables with single Session model
2. **Proper Relationships**: Foreign key relationships with referential integrity
3. **Permission System**: Comprehensive RBAC replacing ad-hoc access control
4. **MongoDB Storage**: Database file storage replacing filesystem
5. **Modular Architecture**: Separated concerns with dedicated controllers
6. **Enhanced Validation**: Multi-layer validation with business rules

### Backward Compatibility

- Legacy API endpoints maintained during transition
- Data migration scripts for existing sessions
- Gradual rollout with feature flags
- Comprehensive testing suite

---

## Performance Optimizations

### Database Optimizations

- Strategic indexing for common queries
- Connection pooling
- Query optimization
- Aggregate pipelines for complex operations

### Caching Strategy

- TanStack Query for client-side caching
- Session data caching
- Permission caching
- File metadata caching

### API Optimizations

- Efficient pagination
- Selective field loading
- Bulk operations where appropriate
- Response compression

---

## Development Guidelines

### Code Organization

```
api/
├── controllers/          # Request handling logic
├── models/              # Database schemas and business logic
├── middleware/          # Authentication, validation, error handling
├── services/            # Business logic abstraction
├── routes/              # API route definitions
├── utils/               # Utility functions
└── config/              # Configuration management
```

### Best Practices

1. **Separation of Concerns**: Controllers handle HTTP, services handle business logic
2. **Validation**: Validate at middleware layer before reaching controllers
3. **Error Handling**: Use centralized error handling with asyncHandler
4. **Testing**: Comprehensive unit and integration tests
5. **Documentation**: JSDoc comments for all public methods
6. **Security**: Validate permissions at every access point

---

## Testing Strategy

### Unit Tests

- Model method testing
- Permission function testing
- Utility function testing
- Validation middleware testing

### Integration Tests

- Controller endpoint testing
- Service integration testing
- Database operation testing
- Permission system testing

### End-to-End Tests

- Complete user workflows
- Multi-user collaboration scenarios
- Error condition handling
- Performance under load

---

## Future Enhancements

### Planned Features

1. **Real-time Collaboration**: WebSocket integration for live editing
2. **File Versioning**: Version control for session files
3. **Advanced Analytics**: Detailed session and user analytics
4. **Notification System**: Email and in-app notifications
5. **API Rate Limiting**: Request throttling and abuse prevention
6. **Audit Logging**: Comprehensive action logging for compliance

### Scalability Considerations

- Microservice architecture preparation
- Horizontal scaling support
- Caching layer implementation
- CDN integration for file serving
- Database sharding strategies

---

## Conclusion

The modular backend architecture provides a robust, scalable foundation for CodeLab's collaborative coding platform. Key benefits include:

- **Enhanced Security**: Comprehensive permission system and validation
- **Improved Performance**: Optimized database design and caching
- **Better Maintainability**: Clean separation of concerns and modular design
- **Scalability**: Architecture supports future growth and feature additions
- **Developer Experience**: Clear code organization and comprehensive documentation

This architecture positions CodeLab for continued growth while maintaining code quality and system reliability.
