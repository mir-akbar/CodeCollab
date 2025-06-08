# Session Management Backend Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Session Creation](#session-creation)
6. [Session Deletion](#session-deletion)
7. [Participant Management](#participant-management)
8. [Permission System](#permission-system)
9. [Frontend Integration](#frontend-integration)
10. [Error Handling](#error-handling)
11. [Real-time Features](#real-time-features)
12. [Advanced Topics](#advanced-topics)

## Introduction

The CodeLab session management system enables collaborative coding environments where multiple users can work together in real-time. The backend provides a comprehensive API for managing sessions, participants, permissions, and real-time collaboration features.

**Key Features:**
- RESTful API design with controller pattern
- Role-based access control (owner, admin, editor, viewer)
- Real-time collaboration with Socket.io
- MongoDB with transaction support
- TanStack Query integration for frontend state management
- Comprehensive error handling and validation

**API Server Configuration:**
- **Port**: 3001
- **Base URL**: `http://localhost:3001/api`
- **Session Endpoints**: `/api/sessions/*`

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │  SessionManager │  │        TanStack Query            │  │
│  │   Component     │  │    (State Management)            │  │
│  └─────────────────┘  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTP/Socket.io
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                        │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │ SessionController│  │        Session Service          │  │
│  │   (Routes)      │  │     (Business Logic)            │  │
│  └─────────────────┘  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   │ MongoDB
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (MongoDB)                       │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │    Session      │  │      SessionParticipant          │  │
│  │   Collection    │  │       Collection                 │  │
│  └─────────────────┘  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io
- **Frontend**: React, TanStack Query
- **Validation**: Custom middleware
- **Authentication**: Email-based with middleware

## Database Schema

### Session Model (`Session.js`)

```javascript
{
  sessionId: String,        // Unique session identifier
  name: String,            // Session name
  description: String,     // Session description
  creator: String,         // Creator's email
  status: String,          // 'active', 'archived', 'deleted'
  settings: {
    isPrivate: Boolean,
    allowGuestAccess: Boolean,
    maxParticipants: Number,
    allowSelfInvite: Boolean,
    requireApproval: Boolean,
    allowedDomains: [String],
    allowRoleRequests: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

### SessionParticipant Model (`SessionParticipant.js`)

```javascript
{
  sessionId: String,       // Reference to session
  userEmail: String,       // Participant's email
  userName: String,        // Display name
  role: String,           // 'owner', 'admin', 'editor', 'viewer'
  status: String,         // 'active', 'invited', 'left', 'removed'
  invitedBy: String,      // Email of inviter
  joinedAt: Date,         // When participant joined
  leftAt: Date,           // When participant left
  lastActiveAt: Date,     // Last activity timestamp
  permissions: {          // Cached permissions
    edit: Boolean,
    invite: Boolean,
    remove: Boolean,
    changeRoles: Boolean,
    delete: Boolean,
    transfer: Boolean
  }
}
```

### Role Hierarchy and Permissions

| Role | Edit Files | Invite Users | Remove Participants | Change Roles | Delete Session | Transfer Ownership |
|------|------------|--------------|-------------------|--------------|----------------|-------------------|
| owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ (except owner) | ❌ | ❌ |
| editor | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| viewer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## API Endpoints

### Base URL
All session endpoints are prefixed with: `http://localhost:3001/api/sessions`

### Session Management Endpoints

#### 1. Get User Sessions
```http
GET /api/sessions
```

**Headers:**
```javascript
{
  "x-user-email": "user@example.com"
}
```

**Response:**
```javascript
{
  "success": true,
  "sessions": [
    {
      "id": "ObjectId",
      "sessionId": "unique-session-id",
      "name": "My Coding Session",
      "description": "Learning React basics",
      "creator": "owner@example.com",
      "status": "active",
      "isCreator": true,
      "type": "created",
      "participants": [
        {
          "email": "participant@example.com",
          "name": "participant",
          "role": "editor",
          "status": "active"
        }
      ],
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "total": 1,
  "userEmail": "user@example.com"
}
```

#### 2. Get Specific Session
```http
GET /api/sessions/:sessionId
```

**Headers:**
```javascript
{
  "x-user-email": "user@example.com"
}
```

**Response:**
```javascript
{
  "success": true,
  "session": {
    "sessionId": "unique-session-id",
    "name": "My Coding Session",
    "description": "Learning React basics",
    "creator": "owner@example.com",
    "status": "active",
    "participants": [...],
    "settings": {
      "maxParticipants": 50,
      "allowSelfInvite": false,
      "isPrivate": false
    }
  }
}
```

#### 3. Create Session
```http
POST /api/sessions
```

**Headers:**
```javascript
{
  "x-user-email": "creator@example.com",
  "Content-Type": "application/json"
}
```

**Request Body:**
```javascript
{
  "name": "New Coding Session",
  "description": "Optional description",
  "creator": "creator@example.com"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Session created successfully",
  "session": {
    "id": "ObjectId",
    "sessionId": "generated-session-id",
    "name": "New Coding Session",
    "description": "Optional description",
    "creator": "creator@example.com",
    "status": "active",
    "participants": [
      {
        "email": "creator@example.com",
        "role": "owner",
        "status": "active"
      }
    ]
  },
  "sessionId": "generated-session-id"
}
```

#### 4. Delete Session
```http
DELETE /api/sessions/:sessionId
```

**Headers:**
```javascript
{
  "x-user-email": "owner@example.com"
}
```

**Request Body:**
```javascript
{
  "userEmail": "owner@example.com"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Session deleted successfully"
}
```

### Participant Management Endpoints

#### 5. Invite User to Session
```http
POST /api/sessions/:sessionId/invite
```

**Headers:**
```javascript
{
  "x-user-email": "inviter@example.com",
  "Content-Type": "application/json"
}
```

**Request Body:**
```javascript
{
  "email": "inviter@example.com",        // For authentication
  "inviteeEmail": "newuser@example.com", // User being invited
  "role": "editor",                      // Role to assign
  "inviterEmail": "inviter@example.com"  // Explicit inviter
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "User invited successfully",
  "participant": {
    "userEmail": "newuser@example.com",
    "role": "editor",
    "status": "active",
    "invitedBy": "inviter@example.com"
  }
}
```

#### 6. Remove Participant
```http
POST /api/sessions/:sessionId/remove-participant
```

**Headers:**
```javascript
{
  "x-user-email": "remover@example.com"
}
```

**Request Body:**
```javascript
{
  "participantEmail": "user@example.com",
  "userEmail": "remover@example.com"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Participant removed successfully"
}
```

#### 7. Update Participant Role
```http
POST /api/sessions/:sessionId/update-role
```

**Request Body:**
```javascript
{
  "participantEmail": "user@example.com",
  "role": "admin",
  "userEmail": "updater@example.com"
}
```

#### 8. Transfer Ownership
```http
POST /api/sessions/:sessionId/transfer-ownership
```

**Request Body:**
```javascript
{
  "newOwnerEmail": "newowner@example.com",
  "currentOwnerEmail": "currentowner@example.com"
}
```

#### 9. Leave Session
```http
POST /api/sessions/:sessionId/leave
```

**Request Body:**
```javascript
{
  "email": "user@example.com"
}
```

### Utility Endpoints

#### 10. Check Session Access
```http
GET /api/sessions/check-access?sessionId=xxx&email=user@example.com
```

**Response:**
```javascript
{
  "success": true,
  "hasAccess": true,
  "role": "editor",
  "permissions": {
    "edit": true,
    "invite": true,
    "remove": false,
    "changeRoles": false,
    "delete": false,
    "transfer": false
  }
}
```

#### 11. Get Active Users
```http
POST /api/sessions/active-users
```

**Request Body:**
```javascript
{
  "session_id": "session-id"
}
```

#### 12. Update User Activity
```http
POST /api/sessions/update-activity
```

**Request Body:**
```javascript
{
  "sessionId": "session-id",
  "email": "user@example.com"
}
```

## Session Creation

### Process Flow

1. **Client Request**: Frontend sends session creation request
2. **Validation**: Middleware validates required fields and authentication
3. **Session Creation**: Service creates session with unique ID
4. **Owner Assignment**: Creator is automatically assigned as owner
5. **Response**: Returns session details with generated ID

### Implementation Details

```javascript
// SessionService.createSession()
async createSession(sessionData) {
  const validatedData = this._validateSessionData(sessionData);
  
  const session = await mongoose.connection.transaction(async () => {
    return await this._createSessionNew(validatedData);
  });
  
  return session;
}
```

### Session ID Generation
- Uses utility function `generateSessionId()`
- Ensures uniqueness across the system
- Format: Alphanumeric string (e.g., "abc123def456")

### Default Settings
When creating a session, default settings are applied:

```javascript
settings: {
  maxParticipants: 50,
  allowSelfInvite: false,
  allowRoleRequests: false,
  allowedDomains: [],
  isPrivate: false,
  allowGuestAccess: false
}
```

## Session Deletion

### Process Flow

1. **Permission Check**: Verify user is session owner
2. **Status Update**: Mark session as 'deleted'
3. **Participant Cleanup**: Update all participants to 'removed' status
4. **File Cleanup**: (Future enhancement) Remove associated files
5. **Response**: Confirm deletion success

### Authorization
- Only session **owner** can delete a session
- Admin and editor roles cannot delete sessions
- Soft delete approach (status = 'deleted')

### Implementation

```javascript
// SessionService.deleteSession()
async _deleteSessionNew(sessionId, userEmail) {
  // Find session and verify ownership
  const session = await Session.findOne({ sessionId });
  await this._checkUserPermission(sessionId, userEmail, 'delete');
  
  // Soft delete
  session.status = 'deleted';
  await session.save();
  
  // Remove all participants
  await SessionParticipant.updateMany(
    { sessionId: session.sessionId },
    { status: 'removed' }
  );
}
```

## Participant Management

### Adding Participants (Invitation)

#### Process Flow
1. **Permission Check**: Verify inviter has 'invite' permission
2. **Role Validation**: Ensure inviter can assign the requested role
3. **Duplicate Check**: Check if user is already a participant
4. **Participant Creation**: Add user to session with specified role
5. **Notification**: (Future) Send invitation email/notification

#### Role Assignment Rules
- **Owner**: Can assign any role (owner, admin, editor, viewer)
- **Admin**: Can assign editor and viewer roles only
- **Editor**: Can assign viewer role only
- **Viewer**: Cannot invite participants

### Removing Participants

#### Process Flow
1. **Permission Check**: Verify remover has 'remove' permission
2. **Target Validation**: Cannot remove session owner
3. **Status Update**: Change participant status to 'removed'
4. **Cleanup**: Update associated data

#### Restrictions
- Cannot remove session owner
- Owner and admin can remove any participant (except owner)
- Editors and viewers cannot remove participants

### Role Updates

#### Available Roles
- **owner**: Full control over session
- **admin**: Manage participants and content (except deletion)
- **editor**: Edit content and invite viewers
- **viewer**: Read-only access

#### Role Transition Rules
```javascript
// Valid role transitions
const roleHierarchy = {
  'owner': ['admin', 'editor', 'viewer'],
  'admin': ['editor', 'viewer'],
  'editor': ['viewer'],
  'viewer': []
};
```

### Ownership Transfer

#### Process Flow
1. **Current Owner Verification**: Verify requester is current owner
2. **Target Validation**: Ensure new owner exists and is active participant
3. **Atomic Update**: Transfer ownership in single transaction
4. **Previous Owner**: Becomes admin (configurable)

#### Implementation
```javascript
async transferOwnership(sessionId, currentOwnerEmail, newOwnerEmail) {
  await mongoose.connection.transaction(async () => {
    // Update new owner
    await SessionParticipant.findOneAndUpdate(
      { sessionId, userEmail: newOwnerEmail },
      { role: 'owner' }
    );
    
    // Update previous owner
    await SessionParticipant.findOneAndUpdate(
      { sessionId, userEmail: currentOwnerEmail },
      { role: 'admin' }
    );
  });
}
```

## Permission System

### Permission Model
The system uses a role-based permission model with the following actions:

```javascript
const permissions = {
  owner: ['edit', 'invite', 'remove', 'changeRoles', 'delete', 'transfer'],
  admin: ['edit', 'invite', 'remove', 'changeRoles'],
  editor: ['edit', 'invite'],
  viewer: []
};
```

### Permission Checking
```javascript
// Check if user can perform action
async canUserPerformAction(sessionId, userEmail, action) {
  const participant = await SessionParticipant.findOne({
    sessionId,
    userEmail,
    status: 'active'
  });

  return participant ? 
    permissions.hasPermission(participant.role, action) : 
    false;
}
```

### Permission Middleware
```javascript
// Validate session access middleware
async function validateSessionAccess(req, res, next) {
  const { sessionId } = req.params;
  const { userEmail } = req;
  
  const hasAccess = await sessionService.checkSessionAccess(sessionId, userEmail);
  
  if (!hasAccess) {
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied' 
    });
  }
  
  next();
}
```

## Frontend Integration

### TanStack Query Setup

The frontend uses TanStack Query for efficient state management and API integration.

#### API Configuration
```javascript
// src/config/api.js
export const API_URL = 'http://localhost:3001/api';
```

#### Session Hooks (`useSessions.js`)

```javascript
// Get all user sessions
export const useSessions = (userEmail) => {
  return useQuery({
    queryKey: sessionKeys.userSessions(userEmail),
    queryFn: () => sessionAPI.getUserSessions(userEmail),
    enabled: !!userEmail,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Create session mutation
export const useCreateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.createSession,
    onSuccess: (newSession, variables) => {
      // Update cache with new session
      queryClient.setQueryData(
        sessionKeys.userSessions(variables.userEmail),
        (oldData) => [...(oldData || []), newSession]
      );
    }
  });
};

// Delete session mutation
export const useDeleteSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionAPI.deleteSession,
    onSuccess: (_, variables) => {
      // Remove from cache
      queryClient.setQueryData(
        sessionKeys.userSessions(variables.userEmail),
        (oldData) => oldData?.filter(s => s.sessionId !== variables.sessionId)
      );
    }
  });
};
```

#### Session Management Component

```javascript
// SessionManager.jsx
import { useSessions, useCreateSession, useDeleteSession } from '../hooks/useSessions';

export function SessionManager({ userEmail }) {
  const { data: sessions, isLoading, error } = useSessions(userEmail);
  const createSessionMutation = useCreateSession();
  const deleteSessionMutation = useDeleteSession();

  const handleCreateSession = async (sessionData) => {
    try {
      await createSessionMutation.mutateAsync({
        sessionData,
        userEmail
      });
      toast.success('Session created successfully');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteSessionMutation.mutateAsync({
        sessionId,
        userEmail
      });
      toast.success('Session deleted successfully');
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Component render logic...
}
```

### Query Key Factory

```javascript
export const sessionKeys = {
  all: ['sessions'],
  userSessions: (userEmail) => [...sessionKeys.all, 'user', userEmail],
  session: (sessionId) => [...sessionKeys.all, 'session', sessionId],
  participants: (sessionId) => [...sessionKeys.session(sessionId), 'participants'],
};
```

### API Client Configuration

```javascript
// Axios configuration with interceptors
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const userEmail = getCurrentUserEmail();
  if (userEmail) {
    config.headers['x-user-email'] = userEmail;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle authentication error
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);
```

## Error Handling

### Backend Error Response Format

```javascript
// Success Response
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}

// Error Response
{
  "success": false,
  "error": "User-friendly error message",
  "details": "Technical error details",
  "code": "ERROR_CODE" // Optional error code
}
```

### Common Error Scenarios

#### 1. Authentication Errors
```javascript
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

#### 2. Permission Errors
```javascript
{
  "success": false,
  "error": "Insufficient permissions to perform this action",
  "code": "PERMISSION_DENIED"
}
```

#### 3. Validation Errors
```javascript
{
  "success": false,
  "error": "Invalid session data",
  "details": {
    "name": "Session name is required",
    "creator": "Valid email address required"
  },
  "code": "VALIDATION_ERROR"
}
```

#### 4. Resource Not Found
```javascript
{
  "success": false,
  "error": "Session not found",
  "code": "RESOURCE_NOT_FOUND"
}
```

### Frontend Error Handling

```javascript
// Error handling in hooks
export const useSessionWithErrorHandling = (sessionId) => {
  return useQuery({
    queryKey: sessionKeys.session(sessionId),
    queryFn: () => sessionAPI.getSession(sessionId),
    onError: (error) => {
      if (error.response?.status === 404) {
        toast.error('Session not found');
        navigate('/sessions');
      } else if (error.response?.status === 403) {
        toast.error('Access denied');
      } else {
        toast.error('Failed to load session');
      }
    }
  });
};
```

## Real-time Features

### Socket.io Integration

The system supports real-time collaboration through Socket.io:

#### 1. Session Activity Tracking
```javascript
// Update user activity
socket.emit('user-activity', {
  sessionId: 'session-id',
  userEmail: 'user@example.com',
  action: 'typing'
});
```

#### 2. Participant Updates
```javascript
// Broadcast participant changes
socket.to(sessionId).emit('participant-updated', {
  sessionId,
  participantEmail,
  newRole,
  updatedBy
});
```

#### 3. Real-time Session Events
```javascript
// Session events
const sessionEvents = {
  'participant-joined': (data) => { /* Handle new participant */ },
  'participant-left': (data) => { /* Handle participant leaving */ },
  'session-updated': (data) => { /* Handle session updates */ },
  'permission-changed': (data) => { /* Handle permission changes */ }
};
```

### Activity Tracking

#### Last Active Updates
```javascript
// Periodic activity updates
setInterval(() => {
  if (isUserActive && currentSessionId) {
    sessionAPI.updateActivity({
      sessionId: currentSessionId,
      email: userEmail
    });
  }
}, 30000); // Every 30 seconds
```

#### Active Users Display
```javascript
export const useActiveUsers = (sessionId) => {
  return useQuery({
    queryKey: ['activeUsers', sessionId],
    queryFn: () => sessionAPI.getActiveUsers(sessionId),
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!sessionId
  });
};
```

---

## Advanced Topics

### Testing

#### Unit Testing Session Service

```javascript
// tests/sessionService.test.js
import { sessionService } from '../api/services/sessionService.js';
import { Session, SessionParticipant } from '../api/models/index.js';

describe('SessionService', () => {
  beforeEach(async () => {
    await Session.deleteMany({});
    await SessionParticipant.deleteMany({});
  });

  describe('createSession', () => {
    it('should create session with owner participant', async () => {
      const sessionData = {
        name: 'Test Session',
        description: 'Test Description',
        creator: 'test@example.com'
      };

      const result = await sessionService.createSession(sessionData);
      
      expect(result.success).toBe(true);
      expect(result.session.creator).toBe('test@example.com');
      
      // Verify owner participant was created
      const participant = await SessionParticipant.findOne({
        sessionId: result.session.sessionId,
        userEmail: 'test@example.com'
      });
      
      expect(participant.role).toBe('owner');
      expect(participant.status).toBe('active');
    });
  });

  describe('inviteParticipant', () => {
    it('should only allow authorized users to invite', async () => {
      const session = await createTestSession();
      
      // Try to invite as non-participant
      const result = await sessionService.inviteParticipant(
        session.sessionId,
        'unauthorized@example.com',
        'viewer@example.com',
        'viewer'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });
  });
});
```

#### Integration Testing

```javascript
// tests/session.integration.test.js
import request from 'supertest';
import app from '../api/server.js';

describe('Session API Integration', () => {
  const testUser = 'integration@example.com';
  
  it('should handle complete session lifecycle', async () => {
    // 1. Create session
    const createResponse = await request(app)
      .post('/api/sessions')
      .set('x-user-email', testUser)
      .send({
        name: 'Integration Test Session',
        description: 'Testing complete flow',
        creator: testUser
      });
    
    expect(createResponse.status).toBe(201);
    const sessionId = createResponse.body.sessionId;
    
    // 2. Invite participant
    const inviteResponse = await request(app)
      .post(`/api/sessions/${sessionId}/invite`)
      .set('x-user-email', testUser)
      .send({
        email: testUser,
        inviteeEmail: 'participant@example.com',
        role: 'editor',
        inviterEmail: testUser
      });
    
    expect(inviteResponse.status).toBe(200);
    
    // 3. Check session participants
    const sessionResponse = await request(app)
      .get(`/api/sessions/${sessionId}`)
      .set('x-user-email', testUser);
    
    expect(sessionResponse.body.session.participants).toHaveLength(2);
    
    // 4. Delete session
    const deleteResponse = await request(app)
      .delete(`/api/sessions/${sessionId}`)
      .set('x-user-email', testUser)
      .send({ userEmail: testUser });
    
    expect(deleteResponse.status).toBe(200);
  });
});
```

#### Frontend Testing with React Testing Library

```javascript
// src/components/sessions/__tests__/SessionManager.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionManager } from '../SessionManager';
import * as sessionAPI from '../../api/sessionAPI';

// Mock API calls
jest.mock('../../api/sessionAPI');

describe('SessionManager', () => {
  let queryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderWithQuery = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should display sessions correctly', async () => {
    const mockSessions = [
      {
        sessionId: 'test-session-1',
        name: 'Test Session',
        creator: 'test@example.com',
        participants: []
      }
    ];

    sessionAPI.getUserSessions.mockResolvedValue(mockSessions);

    renderWithQuery(<SessionManager userEmail="test@example.com" />);

    await waitFor(() => {
      expect(screen.getByText('Test Session')).toBeInTheDocument();
    });
  });

  it('should handle session creation', async () => {
    sessionAPI.createSession.mockResolvedValue({
      sessionId: 'new-session',
      name: 'New Session'
    });

    renderWithQuery(<SessionManager userEmail="test@example.com" />);

    const createButton = screen.getByText('Create Session');
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText('Session Name');
    fireEvent.change(nameInput, { target: { value: 'New Session' } });

    const submitButton = screen.getByText('Create');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(sessionAPI.createSession).toHaveBeenCalledWith({
        name: 'New Session',
        creator: 'test@example.com'
      });
    });
  });
});
```

### Performance Optimization

#### Database Indexing Strategy

```javascript
// Recommended MongoDB indexes for optimal performance

// Session collection indexes
db.sessions.createIndex({ "sessionId": 1 }, { unique: true });
db.sessions.createIndex({ "creator": 1, "status": 1 });
db.sessions.createIndex({ "status": 1, "createdAt": -1 });

// SessionParticipant collection indexes
db.sessionparticipants.createIndex({ 
  "sessionId": 1, 
  "userEmail": 1 
}, { unique: true });
db.sessionparticipants.createIndex({ "userEmail": 1, "status": 1 });
db.sessionparticipants.createIndex({ "sessionId": 1, "status": 1 });
db.sessionparticipants.createIndex({ "lastActiveAt": -1 });

// Compound indexes for common queries
db.sessionparticipants.createIndex({ 
  "userEmail": 1, 
  "status": 1, 
  "role": 1 
});
```

#### Query Optimization

```javascript
// Optimized session fetching with aggregation
async getUserSessionsOptimized(userEmail) {
  return await Session.aggregate([
    // Match user's sessions
    {
      $lookup: {
        from: 'sessionparticipants',
        localField: 'sessionId',
        foreignField: 'sessionId',
        as: 'userParticipation'
      }
    },
    {
      $match: {
        'userParticipation.userEmail': userEmail,
        'userParticipation.status': 'active'
      }
    },
    // Join participant data
    {
      $lookup: {
        from: 'sessionparticipants',
        localField: 'sessionId',
        foreignField: 'sessionId',
        as: 'participants'
      }
    },
    // Filter active participants only
    {
      $addFields: {
        participants: {
          $filter: {
            input: '$participants',
            cond: { $eq: ['$$this.status', 'active'] }
          }
        }
      }
    },
    // Sort by creation date
    { $sort: { createdAt: -1 } },
    // Limit fields returned
    {
      $project: {
        sessionId: 1,
        name: 1,
        description: 1,
        creator: 1,
        status: 1,
        createdAt: 1,
        'participants.userEmail': 1,
        'participants.userName': 1,
        'participants.role': 1
      }
    }
  ]);
}
```

#### Caching Strategy

```javascript
// Redis caching for frequently accessed data
const redis = require('redis');
const client = redis.createClient();

class SessionCache {
  // Cache session data for 5 minutes
  static async getSession(sessionId) {
    const cached = await client.get(`session:${sessionId}`);
    if (cached) return JSON.parse(cached);
    
    const session = await Session.findOne({ sessionId });
    if (session) {
      await client.setex(`session:${sessionId}`, 300, JSON.stringify(session));
    }
    return session;
  }

  // Cache user permissions for 2 minutes
  static async getUserPermissions(sessionId, userEmail) {
    const key = `permissions:${sessionId}:${userEmail}`;
    const cached = await client.get(key);
    if (cached) return JSON.parse(cached);
    
    const permissions = await sessionService.getUserPermissions(sessionId, userEmail);
    await client.setex(key, 120, JSON.stringify(permissions));
    return permissions;
  }

  // Invalidate cache when session changes
  static async invalidateSession(sessionId) {
    const pattern = `*${sessionId}*`;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }
}
```

#### Frontend Performance Optimizations

```javascript
// Implement virtual scrolling for large session lists
import { FixedSizeList as List } from 'react-window';

const SessionList = ({ sessions, onSessionSelect }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <SessionCard 
        session={sessions[index]} 
        onSelect={onSessionSelect}
      />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={sessions.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  );
};

// Optimize re-renders with React.memo
const SessionCard = React.memo(({ session, onSelect }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  return prevProps.session.sessionId === nextProps.session.sessionId &&
         prevProps.session.updatedAt === nextProps.session.updatedAt;
});

// Debounce search queries
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
```

### Security Best Practices

#### Input Validation & Sanitization

```javascript
// Comprehensive input validation
const Joi = require('joi');

const sessionValidationSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    .required(),
  description: Joi.string()
    .trim()
    .max(500)
    .allow(''),
  creator: Joi.string()
    .email()
    .required()
});

const validateSessionInput = (data) => {
  const { error, value } = sessionValidationSchema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
  return value;
};

// Sanitize user input to prevent XSS
const DOMPurify = require('isomorphic-dompurify');

const sanitizeUserInput = (input) => {
  if (typeof input === 'string') {
    return DOMPurify.sanitize(input.trim());
  }
  return input;
};
```

#### Rate Limiting

```javascript
// Implement rate limiting for API endpoints
const rateLimit = require('express-rate-limit');

const sessionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter limits for creation/deletion
const sessionModificationLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    success: false,
    error: 'Too many session modifications, please try again later'
  }
});

