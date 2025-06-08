# User Data Management Strategy for CodeLab
## Cognito Integration with Backend User Models

## Executive Summary

This document outlines the comprehensive strategy for implementing user data management in CodeLab, bridging the gap between AWS Cognito authentication and backend user models while maintaining the existing session-based architecture and addressing security concerns.

**Current State**: 
- AWS Cognito handles authentication and user registration
- User information extracted from email addresses (`email.split('@')[0]`)
- No dedicated backend User model/collection
- Session management uses email-based identification
- Security vulnerabilities identified in token storage

**Target State**:
- Hybrid authentication system with Cognito + backend User models
- Secure token management with HttpOnly cookies
- Rich user profiles with preferences and activity tracking
- Enhanced session management with user relationships
- GDPR-compliant data management

## 1. Current Architecture Analysis

### Authentication Flow
```
User Registration → AWS Cognito User Pool → Email Verification → Login
Login → Cognito Tokens → localStorage Storage → Session Access
```

### Data Sources
- **AWS Cognito**: User authentication, email, name attributes
- **MongoDB Collections**: Session, SessionParticipant, SessionManagement (legacy)
- **Local Storage**: Tokens, email, user preferences
- **Client-side**: User information extracted from email addresses

### Identified Gaps
1. **No Backend User Model**: User data not persisted in MongoDB
2. **Limited User Profiles**: Only email and derived name available
3. **Security Vulnerabilities**: Tokens in localStorage, no session timeouts
4. **Data Fragmentation**: User info scattered across Cognito and client
5. **No User Relationships**: Cannot track user activity, preferences, or history

## 2. Recommended User Data Management Strategy

### Strategy: **Hybrid Cognito + Backend User Model**

This approach maintains Cognito for authentication while creating a comprehensive backend user management system.

#### Benefits
- ✅ Leverages existing Cognito infrastructure
- ✅ Maintains authentication security
- ✅ Enables rich user profiles and relationships
- ✅ Supports advanced features (preferences, activity tracking)
- ✅ Provides data ownership and GDPR compliance
- ✅ Allows offline user data access
- ✅ Enables user-centric features and analytics

#### Implementation Approach
1. **User Model Creation**: New MongoDB User collection
2. **Sync Mechanism**: Cognito → Backend user sync on login
3. **Profile Enhancement**: Extended user profiles beyond Cognito
4. **Session Integration**: Link sessions to User model instead of raw emails
5. **Security Improvements**: Implement secure token management

## 3. Database Schema Design

### New User Model (`api/models/User.js`)

