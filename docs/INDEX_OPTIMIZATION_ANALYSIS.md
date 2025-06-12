# Database Index Optimization Analysis

## Current Index Analysis

### User Model Indexes

**Current Indexes:**
```javascript
// Field-level indexes
cognitoId: { index: true, unique: true }
email: { index: true, unique: true }
displayName: { index: true }
username: { index: true, unique: true, sparse: true }
lastActiveAt: { index: true }
status: { index: true }

// Compound indexes
UserSchema.index({ cognitoId: 1, status: 1 });
UserSchema.index({ email: 1, status: 1 });
UserSchema.index({ lastActiveAt: -1 });
```

**Query Patterns Found:**
- `User.findByEmail(email)` - Simple email lookup
- `User.findByCognitoId(cognitoId)` - Simple cognitoId lookup
- `User.findByUsername(username)` - Simple username lookup
- `User.find({ status: 'active' })` - Status filtering
- `User.findOne({ cognitoId: p.cognitoId })` - Simple cognitoId lookup

**Recommended Optimizations:**
- ✅ **KEEP:** `cognitoId` (unique) - Primary identifier, heavily used
- ✅ **KEEP:** `email` (unique) - Primary lookup method, heavily used
- ✅ **KEEP:** `username` (unique, sparse) - User search functionality
- ❌ **REMOVE:** `displayName` index - No queries found using this field for filtering
- ❌ **REMOVE:** `lastActiveAt` field index - Only used for updates, not queries
- ❌ **REMOVE:** `status` field index - Rarely filtered independently
- ❌ **REMOVE:** `{ cognitoId: 1, status: 1 }` - Redundant with cognitoId unique index
- ❌ **REMOVE:** `{ email: 1, status: 1 }` - Redundant with email unique index
- ❌ **REMOVE:** `{ lastActiveAt: -1 }` - No queries sorting by lastActiveAt

### Session Model Indexes

**Current Indexes:**
```javascript
// Field-level indexes
sessionId: { index: true, unique: true }
creator: { index: true }
status: { index: true }
'activity.lastActivity': { index: true }

// Compound indexes
SessionSchema.index({ creator: 1, status: 1 });
SessionSchema.index({ status: 1, 'settings.isPrivate': 1, createdAt: -1 });
SessionSchema.index({ name: 'text', description: 'text' });
```

**Query Patterns Found:**
- `Session.findOne({ sessionId })` - Primary lookup
- `Session.find({ creator: user.cognitoId, status: 'active' })` - User's created sessions
- `Session.findOne({ sessionId: record.sessionId, status: 'active' })` - Active session check

**Recommended Optimizations:**
- ✅ **KEEP:** `sessionId` (unique) - Primary identifier
- ✅ **KEEP:** `{ creator: 1, status: 1 }` - Used for getUserSessions
- ❌ **REMOVE:** `creator` field index - Covered by compound index
- ❌ **REMOVE:** `status` field index - Covered by compound index
- ❌ **REMOVE:** `activity.lastActivity` field index - No queries found
- ❌ **REMOVE:** `{ status: 1, 'settings.isPrivate': 1, createdAt: -1 }` - No queries found for this pattern
- ❌ **REMOVE:** `{ name: 'text', description: 'text' }` - No text search implemented

### SessionParticipant Model Indexes

**Current Indexes:**
```javascript
// Field-level indexes
sessionId: { index: true }
cognitoId: { index: true }
username: { index: true }
email: { index: true }
lastActive: { index: true }

// Compound indexes
SessionParticipantSchema.index({ sessionId: 1, cognitoId: 1 }, { unique: true });
SessionParticipantSchema.index({ cognitoId: 1, status: 1 });
SessionParticipantSchema.index({ sessionId: 1, status: 1 });
SessionParticipantSchema.index({ sessionId: 1, role: 1 });
SessionParticipantSchema.index({ email: 1, sessionId: 1 });
SessionParticipantSchema.index({ username: 1, sessionId: 1 });
SessionParticipantSchema.index({ sessionId: 1, name: 1 });
```

**Query Patterns Found:**
- `SessionParticipant.find({ sessionId, status: { $in: ['active', 'invited'] } })` - Get session participants
- `SessionParticipant.findOne({ sessionId, cognitoId })` - Check specific participant
- `SessionParticipant.find({ cognitoId: user.cognitoId, status: { $in: ['active', 'invited'] } })` - User's participations
- `SessionParticipant.countDocuments({ sessionId: this.sessionId, status: 'active' })` - Count active participants

**Recommended Optimizations:**
- ✅ **KEEP:** `{ sessionId: 1, cognitoId: 1 }` (unique) - Primary participant lookup
- ✅ **KEEP:** `{ cognitoId: 1, status: 1 }` - User's active participations
- ✅ **KEEP:** `{ sessionId: 1, status: 1 }` - Session participant filtering & counting
- ❌ **REMOVE:** `sessionId` field index - Covered by compound indexes
- ❌ **REMOVE:** `cognitoId` field index - Covered by compound indexes
- ❌ **REMOVE:** `username` field index - No search queries found
- ❌ **REMOVE:** `email` field index - No direct email queries on participants
- ❌ **REMOVE:** `lastActive` field index - Only used for updates
- ❌ **REMOVE:** `{ sessionId: 1, role: 1 }` - No queries filtering by role
- ❌ **REMOVE:** `{ email: 1, sessionId: 1 }` - No email-based participant lookups
- ❌ **REMOVE:** `{ username: 1, sessionId: 1 }` - No username-based participant lookups
- ❌ **REMOVE:** `{ sessionId: 1, name: 1 }` - No name-based participant searches

## Summary

**Total Indexes to Remove:** 18
**Total Indexes to Keep:** 7

This optimization will:
1. Reduce index storage overhead significantly
2. Improve write performance (fewer indexes to maintain)
3. Maintain all necessary query performance
4. Remove redundant and unused indexes

## Implementation Priority

1. **High Priority:** Remove unused compound indexes (biggest storage savings)
2. **Medium Priority:** Remove redundant field indexes covered by compound indexes
3. **Low Priority:** Remove field indexes for fields only used in updates