// Apply to routes
app.use('/api/sessions', sessionRateLimit);
app.use('/api/sessions', sessionModificationLimit);
```

#### Security Headers & CORS

```javascript
// Security middleware setup
const helmet = require('helmet');
const cors = require('cors');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"]
    }
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Validate email format and domain
const validateEmailSecurity = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  
  // Optional: Check against allowed domains
  const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || [];
  if (allowedDomains.length > 0) {
    const domain = email.split('@')[1];
    if (!allowedDomains.includes(domain)) {
      throw new Error('Email domain not allowed');
    }
  }
  
  return email.toLowerCase();
};
```

#### Audit Logging

```javascript
// Comprehensive audit logging
const auditLogger = {
  logSessionAction(action, sessionId, userEmail, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      sessionId,
      userEmail,
      ip: details.ip,
      userAgent: details.userAgent,
      success: details.success !== false,
      error: details.error,
      metadata: details.metadata
    };
    
    // Log to file or external service
    console.log('AUDIT:', JSON.stringify(logEntry));
    
    // Store in database for compliance
    this.storeAuditLog(logEntry);
  },

  async storeAuditLog(logEntry) {
    // Store in dedicated audit collection
    await AuditLog.create(logEntry);
  }
};

// Usage in session operations
const deleteSession = async (req, res) => {
  try {
    await sessionService.deleteSession(sessionId, userEmail);
    
    auditLogger.logSessionAction('SESSION_DELETED', sessionId, userEmail, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });
    
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    auditLogger.logSessionAction('SESSION_DELETE_FAILED', sessionId, userEmail, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      error: error.message
    });
    
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Deployment Considerations