```javascript
const UserSchema = new mongoose.Schema({
  // Core identity (from Cognito)
  cognitoId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    index: true
  },
  
  // Profile information
  profile: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    displayName: {
      type: String,
      trim: true
    },
    avatar: {
      url: String,
      provider: {
        type: String,
        enum: ['gravatar', 'upload', 'generated'],
        default: 'generated'
      }
    },
    bio: {
      type: String,
      maxlength: 500,
      trim: true
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    language: {
      type: String,
      default: 'en'
    }
  },

  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'dark'
    },
    notifications: {
      email: {
        sessionInvites: { type: Boolean, default: true },
        sessionActivity: { type: Boolean, default: false },
        weeklyDigest: { type: Boolean, default: true }
      },
      push: {
        realTimeUpdates: { type: Boolean, default: true },
        collaboratorJoined: { type: Boolean, default: true }
      }
    },
    editor: {
      fontSize: { type: Number, default: 14 },
      fontFamily: { type: String, default: 'Monaco' },
      tabSize: { type: Number, default: 2 },
      wordWrap: { type: Boolean, default: true },
      minimap: { type: Boolean, default: true }
    },
    collaboration: {
      showCursors: { type: Boolean, default: true },
      showUserNames: { type: Boolean, default: true },
      autoSaveInterval: { type: Number, default: 30000 }
    }
  },

  // Activity tracking
  activity: {
    lastLogin: Date,
    lastActiveAt: Date,
    loginCount: { type: Number, default: 0 },
    sessionsCreated: { type: Number, default: 0 },
    sessionsJoined: { type: Number, default: 0 },
    totalCollaborationTime: { type: Number, default: 0 }, // in minutes
    favoriteLanguages: [String]
  },

  // Relationships
  relationships: {
    blockedUsers: [String], // Array of user emails
    frequentCollaborators: [{
      email: String,
      collaborationCount: Number,
      lastCollaborated: Date
    }]
  },

  // Account status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active'
  },
  
  // Verification status (synced from Cognito)
  verified: {
    email: { type: Boolean, default: false },
    phone: { type: Boolean, default: false }
  },

  // Security
  security: {
    lastPasswordChange: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    suspiciousActivityCount: { type: Number, default: 0 },
    lastSuspiciousActivity: Date
  },

  // GDPR compliance
  gdpr: {
    dataProcessingConsent: { type: Boolean, default: false },
    marketingConsent: { type: Boolean, default: false },
    consentDate: Date,
    dataRetentionUntil: Date
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes for performance
UserSchema.index({ email: 1, status: 1 });
UserSchema.index({ 'activity.lastActiveAt': -1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'profile.name': 'text', email: 'text' });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return this.profile.displayName || this.profile.name;
});

// Method to check if user is active
UserSchema.methods.isActive = function() {
  return this.status === 'active' && this.verified.email;
};

// Method to update last activity
UserSchema.methods.updateActivity = function() {
  this.activity.lastActiveAt = new Date();
  return this.save();
};

// Static method to find by email
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), status: 'active' });
};

module.exports = mongoose.model('User', UserSchema);
```

### Updated Session Models Integration

#### Modified Session Model
```javascript
// Add user relationship to Session model
const SessionSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // Enhanced creator field
  creator: {
    email: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // User statistics
  stats: {
    totalUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    totalEditTime: { type: Number, default: 0 },
    lastActivity: Date
  }
});
```

#### Modified SessionParticipant Model
```javascript
// Add user relationship to SessionParticipant
const SessionParticipantSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Enhanced activity tracking
  activityMetrics: {
    editTime: { type: Number, default: 0 }, // minutes
    charactersTyped: { type: Number, default: 0 },
    filesModified: [String],
    lastEditAt: Date
  }
});
```

## 4. Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal**: Create User model and basic sync mechanism

#### Day 1-2: Database Setup
1. **Create User Model**
   ```bash
   # File: api/models/User.js
   # Implement complete User schema
   ```

2. **Create User Service**
   ```bash
   # File: api/services/userService.js
   # Core user operations: create, update, find, sync
   ```

3. **Database Migration Script**
   ```bash
   # File: api/scripts/migrate-users.js
   # Create users from existing session participants
   ```

#### Day 3-4: Cognito Integration
1. **User Sync Middleware**
   ```javascript
   // File: api/middleware/userSync.js
   const syncUserFromCognito = async (req, res, next) => {
     const { email } = req.body;
     let user = await User.findByEmail(email);
     
     if (!user) {
       // Create user from Cognito data
       user = await userService.createFromCognito(email);
     } else {
       // Update last login
       await user.updateActivity();
     }
     
     req.user = user;
     next();
   };
   ```

2. **Authentication Enhancement**
   ```javascript
   // File: api/middleware/auth.js
   // Update requireAuth to include user sync
   ```

#### Day 5-7: Basic Integration
1. **Update Session Service**
   ```javascript
   // Link sessions to User model instead of raw emails
   ```

2. **API Updates**
   ```javascript
   // Update session endpoints to use User references
   ```

### Phase 2: Security Implementation (Week 2)
**Goal**: Implement secure authentication based on HIGH_PRIORITY_SECURITY_IMPROVEMENTS.md

#### Day 1-3: Secure Token Management
1. **HttpOnly Cookies Implementation**
   ```javascript
   // File: api/middleware/secureAuth.js
   // Replace localStorage tokens with secure cookies
   ```

2. **CSRF Protection**
   ```javascript
   // File: api/middleware/csrf.js
   // Implement CSRF tokens with cookie-based auth
   ```

