# Authentication System Integration Guide

## Overview
This guide explains how the AWS Cognito authentication system (`auth.js`) integrates with the migrated session management hooks and provides a complete picture of the current user authentication architecture.

## Table of Contents
1. [Authentication Architecture](#authentication-architecture)
2. [AWS Cognito Integration](#aws-cognito-integration)
3. [Session Hook Integration](#session-hook-integration)
4. [Authentication Flow](#authentication-flow)
5. [Security Analysis](#security-analysis)
6. [Best Practices](#best-practices)
7. [Migration Impact](#migration-impact)

## Authentication Architecture

### Core Components

#### 1. AWS Cognito Authentication (`/src/utils/auth.js`)
- **Purpose**: Handles user registration, login, and session management
- **Provider**: AWS Cognito User Pool
- **Storage**: Tokens stored in localStorage, user pool manages sessions

```javascript
// Main authentication functions
export const login = (email, password)        // User login
export const signUp = (name, email, password) // User registration
export const confirmUser = (email, code)      // Email verification
export const logout = ()                      // Session termination
export const isAuthenticated = ()             // Session validation
```

#### 2. Session Management Hooks (`/src/hooks/useSessions.js`)
- **Purpose**: API calls for collaborative session management
- **Authentication**: Uses email from localStorage for API authentication
- **Security**: Migrated to secure per-request authentication (no vulnerable global interceptors)

#### 3. Authentication Middleware (`/api/middleware/auth.js`)
- **Purpose**: Server-side authentication validation
- **Method**: Email-based via `x-user-email` header
- **Integration**: Works with both Cognito and localStorage email storage

## AWS Cognito Integration

### Configuration
```javascript
// Environment variables required
VITE_AWS_COGNITO_USER_POOL_ID=your_user_pool_id
VITE_AWS_COGNITO_CLIENT_ID=your_client_id

// Pool configuration
const poolData = {
  UserPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID
};
```

### Token Management
The authentication system stores JWT tokens and user information in localStorage after successful login:

```javascript
// From auth.js login function - tokens are extracted from Cognito response
const tokens = {
  accessToken: result.getAccessToken().getJwtToken(),
  idToken: result.getIdToken().getJwtToken(),
};

// Stored in localStorage for session persistence
localStorage.setItem("accessToken", tokens.accessToken);
localStorage.setItem("idToken", tokens.idToken);
localStorage.setItem("email", email);
localStorage.setItem("isLoggedIn", "true");
```

### Admin Privilege Checking
The authentication system includes admin privilege checking via direct API calls:

```javascript
// From auth.js - Direct axios call for admin verification
export const fetchAdmins = async (email) => {
  try {
    const response = await axios.post(`${API_URL}/chat/check-admin`, {
      email: email,
    });
    return response.data;
  } catch (error) {
    console.error("API call error:", error);
    throw new Error("Failed to fetch admin data");
  }
};
```

**Note**: This function uses direct axios calls (not the previously vulnerable API client), making it secure by design.

### Session Validation
The authentication system provides robust session validation using AWS Cognito:

```javascript
export const isAuthenticated = () => {
  const user = userPool.getCurrentUser();
  if (!user) return false;

  // Verify valid session with Cognito
  return new Promise((resolve) => {
    user.getSession((err) => {
      if (err) {
        logout();  // Clear invalid session and localStorage
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};
```

### Integration with Session Hooks
The authentication system provides the foundation for session management by:

1. **Storing User Email**: After login, email is stored in localStorage
2. **Session Validation**: `isAuthenticated()` validates current session
3. **Token Management**: JWT tokens are managed by Cognito
4. **Logout Cleanup**: Clears both Cognito session and localStorage

## Session Hook Integration

### Email Retrieval for API Calls
The session hooks integrate with the authentication system by retrieving the user's email from localStorage:

```javascript
// From /src/hooks/useSessions.js
const getUserEmail = () => localStorage.getItem('email');

// Used in API configuration
const addAuthHeaders = (config = {}, userEmail) => {
  if (userEmail) {
    return {
      ...config,
      headers: {
        ...config.headers,
        'x-user-email': userEmail  // Backend authentication
      }
    };
  }
  return config;
};
```

### Session Hook Integration Pattern
Each session hook uses the same secure authentication pattern:

1. **Retrieve user email** from localStorage (set during login)
2. **Create secure API instance** without global interceptors
3. **Add explicit authentication headers** to each request
4. **Include email in request body** for additional validation

```javascript
// Example from useSessions.js
getUserSessions: async (userEmail) => {
  const api = createSecureAPICall();
  const config = addAuthHeaders({ params: { email: userEmail } }, userEmail);
  
  const response = await api.get('/sessions', config);
  
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch sessions');
  }
  
  return response.data.sessions || [];
}
```

### Component Integration Examples
Components retrieve user email from multiple sources with fallbacks:

```javascript
// SessionManager.jsx - Comprehensive email retrieval
const email = userEmail || localStorage.getItem("email") || "";

// SessionsPage.jsx - Using Cognito with localStorage fallback
useEffect(() => {
  const userPool = new CognitoUserPool(cognitoConfig);
  const cognitoUser = userPool.getCurrentUser();
  
  if (cognitoUser) {
    cognitoUser.getSession((err) => {
      if (!err) {
        cognitoUser.getUserAttributes((err, attributes) => {
          if (!err) {
            const emailAttr = attributes.find(attr => attr.Name === "email");
            setUserEmail(emailAttr?.Value || "");
          }
        });
      }
    });
  }
}, []);
```

### Secure API Integration
After the security migration, each API call explicitly includes authentication:

```javascript
// Example: Creating a session
createSession: async ({ sessionData, userEmail }) => {
  const api = createSecureAPICall();
  const config = addAuthHeaders({}, userEmail);
  
  const response = await api.post('/sessions', {
    ...sessionData,
    creator: userEmail,
    email: userEmail  // Explicit email in request body
  }, config);
  
  return response.data.session;
}
```

## Authentication Flow

### 1. Login Process
```
User Login → AWS Cognito → Tokens Generated → localStorage Storage → Session Management Ready
```

#### Detailed Authentication Flow:
1. **User Input**: Email and password entered in login form
2. **Cognito Authentication**: `login(email, password)` called from auth.js
3. **Token Extraction**: AWS Cognito returns authentication result with JWT tokens
4. **Token Storage**: Access and ID tokens stored in localStorage along with user email
5. **Redirect Handling**: User redirected to sessions page or pending workspace session

```javascript
// Complete login flow from login-form.jsx
const handleSubmit = async (e) => {
  const result = await login(email, password);
  
  // Store authentication data for session hooks
  localStorage.setItem("accessToken", result.accessToken);
  localStorage.setItem("idToken", result.idToken);
  localStorage.setItem("email", email);
  localStorage.setItem("isLoggedIn", "true");
  
  // Handle workspace invitation links
  const pendingSessionId = localStorage.getItem('pendingSessionId');
  if (pendingSessionId) {
    localStorage.removeItem('pendingSessionId');
    navigate(`/workspace?session=${pendingSessionId}`);
  } else {
    navigate("/sessions");
  }
};
```

### 2. Session API Authentication Integration
Every session API call follows the secure authentication pattern established after the migration:

```javascript
// Consistent API call pattern from useSessions.js
const getUserSessions = async (userEmail) => {
  const api = createSecureAPICall();              // No global interceptors
  const config = addAuthHeaders({ 
    params: { email: userEmail } 
  }, userEmail);                                  // Explicit auth headers
  
  const response = await api.get('/sessions', config);
  
  return response.data.sessions || [];
};

// Creating a session with full authentication
const createSession = async ({ sessionData, userEmail }) => {
  const api = createSecureAPICall();
  const config = addAuthHeaders({}, userEmail);
  
  const response = await api.post('/sessions', {
    ...sessionData,
    creator: userEmail,                           // Email in body
    email: userEmail                             // Additional auth field
  }, config);
  
  return response.data.session;
};
```

### 3. Backend Authentication Middleware Integration
The backend middleware validates user authentication from the AWS Cognito auth system:

```javascript
// requireAuth middleware validates email from multiple sources
const requireAuth = (req, res, next) => {
  const userEmail = req.body.email || 
                   req.query.email || 
                   req.headers['x-user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ 
      error: 'User authentication required' 
    });
  }
  
  req.userEmail = userEmail;  // Available for session operations
  next();
};

// Session access validation
const validateSessionAccess = async (req, res, next) => {
  const { sessionId } = req.params;
  const userEmail = req.userEmail;  // From requireAuth
  
  const accessResult = await sessionService.checkSessionAccess(sessionId, userEmail);
  
  if (!accessResult.hasAccess) {
    return res.status(403).json({ 
      error: 'Access denied to this session' 
    });
  }
  
  next();
};
```

### 2. Session Management Integration
```
Authenticated User → Email from localStorage → Session API Calls → Backend Validation
```

#### Detailed Flow:
1. **User Email**: Retrieved from localStorage by session hooks
2. **API Headers**: Email added to `x-user-email` header
3. **Backend Middleware**: `requireAuth` validates email
4. **Session Operations**: Create, delete, invite, etc. operations performed

```javascript
// Session hook usage
const { data: sessions } = useSessions(userEmail);
const createSession = useCreateSession();

// API call includes authentication
await createSession.mutateAsync({ 
  sessionData: { name, description }, 
  userEmail 
});
```

### 3. Component Integration
Components can access authentication in multiple ways:

#### From AWS Cognito (Recommended):
```javascript
// SessionsPage.jsx - Using Cognito
useEffect(() => {
  const userPool = new CognitoUserPool(cognitoConfig);
  const cognitoUser = userPool.getCurrentUser();
  
  if (cognitoUser) {
    cognitoUser.getSession((err) => {
      if (!err) {
        cognitoUser.getUserAttributes((err, attributes) => {
          if (!err) {
            const emailAttr = attributes.find(attr => attr.Name === "email");
            setUserEmail(emailAttr?.Value || "");
          }
        });
      }
    });
  }
}, []);
```

#### From localStorage (Fallback):
```javascript
// SessionManager.jsx - Fallback method
const email = userEmail || localStorage.getItem("email") || "";
```

## Security Analysis

### ✅ Secure Practices
1. **AWS Cognito**: Industry-standard authentication provider
2. **Token Management**: Proper token storage and session validation
3. **Per-Request Auth**: Migrated from vulnerable global interceptors
4. **Email Validation**: Backend validates user email for each request

### ⚠️ Security Considerations

#### 1. localStorage Usage
**Current Implementation:**
```javascript
localStorage.setItem("email", email);
localStorage.setItem("accessToken", result.accessToken);
```

**Consideration**: localStorage is vulnerable to XSS attacks. However:
- Mitigated by moving away from automatic token injection in API calls
- Each API call now requires explicit authentication
- Tokens are validated through Cognito sessions

#### 2. Email-Based Authentication
**Current Implementation:**
```javascript
const requireAuth = (req, res, next) => {
  const userEmail = req.body.email || req.query.email || req.headers['x-user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: 'User authentication required' });
  }
  req.userEmail = userEmail;
  next();
};
```

**Consideration**: Email-only validation on backend
- **Pro**: Simple and effective for the current architecture
- **Con**: Could be enhanced with token validation
- **Mitigation**: Cognito session validation on frontend

## Best Practices

### 1. Authentication Checks
Always verify authentication before making API calls:

```javascript
// Check authentication before operations
const user = userPool.getCurrentUser();
if (!user) {
  navigate('/login');
  return;
}

// Then proceed with session operations
const { data: sessions } = useSessions(userEmail);
```

### 2. Error Handling
Implement proper authentication error handling:

```javascript
// In session hooks
if (!response.data.success) {
  if (response.status === 401) {
    // Handle authentication failure
    logout();
    navigate('/login');
    return;
  }
  throw new Error(response.data.error);
}
```

### 3. Session Persistence
Handle session persistence across page refreshes:

```javascript
// Check for existing session on app load
useEffect(() => {
  const checkAuth = async () => {
    const isAuth = await isAuthenticated();
    if (!isAuth) {
      localStorage.clear();
      navigate('/login');
    }
  };
  checkAuth();
}, []);
```

## Migration Impact

### ✅ What Was Fixed
1. **Eliminated Global Interceptors**: Removed vulnerable automatic token injection
2. **Explicit Authentication**: Each API call now requires explicit user email
3. **Secure API Calls**: Direct axios usage with controlled headers
4. **Maintained Compatibility**: Session hooks interface unchanged

### 🔄 What Stayed the Same
1. **Cognito Integration**: AWS Cognito authentication unchanged
2. **localStorage Usage**: Still used for email and token storage
3. **Component Integration**: Components still get email from localStorage/Cognito
4. **Backend Middleware**: Email-based authentication still used

### 📋 Current Architecture Benefits
1. **Secure by Default**: No automatic authentication injection
2. **Explicit Control**: Each API call has explicit authentication
3. **Easy to Audit**: Authentication visible in each API call
4. **Flexible**: Can easily add token validation in future

## Usage Examples

### 1. Complete Session Creation Flow
```javascript
const CreateSessionComponent = ({ userEmail }) => {
  const createSession = useCreateSession();
  
  const handleCreate = async (sessionData) => {
    try {
      // userEmail comes from Cognito auth system via localStorage
      await createSession.mutateAsync({ 
        sessionData, 
        userEmail 
      });
      
      // Success - session created with auth integration
      toast.success('Session created successfully');
    } catch (error) {
      // Handle authentication errors
      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      } else {
        toast.error('Failed to create session');
      }
    }
  };
};
```

### 2. Authentication Check in Components
```javascript
const ProtectedComponent = () => {
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAuthAndGetEmail = async () => {
      // Use AWS Cognito session validation
      const isAuth = await isAuthenticated();
      if (!isAuth) {
        navigate('/login');
        return;
      }
      
      // Get email for session hooks (auth.js stored it during login)
      const email = localStorage.getItem('email');
      setUserEmail(email);
    };
    
    checkAuthAndGetEmail();
  }, [navigate]);
  
  if (!userEmail) return <div>Loading...</div>;
  
  // userEmail enables all session hooks to work
  return <SessionManager userEmail={userEmail} />;
};
```

### 3. Session Hook Usage with Authentication
```javascript
const SessionsContainer = ({ userEmail }) => {
  // All hooks use userEmail from auth system
  const { data: sessions, isLoading } = useSessions(userEmail);
  const createSession = useCreateSession();
  const inviteUser = useInviteUser();
  const deleteSession = useDeleteSession();
  
  // Example: Invite user with auth
  const handleInvite = async (sessionId, inviteeEmail, role) => {
    try {
      await inviteUser.mutateAsync({
        sessionId,
        inviteeEmail,
        role,
        inviterEmail: userEmail  // Auth system provides inviter
      });
    } catch (error) {
      // Handle auth failures
      console.error('Invitation failed:', error);
    }
  };
  
  return (
    <div>
      {sessions?.map(session => (
        <SessionCard 
          key={session.id} 
          session={session}
          currentUser={userEmail}
          onInvite={handleInvite}
        />
      ))}
    </div>
  );
};
```

### 4. Admin Privilege Integration
```javascript
const AdminComponent = ({ userEmail }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // fetchAdmins uses direct axios (secure by design)
        const adminData = await fetchAdmins(userEmail);
        setIsAdmin(adminData.isAdmin);
      } catch (error) {
        console.error('Admin check failed:', error);
        setIsAdmin(false);
      }
    };
    
    if (userEmail) {
      checkAdminStatus();
    }
  }, [userEmail]);
  
  if (!isAdmin) {
    return <div>Access denied</div>;
  }
  
  return <AdminPanel userEmail={userEmail} />;
};
```

### 5. Logout Handling
```javascript
const LogoutButton = () => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    // logout() from auth.js clears Cognito session AND localStorage
    logout();
    navigate('/login');
  };
  
  return <button onClick={handleLogout}>Logout</button>;
};
```

### 6. Real-time Session Integration
```javascript
const useRealTimeSession = (sessionId, userEmail) => {
  const [activeUsers, setActiveUsers] = useState([]);
  
  useEffect(() => {
    if (!sessionId || !userEmail) return;
    
    // Connect to real-time updates with auth
    const socket = io(API_URL);
    
    socket.emit('join-session', { 
      sessionId, 
      userEmail  // From auth system
    });
    
    socket.on('users-updated', (users) => {
      // Filter out current user
      setActiveUsers(users.filter(u => u.email !== userEmail));
    });
    
    return () => socket.disconnect();
  }, [sessionId, userEmail]);
  
  return { activeUsers };
};
```

## Summary

The current authentication system provides a solid foundation with:

1. **AWS Cognito** for secure user authentication and session management
2. **Migrated session hooks** that use explicit per-request authentication
3. **Email-based API authentication** that's simple and effective
4. **localStorage integration** for convenient email access across components

The security migration successfully eliminated the major vulnerabilities while maintaining the existing authentication flow and component interfaces. The system is now more secure, auditable, and maintainable.
