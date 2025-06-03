# Role & Permission System Improvements

## Document Purpose
This document tracks the systematic improvements to the CodeLab session management system's role and permission logic, based on architectural analysis. This serves as the reference document for all related changes.

## Current State Analysis (✅ Completed)

### Foundation Models Status
- ✅ Session model: Solid structure with proper indexing
- ✅ SessionParticipant model: Good role enum definition
- ✅ Basic CRUD operations: Working correctly
- ✅ Service layer: Business logic functioning
- ✅ API validation: Field mapping fixes implemented

### Field Consistency Status  
- ✅ Validation middleware: Fixed to handle both NEW and LEGACY patterns
- ✅ Controller layer: Updated to use normalized fields
- ✅ Service layer: Working with correct field mappings

## Issues Identified & Solutions

### 1. ROLE PERMISSION LOGIC GAP ⚠️ [TO IMPLEMENT]

**Problem**: Models define roles but don't specify what each role can actually do.

**Solution**: Implement explicit permission matrices

#### 1.1 Permission Definitions
```javascript
const ROLE_PERMISSIONS = {
  owner: ['create', 'delete', 'edit', 'invite', 'remove', 'transfer', 'changeRoles', 'manageSession'],
  admin: ['edit', 'invite', 'remove', 'changeRoles'], // but not delete session or transfer ownership
  editor: ['edit', 'invite'], // can edit files and invite viewers/editors  
  viewer: ['view'] // read-only access
};
```

#### 1.2 Implementation Plan
- [ ] Add permission constants to models/permissions.js
- [ ] Add hasPermission() method to SessionParticipant model
- [ ] Update service layer to check permissions before actions
- [ ] Update validation middleware to enforce permission checks

### 2. INCONSISTENT ROLE VALIDATION ⚠️ [TO IMPLEMENT]

**Problem**: Validation accepts both new and legacy roles but permission checking is inconsistent.

**Solution**: Standardize validation and permission checking

#### 2.1 Changes Needed
- [ ] Ensure all permission checks use normalized role values
- [ ] Update frontend to send consistent role values
- [ ] Add role normalization utility function

### 3. MISSING BUSINESS LOGIC CONSTRAINTS ⚠️ [TO IMPLEMENT]

**Problem**: Critical business rules not enforced.

#### 3.1 Owner Transfer Issues
- [ ] **Auto-add participant**: If new owner isn't a participant, add them first
- [ ] **Previous owner role**: Old owner becomes admin (not removed)
- [ ] **Single owner enforcement**: Only one owner per session allowed

#### 3.2 Role Change Restrictions
- [ ] **Admin self-promotion**: Admins cannot make themselves owner
- [ ] **Role escalation rules**: Only owners can create admins
- [ ] **Permission validation**: Check if requester can assign target role

#### 3.3 Implementation Files
- [ ] Update SessionParticipant model with validation
- [ ] Add business logic to sessionService
- [ ] Update controllers with proper checks

### 4. SESSION ACCESS CONTROL GAPS ⚠️ [TO IMPLEMENT]

**Problem**: Missing session-level access controls.

#### 4.1 New Session Settings
```javascript
settings: {
  isPrivate: { type: Boolean, default: false },
  allowGuestAccess: { type: Boolean, default: false },
  maxParticipants: { type: Number, default: 50 },
  // Add these:
  allowSelfInvite: { type: Boolean, default: false },
  requireApproval: { type: Boolean, default: true },
  allowRoleRequests: { type: Boolean, default: false }
}
```

#### 4.2 Changes Needed
- [ ] Update Session model with new settings
- [ ] Add validation for session settings
- [ ] Implement access control logic in services

### 5. DATA CONSISTENCY ISSUES ⚠️ [TO IMPLEMENT]

**Problem**: Participant status transitions not properly validated.

#### 5.1 Status Transition Rules
```javascript
const VALID_TRANSITIONS = {
  invited: ['active', 'removed'],
  active: ['left', 'removed'], 
  left: ['active'], // Can be re-invited
  removed: [] // Cannot return unless re-invited as new record
};
```

#### 5.2 Implementation
- [ ] Add canTransitionTo() method to SessionParticipant
- [ ] Add pre-save middleware for status validation
- [ ] Update service methods to validate transitions

## Implementation Priority

### Phase 1: Core Permission System ✅ COMPLETED
1. ✅ Create permissions constants file
2. ✅ Add hasPermission() method to SessionParticipant model
3. ✅ Update service layer permission checks
4. ✅ Add owner uniqueness validation

### Phase 2: Business Logic Constraints ✅ COMPLETED  
1. ✅ Implement owner transfer business rules
2. ✅ Add role change restrictions
3. ✅ Implement status transition validation
4. ✅ Add session creator auto-ownership