3. **Frontend Authentication Update**
   ```javascript
   // File: src/utils/secureAuth.js
   // Update auth utilities for cookie-based authentication
   ```

#### Day 4-7: Enhanced Security
1. **Rate Limiting**
   ```javascript
   // File: api/middleware/rateLimiting.js
   // Implement per-user rate limiting
   ```

2. **Session Security**
   ```javascript
   // File: api/middleware/sessionSecurity.js
   // Automatic session timeouts and validation
   ```

3. **Activity Monitoring**
   ```javascript
   // File: api/services/securityService.js
   // Track suspicious activity and implement lockouts
   ```

### Phase 3: User Experience Enhancement (Week 3)
**Goal**: Implement user profiles and preferences

#### Day 1-3: User Profiles
1. **Profile Management API**
   ```javascript
   // File: api/controllers/userController.js
   // Profile CRUD operations
   ```

2. **Avatar System**
   ```javascript
   // File: api/services/avatarService.js
   // Gravatar integration and upload handling
   ```

3. **Profile UI Components**
   ```jsx
   // File: src/components/user/UserProfile.jsx
   // User profile management interface
   ```

#### Day 4-7: Preferences & Settings
1. **Preferences API**
   ```javascript
   // File: api/controllers/preferencesController.js
   // User preferences management
   ```

2. **Settings UI**
   ```jsx
   // File: src/components/user/UserSettings.jsx
   // Comprehensive settings interface
   ```

3. **Theme & Editor Integration**
   ```javascript
   // File: src/hooks/useUserPreferences.js
   // React hook for user preferences
   ```

### Phase 4: Advanced Features (Week 4)
**Goal**: Implement user relationships and analytics

#### Day 1-3: User Relationships
1. **Collaboration Tracking**
   ```javascript
   // File: api/services/collaborationService.js
   // Track user interactions and build relationships
   ```

2. **User Discovery**
   ```javascript
   // File: api/controllers/discoveryController.js
   // Find frequent collaborators, suggest users
   ```

#### Day 4-7: Analytics & Insights
1. **Activity Analytics**
   ```javascript
   // File: api/services/analyticsService.js
   // User activity insights and statistics
   ```

2. **Dashboard Components**
   ```jsx
   // File: src/components/analytics/UserDashboard.jsx
   // Personal analytics dashboard
   ```

## 5. Security Implementation Details

### Secure Authentication Flow
```
1. User Login → Cognito Authentication
2. Server receives Cognito tokens → Validates with AWS
3. Creates/Updates User in MongoDB → Syncs profile data
4. Issues secure HttpOnly cookie → Stores session reference
5. Client receives cookie → Automatic inclusion in requests
6. Server validates cookie → Retrieves user session
7. Session timeout → Automatic cleanup and re-authentication
```

### Token Management Strategy
```javascript
// Replace current localStorage approach
// From: localStorage.setItem("accessToken", result.accessToken);
// To: Secure server-side session management

// File: api/middleware/secureAuth.js
const issueSecureSession = async (user, res) => {
  const sessionId = generateSecureId();
  const sessionData = {
    userId: user._id,
    email: user.email,
    cognitoId: user.cognitoId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  };
  
  // Store in Redis or MongoDB
  await sessionStorage.create(sessionId, sessionData);
  
  // Set secure cookie
  res.cookie('session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });
};
```

## 6. Migration Strategy

### Data Migration Plan
1. **Phase 1**: Create User records from existing session participants
2. **Phase 2**: Update all session references to use User IDs
3. **Phase 3**: Migrate authentication to secure cookie system
4. **Phase 4**: Clean up legacy authentication code

