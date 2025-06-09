# Invitation System Enhancement - Supporting Non-Existent Users

## Overview

The invitation system has been enhanced to handle inviting users who don't have accounts yet. This enables a more flexible invitation flow where you can invite anyone via email, regardless of whether they've signed up for the platform.

## How It Works

### Frontend to Backend Flow

1. **Frontend sends invitation**: Uses email addresses for both inviter and invitee
   ```javascript
   {
     inviteeEmail: "newuser@example.com",
     role: "editor", 
     inviterEmail: "currentuser@example.com"
   }
   ```

2. **Backend resolves emails to cognitoIds**:
   - Looks up inviter by email → gets their cognitoId
   - Looks up invitee by email → creates placeholder if doesn't exist
   - Stores participants using cognitoIds (consistent with data model)

3. **User creation for non-existent accounts**:
   ```javascript
   // Creates placeholder user with temporary cognitoId
   {
     email: "newuser@example.com",
     name: "newuser", 
     cognitoId: "temp_invite_1234567890_abc123"
   }
   ```

### Database Storage

- **SessionParticipant records**: Always use `cognitoId` for consistency
- **User records**: Created automatically for invited emails that don't exist
- **Invitation status**: `invited` until user accepts/activates

## API Changes

### Invitation Endpoint Enhancement

**Endpoint**: `POST /api/sessions/:sessionId/invite`

**Request Body**:
```json
{
  "inviteeEmail": "user@example.com",
  "role": "editor|viewer|admin|owner", 
  "inviterEmail": "inviter@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User invited to session successfully",
  "userExistedBefore": true|false,
  "inviteeEmail": "user@example.com"
}
```

### Other Participant Endpoints

All participant management endpoints now properly resolve emails to cognitoIds:

- `PUT /api/sessions/:sessionId/transfer-ownership`
- `POST /api/sessions/:sessionId/update-role` 
- `POST /api/sessions/:sessionId/remove-participant`
- `POST /api/sessions/:sessionId/leave`
- `POST /api/sessions/:sessionId/join`

## Frontend User Experience

### InvitationDialog Component

- Shows different success messages based on whether user existed
- For existing users: "Invitation sent to user@example.com"
- For new users: "Invitation sent to user@example.com! They'll be able to join when they create an account."

### UserSection Component

Similar messaging with alert dialogs showing appropriate context.

## User Account Lifecycle

### For Non-Existent Users

1. **Invitation sent**: Creates placeholder user record
2. **User signs up**: When they create account with same email, placeholder gets linked
3. **Invitation activated**: User can then access invited sessions

### Placeholder User Structure

```javascript
{
  cognitoId: "temp_invite_1234567890_abc123", // Temporary ID
  email: "newuser@example.com",               // Real email  
  name: "newuser",                            // Derived from email
  status: "active",                           // Ready for linking
  // ... other default fields
}
```

## Benefits

1. **Seamless Invitation Flow**: Invite anyone by email without checking if they have accounts
2. **Future-Proof**: When users sign up, they automatically get access to sessions they were invited to  
3. **Consistent Data Model**: All participants stored by cognitoId, emails resolved at API layer
4. **Better UX**: Clear messaging about whether invitee needs to create account

## Testing

Run the test script to verify the functionality:

```bash
# Basic test
node test-invite-nonexistent-user.js

# Comprehensive test suite  
node test-invite-nonexistent-user.js --comprehensive
```

## Security Considerations

1. **Email Validation**: All emails validated before creating placeholder users
2. **Permission Checks**: Only authorized users can invite (role hierarchy respected)
3. **Temp CognitoId Pattern**: Clearly identifiable as placeholder (`temp_invite_*`)
4. **No Sensitive Data**: Placeholder users contain minimal information

## Migration Notes

- **Backward Compatibility**: Existing sessions continue to work
- **Database Schema**: No changes required to existing collections
- **API Compatibility**: Frontend sends same request format, gets enhanced response

This enhancement enables a more user-friendly invitation system while maintaining data consistency and security.