### Phase 3: Enhanced Session Controls ✅ COMPLETED
1. ✅ Add new session settings
2. ✅ Implement access control logic  
3. ✅ Add session-level permission validation

### Phase 4: Frontend Integration ⭐ READY FOR IMPLEMENTATION
1. [ ] Update frontend permission checks
2. [ ] Add role-based UI components
3. [ ] Implement proper error handling

## Files to Modify

### Backend Files
- [ ] `/api/models/SessionParticipant.js` - Add permission methods and validation
- [ ] `/api/models/Session.js` - Add new settings and validation
- [ ] `/api/models/permissions.js` - Create permission constants (NEW FILE)
- [ ] `/api/services/sessionService.js` - Add business logic enforcement
- [ ] `/api/controllers/sessionController.js` - Update permission checks
- [ ] `/api/middleware/validation.js` - Enhance role validation

### Frontend Files  
- [ ] `/src/components/sessions/ParticipantsList.jsx` - Update role management
- [ ] `/src/components/UserSection.jsx` - Add permission-based UI
- [ ] `/src/components/sessions/AccessLevelBadge.jsx` - Ensure consistency

### Test Files
- [ ] Create comprehensive permission test suite
- [ ] Add business logic validation tests
- [ ] Update existing tests for new constraints

## Code Improvements Tracking

### 1. Permission Checking Method
```javascript
// Add to SessionParticipant model
SessionParticipantSchema.methods.hasPermission = function(action) {
  // Implementation to be added
};
```
Status: [ ] Not Implemented

### 2. Session Creation with Auto-Owner
```javascript  
// Update sessionService.createSession
async createSession(sessionData) {
  // Auto-add creator as owner logic
};
```
Status: [ ] Not Implemented

### 3. Owner Uniqueness Validation
```javascript
// Add pre-save middleware to SessionParticipant
SessionParticipantSchema.pre('save', async function(next) {
  // Owner uniqueness validation
});
```
Status: [ ] Not Implemented

### 4. Status Transition Validation
```javascript
// Add to SessionParticipant model
SessionParticipantSchema.methods.canTransitionTo = function(newStatus) {
  // Transition validation logic
};
```
Status: [ ] Not Implemented

## Testing Requirements

### Unit Tests Needed
- [ ] Permission matrix validation
- [ ] Role transition validation  
- [ ] Owner uniqueness enforcement
- [ ] Business logic constraint tests

### Integration Tests Needed
- [ ] End-to-end permission workflows
- [ ] Multi-user session scenarios
- [ ] Error handling validation

## Success Criteria

### ✅ Phase 1 Complete When:
- All permission checks are explicit and consistent
- Owner uniqueness is enforced  
- Permission methods are thoroughly tested

### ✅ Phase 2 Complete When:
- Owner transfer follows business rules
- Role changes respect hierarchy constraints
- Status transitions are properly validated

### ✅ Phase 3 Complete When:
- Session-level access controls work correctly
- New settings are properly integrated
- All legacy compatibility is maintained

### ✅ Final Success When:
- All permission workflows function correctly
- Frontend UI reflects proper permissions
- System passes comprehensive test suite
- Documentation is complete and up-to-date

---

## Change Log
- **2025-06-03**: Document created based on architectural analysis
- **2025-06-03 Phase 1**: ✅ COMPLETED - Core Permission System
  - Created `/api/models/permissions.js` with comprehensive permission matrix
  - Enhanced `SessionParticipant.js` with permission methods and validation middleware  
  - Updated service layer to use permission-based access control
  - Implemented owner uniqueness validation and status transition rules
  - All 29 foundation tests + 27 service tests + permission tests passing
- **2025-06-03 Phase 2**: ✅ COMPLETED - Business Logic Constraints  
  - Enhanced permission checks in session service methods
  - Implemented role hierarchy enforcement (admins can't self-promote to owner)
  - Fixed session deletion to use current owner permission vs original creator
  - Added comprehensive business logic validation tests
  - All owner transfer, role change, and access control rules working correctly
- **2025-06-03 Phase 3**: ✅ COMPLETED - Enhanced Session Controls
  - Added new session settings: `allowSelfInvite`, `requireApproval`, `allowRoleRequests`, etc.
  - Enhanced `Session.js` model with validation methods and business logic
  - Implemented self-invite functionality with domain restrictions and capacity limits
  - Added role request system with proper validation
  - Created session settings management with permission checks
  - All enhanced control features tested and working correctly

## Notes
- Always reference this document before making changes to permission/role related files
- Update status and change log after each implementation
- Maintain backward compatibility during all changes
- Test thoroughly at each phase before proceeding