### Migration Script
```javascript
// File: api/scripts/migrate-to-user-model.js
const migrateToUserModel = async () => {
  // 1. Find all unique email addresses from sessions
  const uniqueEmails = await SessionParticipant.distinct('userEmail');
  
  // 2. Create User records for each email
  for (const email of uniqueEmails) {
    const existingUser = await User.findByEmail(email);
    if (!existingUser) {
      await User.create({
        cognitoId: `migrated_${Date.now()}_${email}`,
        email: email,
        profile: {
          name: email.split('@')[0],
          displayName: email.split('@')[0]
        },
        verified: { email: true },
        status: 'active'
      });
    }
  }
  
  // 3. Update SessionParticipant records with User references
  const users = await User.find();
  for (const user of users) {
    await SessionParticipant.updateMany(
      { userEmail: user.email },
      { userId: user._id }
    );
  }
  
  // 4. Update Session creator references
  for (const user of users) {
    await Session.updateMany(
      { creator: user.email },
      { 
        'creator.email': user.email,
        'creator.userId': user._id
      }
    );
  }
};
```

## 7. API Integration Examples

### User Authentication Flow
```javascript
// File: src/hooks/useAuth.js
import { useQuery, useMutation } from '@tanstack/react-query';

export const useAuth = () => {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {
        credentials: 'include' // Include cookies
      });
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      // 1. Authenticate with Cognito
      const cognitoResult = await login(email, password);
      
      // 2. Exchange for secure session
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cognitoTokens: cognitoResult,
          email
        })
      });
      
      return response.json();
    }
  });

  return { user, isLoading, login: loginMutation };
};
```

### User Profile Management
```javascript
// File: src/hooks/useUserProfile.js
export const useUserProfile = () => {
  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => fetch('/api/user/profile', { credentials: 'include' })
      .then(res => res.json())
  });

  const updateProfile = useMutation({
    mutationFn: (updates) => 
      fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
    }
  });

  return { profile, updateProfile };
};
```

## 8. Benefits of This Strategy

### Immediate Benefits
- **Security**: Eliminates XSS vulnerabilities from localStorage tokens
- **User Experience**: Rich profiles and personalized experiences
- **Data Integrity**: Centralized user data management
- **Performance**: Efficient user lookups and caching

### Long-term Benefits
- **Scalability**: Supports advanced user features and analytics
- **Compliance**: GDPR-ready data management
- **Integrations**: Easy third-party service integration
- **Insights**: User behavior analytics and recommendations

### Business Value
- **User Retention**: Personalized experiences increase engagement
- **Feature Development**: User model enables advanced collaborative features
- **Analytics**: Understanding user behavior for product improvements
- **Security**: Enterprise-grade security builds trust

## 9. Risk Mitigation

### Technical Risks
- **Migration Complexity**: Phased approach with rollback plans
- **Data Consistency**: Comprehensive testing and validation
- **Performance Impact**: Database indexing and query optimization
- **Security Vulnerabilities**: Regular security audits and updates

### Mitigation Strategies
- **Gradual Rollout**: Feature flags for controlled deployment
- **Data Backup**: Full backups before each migration phase
- **Monitoring**: Real-time alerting for system health
- **Testing**: Comprehensive test coverage for all changes

## 10. Success Metrics

### Technical Metrics
- **Authentication Success Rate**: >99.5%
- **Session Management Reliability**: Zero unauthorized access
- **Database Performance**: <100ms average query time
- **Security Incident Count**: Zero security breaches

### User Experience Metrics
- **User Profile Completion**: >80%
- **Feature Adoption**: >60% of users customize preferences
- **Session Duration**: Increase in average collaboration time
- **User Satisfaction**: >4.5/5 in security confidence surveys

## Conclusion

This comprehensive user data management strategy transforms CodeLab from a basic email-based system to a sophisticated user-centric platform while maintaining security and performance. The hybrid approach leverages existing Cognito infrastructure while adding the flexibility and power of backend user models.

The phased implementation ensures minimal disruption while delivering immediate security improvements and long-term feature capabilities. This foundation enables CodeLab to scale as a collaborative platform with rich user experiences and enterprise-grade security.

**Next Steps**:
1. Review and approve this strategy document
2. Begin Phase 1 implementation with User model creation
3. Implement security improvements from HIGH_PRIORITY_SECURITY_IMPROVEMENTS.md
4. Plan gradual rollout with user feedback integration

This strategy positions CodeLab for sustainable growth while addressing current security concerns and enabling future collaborative features.