#### Environment Configuration

```javascript
// .env.production
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codelab
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://your-frontend-domain.com
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Change ownership
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 3001

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  codelab-api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped

  mongodb:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:
```

#### Health Checks & Monitoring

```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {}
  };

  try {
    // Check database connection
    await mongoose.connection.db.admin().ping();
    health.services.mongodb = 'healthy';
  } catch (error) {
    health.services.mongodb = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    // Check Redis connection
    await redis.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    activeConnections: server.connections || 0,
    timestamp: new Date().toISOString()
  };
  
  res.json(metrics);
});
```

### Troubleshooting Guide

#### Common Issues & Solutions

##### 1. Session Not Found Errors
```javascript
// Debug session access issues
const debugSessionAccess = async (sessionId, userEmail) => {
  console.log('Debugging session access...');
  
  // Check if session exists
  const session = await Session.findOne({ sessionId });
  console.log('Session found:', !!session);
  
  if (!session) {
    console.log('Session does not exist in database');
    return;
  }
  
  // Check participant record
  const participant = await SessionParticipant.findOne({
    sessionId,
    userEmail,
    status: 'active'
  });
  console.log('Participant found:', !!participant);
  
  if (!participant) {
    console.log('User is not an active participant');
    // Check if user was ever a participant
    const anyParticipant = await SessionParticipant.findOne({
      sessionId,
      userEmail
    });
    console.log('User was participant:', !!anyParticipant);
    if (anyParticipant) {
      console.log('Participant status:', anyParticipant.status);
    }
  }
};
```

