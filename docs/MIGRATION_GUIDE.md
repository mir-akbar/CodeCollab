# Session Management Migration Guide

## Overview

This guide outlines the incremental migration from the old SessionManagement system to the new normalized Session + SessionParticipant system.

## Migration Steps

### Phase 1: Setup New Models ✅
- [x] Created new `Session` model with proper schema
- [x] Created new `SessionParticipant` model for normalized participants
- [x] Created `SessionMigrationService` for data migration
- [x] Created migration script `scripts/migrate-sessions.js`

### Phase 2: Dual-Mode Service ✅
- [x] Created `SessionService` that supports both old and new systems
- [x] Added feature flag to switch between systems
- [x] Created backward-compatible API endpoints in `sessionManageV2.js`

### Phase 3: Migration Execution (Current Phase)

#### 3.1 Run Migration in Test Mode
```bash
cd api
node scripts/migrate-sessions.js --dry-run
```

#### 3.2 Run Actual Migration
```bash
cd api
node scripts/migrate-sessions.js
```

#### 3.3 Verify Migration
```bash
cd api
node scripts/migrate-sessions.js --verify
```

### Phase 4: Switch to New System
```bash
# Set environment variable
export USE_NEW_SESSION_SYSTEM=true

# Or use API endpoint
curl -X POST http://localhost:5000/session/enable-new-system
```

### Phase 5: Frontend Updates
- Update frontend to use new API endpoints
- Handle new session data structure
- Test all session operations

### Phase 6: Cleanup (After validation)
- Remove old SessionManagement model
- Remove legacy code from SessionService
- Update documentation

## API Endpoints Comparison

### Old Endpoints (Still Working)
```
GET  /manage_session/get-my-sessions
GET  /manage_session/get-shared-sessions
POST /manage_session/invite-session
POST /manage_session/delete-session
```

### New Endpoints (Recommended)
```
GET  /session/get-user-sessions        # Replaces both get-my/shared
POST /session/create-session
POST /session/invite-session
POST /session/delete-session
GET  /session/migration-status
POST /session/enable-new-system
```

## Data Structure Changes

### Old Session Object
```json
{
  "id": "mongodb_object_id",
  "sessionId": "uuid",
  "name": "Session Name",
  "isCreator": true,
  "participants": [
    {"email": "user@example.com", "access": "edit"}
  ]
}
```

### New Session Object
```json
{
  "id": "mongodb_object_id",
  "sessionId": "uuid",
  "name": "Session Name",
  "creator": "creator@example.com",
  "status": "active",
  "isCreator": true,
  "participants": [
    {
      "email": "user@example.com", 
      "role": "editor", 
      "status": "active",
      "access": "edit"  // For backward compatibility
    }
  ]
}
```

## Migration Validation Checklist

- [ ] All sessions migrated successfully
- [ ] No data loss (participant count matches)
- [ ] Session creators preserved
- [ ] Participant permissions preserved
- [ ] Frontend still works with new data
- [ ] Real-time collaboration still works
- [ ] File operations still work

## Rollback Plan

If issues arise, rollback using:
```bash
cd api
node scripts/migrate-sessions.js --rollback
export USE_NEW_SESSION_SYSTEM=false
```

## Performance Improvements Expected

### Before Migration
- Multiple database queries per session (1 query per participant)
- Complex aggregation logic in every API call
- Duplicate data stored across multiple records

### After Migration
- Single query to get all user sessions
- Normalized data structure
- Better indexing and query performance
- Cleaner codebase and easier maintenance

## Monitoring

Monitor these metrics during migration:
- Database query performance
- API response times
- Memory usage
- Error rates
- User session functionality

## Support

If you encounter issues:
1. Check migration logs
2. Verify database connections
3. Check environment variables
4. Use rollback if necessary
5. Contact development team

## Next Steps

After successful migration:
1. Update frontend components
2. Update documentation
3. Remove legacy code
4. Add new features (session roles, permissions, etc.)
