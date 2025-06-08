# AWS Cognito Architecture Optimization Plan

## Current Issues

1. **Dual User Management**: Cognito handles authentication while a custom User model handles user data
2. **Complex Backend Auth**: JWT sessions, HTTP-only cookies, and complex middleware
3. **Over-engineered User Model**: 400+ lines with GDPR, preferences, activity tracking
4. **Authentication Complexity**: Multiple auth paths and fallback mechanisms

## Recommended Architecture

### Phase 1: Cognito User Attributes Enhancement

Replace custom User model fields with Cognito custom attributes:

```javascript
// Enhanced Cognito User Attributes
const userAttributes = [
  new CognitoUserAttribute({ Name: "name", Value: name }),
  new CognitoUserAttribute({ Name: "email", Value: email }),
  
  // Profile attributes
  new CognitoUserAttribute({ Name: "custom:displayName", Value: displayName }),
  new CognitoUserAttribute({ Name: "custom:avatar", Value: avatarUrl }),
  new CognitoUserAttribute({ Name: "custom:bio", Value: bio }),
  new CognitoUserAttribute({ Name: "custom:timezone", Value: timezone }),
  new CognitoUserAttribute({ Name: "custom:language", Value: language }),
  
  // Preferences as JSON strings
  new CognitoUserAttribute({ Name: "custom:theme", Value: "dark" }),
  new CognitoUserAttribute({ Name: "custom:editorPrefs", Value: JSON.stringify(editorPrefs) }),
  new CognitoUserAttribute({ Name: "custom:notificationPrefs", Value: JSON.stringify(notificationPrefs) }),
  
  // Subscription tier
  new CognitoUserAttribute({ Name: "custom:subscriptionTier", Value: "free" }),
];
```

### Phase 2: Simplified Backend User Model

```javascript
// Minimal User Model - Only for session relationships
const UserSchema = new mongoose.Schema({
  // Core identity (from Cognito)
  cognitoId: { type: String, unique: true, required: true, index: true },
  email: { type: String, unique: true, required: true, lowercase: true, index: true },
  
  // Session relationships only
  createdSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }],
  participatingSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }],
  
  // Minimal activity tracking
  lastActiveAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });
```

### Phase 3: Cognito-Native Authentication

Replace complex JWT middleware with Cognito JWT verification:

```javascript
// Simplified Auth Middleware using Cognito JWT
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const cognitoJwtVerify = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Verify Cognito JWT token
    const decoded = await verifyCognitoToken(token);
    
    // Extract user info from Cognito token
    req.user = {
      cognitoId: decoded.sub,
      email: decoded.email,
      name: decoded.name || decoded['custom:displayName']
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Phase 4: Session Management Integration

```javascript
// Updated Session Participant Controller
class SessionParticipantController {
  joinSession = async (req, res) => {
    const { sessionId } = req.params;
    const { cognitoId, email } = req.user; // From Cognito token
    
    // Find or create minimal user record
    let user = await User.findOne({ cognitoId });
    if (!user) {
      user = await User.create({ cognitoId, email });
    }
    
    // Use existing session service logic
    const result = await this.sessionService.joinSession(sessionId, email);
    res.json(result);
  };
}
```

## Implementation Benefits

### 1. **Reduced Complexity**
- Eliminate dual authentication systems
- Remove 300+ lines of User model complexity
- Simplify middleware from 270 lines to ~50 lines

### 2. **Better Cognito Utilization**
- Use Cognito's built-in user management
- Leverage Cognito's attribute management
- Utilize Cognito's security features (MFA, password policies)

### 3. **Improved Performance**
- Direct Cognito JWT verification (no database lookups)
- Reduced backend database operations
- Simplified user synchronization

### 4. **Enhanced Security**
- Cognito's enterprise-grade security
- Built-in token management
- Automatic token refresh

## Migration Strategy

### Step 1: Add Cognito Custom Attributes
- Define custom attributes in Cognito User Pool
- Update registration/signup forms to use custom attributes

### Step 2: Create User Data Migration Script
```javascript
// Migrate existing user data to Cognito attributes
const migrateUserToCognito = async (user) => {
  const cognitoUser = new AWS.CognitoIdentityServiceProvider();
  
  await cognitoUser.adminUpdateUserAttributes({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: user.email,
    UserAttributes: [
      { Name: 'custom:displayName', Value: user.profile.displayName },
      { Name: 'custom:theme', Value: user.preferences.theme },
      // ... other attributes
    ]
  }).promise();
};
```

### Step 3: Update Frontend Components
```javascript
// Update auth hooks to use Cognito attributes
export const useUserProfile = () => {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const user = userPool.getCurrentUser();
      return new Promise((resolve, reject) => {
        user.getUserAttributes((err, attributes) => {
          if (err) reject(err);
          
          const profile = {};
          attributes.forEach(attr => {
            profile[attr.getName()] = attr.getValue();
          });
          resolve(profile);
        });
      });
    }
  });
};
```

### Step 4: Gradually Replace Backend Auth
- Replace `requireAuth` middleware with `cognitoJwtVerify`
- Update all controllers to use Cognito user info
- Remove UserService complexity

### Step 5: Clean Up
- Remove unused User model fields
- Remove custom JWT session management
- Remove userSync middleware

## Files to Modify

### Remove/Simplify:
- `api/models/User.js` (reduce from 417 lines to ~50 lines)
- `api/middleware/auth.js` (reduce from 270 lines to ~50 lines)
- `api/middleware/userSync.js` (remove entirely)
- `api/services/userService.js` (simplify significantly)

### Update:
- `src/utils/auth.js` (enhance Cognito attribute handling)
- `api/controllers/sessionParticipantController.js` (use Cognito user data)
- `src/hooks/useAuth.js` (add Cognito attribute management)

### Add:
- `api/middleware/cognitoAuth.js` (new simplified Cognito JWT verification)
- `scripts/migrateToCognito.js` (data migration script)

## Timeline Estimate

- **Week 1**: Set up Cognito custom attributes and test
- **Week 2**: Create migration scripts and test data migration
- **Week 3**: Update frontend to use Cognito attributes
- **Week 4**: Replace backend authentication middleware
- **Week 5**: Testing and cleanup

This approach will significantly simplify your architecture while maintaining all existing functionality and improving security and performance.
