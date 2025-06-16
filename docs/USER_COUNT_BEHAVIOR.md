# User Count Behavior Documentation

## Overview

The application displays two different user counts in different contexts, and this is intentional and correct behavior.

## User Count Types

### 1. File-Specific User Count (Monaco Editor Status Bar)
**Location**: Code editor status bar (bottom of Monaco editor)
**Shows**: Users currently viewing/editing the specific file
**Label**: "X editing"
**Purpose**: Shows who else is actively collaborating on the same file

**Example**: If 3 users are in a session but only 2 are viewing `main.js`, the Monaco editor for `main.js` will show "2 editing".

### 2. Session-Wide User Count (Chat Panel)
**Location**: Chat panel header
**Shows**: All users connected to the session
**Label**: "X in session"
**Purpose**: Shows everyone available for chat and collaboration

**Example**: If 3 users are in a session, the chat panel will always show "3 in session" regardless of which files they're viewing.

## Why This Design Makes Sense

1. **Context-Aware Information**: Each count serves the specific context where it's displayed
2. **Collaboration Awareness**: When editing, you care about who else is editing the same file
3. **Communication Awareness**: When chatting, you care about everyone in the session
4. **No Information Overload**: Each UI element shows relevant information for its purpose

## Technical Implementation

- **File-specific count**: Uses YJS awareness for the specific file's Y.Doc
- **Session-wide count**: Uses session-level WebSocket awareness
- **Real-time updates**: Both counts update in real-time as users join/leave or switch files

## Expected Behavior

✅ **Normal**: File count (1 editing) < Session count (2 in session) when users view different files
✅ **Normal**: File count = Session count when all users view the same file  
✅ **Normal**: Counts change as users switch between files
❌ **Bug**: File count > Session count (impossible scenario)
❌ **Bug**: Counts don't update when users join/leave

## Debugging

If user counts seem incorrect:
1. Check browser console for awareness change logs
2. Verify WebSocket connections are established
3. Confirm users are actually viewing the expected files
4. Check for any YJS synchronization errors