##### 2. Permission Denied Issues
```javascript
// Debug permission issues
const debugPermissions = async (sessionId, userEmail, action) => {
  const participant = await SessionParticipant.findOne({
    sessionId,
    userEmail,
    status: 'active'
  });
  
  if (!participant) {
    console.log('No active participant found');
    return;
  }
  
  console.log('User role:', participant.role);
  console.log('Required action:', action);
  
  const hasPermission = permissions.hasPermission(participant.role, action);
  console.log('Has permission:', hasPermission);
  
  console.log('Available permissions for role:', 
    permissions.getRolePermissions(participant.role));
};
```

##### 3. Database Connection Issues
```javascript
// Database connection debugging
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

// Test database operations
const testDatabaseConnection = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    console.log('Database ping successful');
    
    const testDoc = await Session.findOne().limit(1);
    console.log('Database query successful');
    
    return true;
  } catch (error) {
    console.error('Database test failed:', error);
    return false;
  }
};
```

##### 4. Real-time Connection Issues
```javascript
// Socket.io debugging
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-session', (data) => {
    console.log('User joining session:', data);
    socket.join(data.sessionId);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, reason);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});
```

#### Logging Best Practices

```javascript
// Structured logging with Winston
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Usage throughout application
logger.info('Session created', { 
  sessionId, 
  creator: userEmail, 
  timestamp: new Date() 
});

logger.error('Session creation failed', { 
  error: error.message, 
  stack: error.stack,
  userEmail,
  sessionData 
});
```

