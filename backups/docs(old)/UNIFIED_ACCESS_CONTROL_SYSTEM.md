# CodeLab Unified Access Control System

## Overview

This document provides a comprehensive explanation of the unified access control system in CodeLab, integrating role-based permissions with the session settings configuration. This new approach allows for:

1. Role-based access control (RBAC) based on user roles
2. Session-level configuration affecting permissions
3. Settings-based access policies like invite policies

## Core Components

### 1. Role-Based Permission System

The foundation of access control is the role hierarchy:

| Role   | Permission Level | Core Permissions                                     |
|--------|------------------|-----------------------------------------------------|
| Owner  | Highest (4)      | Full control, including delete and ownership transfer |
| Admin  | High (3)         | Manage users, content, and most settings             |
| Editor | Medium (2)       | Edit content and invite editors/viewers              |
| Viewer | Lowest (1)       | Read-only access                                     |

Each role has specific permissions defined in `permissions.js`.

### 2. Session Settings

Session settings work alongside roles to refine permissions:

| Setting          | Description                                 | Controls                           |
|------------------|---------------------------------------------|-----------------------------------|
| `invitePolicy`   | Controls who can join the session           | Join, invitation, and self-invite permissions |
| `allowedDomains` | Email domains allowed in the session        | Who can join and be invited         |
| `isPrivate`      | Whether session is private or public        | Visibility and discoverability    |
| `maxParticipants`| Maximum number of participants allowed      | Whether new users can join        |
| `allowRoleRequests` | Whether users can request role changes   | Role change request functionality |

### 3. Invite Policies

Special focus on the `invitePolicy` setting which defines invitation behavior:

| Policy Value       | Description                                | Behavior                                                 |
|--------------------|--------------------------------------------|----------------------------------------------------------|
| `closed`           | No new invitations allowed                 | Only owners/admins can invite regardless of role         |
| `approval-required`| Default - requires explicit invitation     | Standard role-based invite permissions apply             |
| `self-invite`      | Users can request to join                  | Users can request access; domain restrictions may apply  |
| `open`             | Anyone can join (with domain restrictions) | Most permissive; domain restrictions still apply         |

## Integration Points

### Permission Functions

1. **Role-Only Functions**:
   - `hasPermission(role, action)` - Basic role permission check
   - `canAssignRole(assignerRole, targetRole)` - Role assignment hierarchy

2. **Session-Aware Functions**:
   - `canPerformActionWithSettings(userRole, action, sessionSettings, userEmail)` - Unified permission check
   - `canJoinSession(userEmail, sessionSettings)` - Check if a user can join based on policy
   - `canModifySetting(userRole, settingName)` - Check if user can modify a specific setting

### Models Integration

1. **SessionParticipant.js**:
   - `hasPermissionWithSettings(action, sessionSettings, userEmail)` - Object-oriented permission check
   - `canModifySessionSetting(settingName)` - Setting-specific permission check

2. **Session.js**:
   - `canUserJoin(userEmail)` - Checks both roles and settings for join permission
   - `allowsSelfInvite()` - Policy-based check for self-invitation

### Services Integration

1. **sessionService.js**:
   - `_updateSessionSettingsNew()` - Validates individual setting permissions
   - `_selfInviteNew()` - Uses unified permissions for self-invitation
   - `_requestRoleChangeNew()` - Integrates permission checks for role changes

## Frontend Integration

The frontend implements the same unified approach:

1. **permissions.js**:
   - Mirrors backend permission constants and functions
   - Provides `checkPermissionWithSettings()` to match backend logic

2. **permissionValidation.js**:
   - `validateAction()` - Uses enhanced permission checks
   - `validateInvite()` - Validates both role and domain permissions
   - `validateSettingsUpdate()` - Settings-specific validation

## Usage Examples

### Example 1: Inviting a User

```javascript
// Backend
const permResult = participant.hasPermissionWithSettings('invite', session.settings, userEmail);
if (!permResult.allowed) {
  throw new Error(permResult.reason);
}

// Frontend
const inviteCheck = validateInvite(session, inviterEmail, inviteeEmail, role);
if (!inviteCheck.valid) {
  showError(inviteCheck.message);
}
```

### Example 2: Updating a Session Setting

```javascript
// Backend
if (!updater.canModifySessionSetting('invitePolicy')) {
  throw new Error('Insufficient permissions to modify this setting');
}

// Frontend
const settingsCheck = validateSettingsUpdate(session, userEmail, newSettings);
if (!settingsCheck.valid) {
  showError(settingsCheck.message);
}
```

## Best Practices

1. Always use `hasPermissionWithSettings` instead of `hasPermission` for complete permission checks
2. Validate individual settings changes using `canModifySessionSetting`
3. Consider invite policy implications when working with participant management
4. Always validate domain restrictions when processing invites or joins

## Migration Guide

For legacy code still using the old permission system:

1. Replace `hasPermission()` calls with `hasPermissionWithSettings()`
2. Ensure session settings are passed to permission checks
3. Use granular setting permission checks when modifying configuration

## Security Considerations

1. Always perform permission checks on both client and server
2. Consider the interaction between settings (e.g., private sessions cannot have open invite policies)
3. Validate domain restrictions in all invitation and join flows