---

## Migration Guide

### Upgrading from Legacy Systems

If migrating from an older session management system, follow these steps:

#### 1. Data Migration Script
```javascript
// migrate-sessions.js
const migrateLegacySessions = async () => {
  const legacySessions = await LegacySession.find({});
  
  for (const legacy of legacySessions) {
    // Create new session
    const newSession = new Session({
      sessionId: legacy.id || generateSessionId(),
      name: legacy.title || legacy.name,
      description: legacy.description || '',
      creator: legacy.owner || legacy.creator,
      status: legacy.active ? 'active' : 'archived',
      createdAt: legacy.created_at || new Date(),
      settings: {
        maxParticipants: 50,
        allowSelfInvite: false,
        isPrivate: legacy.private || false
      }
    });
    
    await newSession.save();
    
    // Migrate participants
    if (legacy.participants) {
      for (const participant of legacy.participants) {
        await SessionParticipant.create({
          sessionId: newSession.sessionId,
          userEmail: participant.email,
          userName: participant.name || participant.email.split('@')[0],
          role: participant.isOwner ? 'owner' : 
                participant.isAdmin ? 'admin' : 'editor',
          status: 'active',
          joinedAt: participant.joined_at || new Date()
        });
      }
    }
  }
};
```

#### 2. API Version Compatibility
```javascript
// Support both old and new API endpoints during transition
app.use('/api/v1/sessions', legacySessionRoutes);
app.use('/api/sessions', newSessionRoutes);

// Legacy endpoint wrapper
const legacyWrapper = (newHandler) => {
  return async (req, res) => {
    // Transform legacy request format
    const transformedReq = transformLegacyRequest(req);
    
    // Call new handler
    const result = await newHandler(transformedReq, res);
    
    // Transform response to legacy format if needed
    if (req.headers['api-version'] === '1.0') {
      return transformToLegacyResponse(result, res);
    }
    
    return result;
  };
};
```

---

This comprehensive documentation now covers all aspects of the session management system, from basic usage to advanced deployment considerations. The guide provides developers with everything they need to understand, implement, test, and deploy the session management features effectively.

For any specific questions or issues not covered in this guide, refer to the troubleshooting section or examine the source code files mentioned throughout the documentation.
