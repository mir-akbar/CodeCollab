# Y.js WebSocket Server Refactoring Plan

## Current State Analysis

The `yjsWebSocketServer.js` file is **780 lines** and handles multiple distinct responsibilities:

- Core Y.js WebSocket server functionality
- Custom message routing and handling
- File management broadcasting (upload/delete)
- Chat system broadcasting
- Complete video call signaling (WebRTC)
- User presence and room management
- Y.js document state persistence
- Server utilities and statistics

## Issues with Current Design

1. **Single Responsibility Principle Violation**: One class handles 7+ distinct concerns
2. **High Complexity**: 780 lines make it difficult to maintain and debug
3. **Testing Challenges**: Hard to unit test individual features
4. **Code Coupling**: Video chat logic mixed with file collaboration logic
5. **Scalability Issues**: Adding new features requires modifying a monolithic class

## Proposed Refactoring Structure

### 1. Core WebSocket Server (`YjsWebSocketServer.js`) - ~200 lines
**Responsibilities:**
- WebSocket connection management
- Document name parsing from URLs
- Heartbeat and connection lifecycle
- Message routing to appropriate handlers
- Basic room management

### 2. Y.js Document Manager (`YjsDocumentManager.js`) - ~150 lines
**Responsibilities:**
- Y.js document state persistence
- Document synchronization between clients
- Update processing and broadcasting
- Integration with MongoDB storage
- Content deduplication logic

### 3. Message Router (`WebSocketMessageRouter.js`) - ~100 lines
**Responsibilities:**
- Route incoming messages to appropriate handlers
- Validate message types and formats
- Handle custom vs Y.js protocol messages
- Error handling for malformed messages

### 4. Video Call Manager (`VideoCallManager.js`) - ~200 lines
**Responsibilities:**
- WebRTC signaling (offer/answer/ICE)
- Video call state management
- Media state tracking (mute/unmute)
- Participant management for calls
- Video call room coordination

### 5. Chat Manager (`ChatManager.js`) - ~80 lines
**Responsibilities:**
- Chat message broadcasting
- Chat room management
- Message validation and formatting
- Chat history (if needed)

### 6. File Event Manager (`FileEventManager.js`) - ~100 lines
**Responsibilities:**
- File upload progress broadcasting
- File deletion/creation notifications
- File event validation
- Integration with file storage service

### 7. User Presence Manager (`UserPresenceManager.js`) - ~120 lines
**Responsibilities:**
- User tracking across rooms
- Presence state management
- User info updates and broadcasting
- Connection tracking by user

### 8. Room Manager (`RoomManager.js`) - ~80 lines
**Responsibilities:**
- Room lifecycle management
- Room statistics and monitoring
- Room cleanup and garbage collection
- Multi-room user tracking

## Implementation Benefits

### Immediate Benefits
1. **Maintainability**: Each service has a clear, focused responsibility
2. **Testability**: Individual components can be unit tested
3. **Debugging**: Easier to isolate issues to specific functionality
4. **Team Development**: Different developers can work on different managers

### Long-term Benefits
1. **Scalability**: New features can be added as separate managers
2. **Performance**: Individual managers can be optimized independently
3. **Reusability**: Managers can be reused in different contexts
4. **Deployment**: Critical vs non-critical features can be deployed separately

## Migration Strategy

### Phase 1: Extract Video Call Manager (Low Risk)
- Video calling is self-contained
- Can be extracted without affecting core collaboration
- Easy to test independently

### Phase 2: Extract Chat Manager (Low Risk)
- Chat is independent of file collaboration
- Simple message broadcasting logic
- Minimal dependencies

### Phase 3: Extract File Event Manager (Medium Risk)
- File events are important but not critical to Y.js sync
- Moderate integration with file storage service
- Good testing needed

### Phase 4: Extract Y.js Document Manager (High Risk)
- Core collaboration functionality
- Requires careful testing
- Critical for preventing content duplication
- Should be done after production fix is verified

### Phase 5: Extract Supporting Managers (Low-Medium Risk)
- User Presence Manager
- Room Manager
- Message Router
- Final cleanup of main server class

## File Structure After Refactoring

```
api/services/websocket/
├── YjsWebSocketServer.js           // Main orchestrator (~200 lines)
├── managers/
│   ├── YjsDocumentManager.js       // Y.js document handling
│   ├── VideoCallManager.js         // WebRTC signaling
│   ├── ChatManager.js              // Chat broadcasting
│   ├── FileEventManager.js         // File event broadcasting
│   ├── UserPresenceManager.js      // User tracking
│   ├── RoomManager.js              // Room lifecycle
│   └── WebSocketMessageRouter.js   // Message routing
└── tests/
    ├── YjsWebSocketServer.test.js
    ├── YjsDocumentManager.test.js
    ├── VideoCallManager.test.js
    └── ... (tests for each manager)
```

## Risk Assessment

### Low Risk Components (Can refactor immediately)
- Video Call Manager: Self-contained WebRTC logic
- Chat Manager: Simple message broadcasting
- User Presence Manager: Non-critical user tracking

### Medium Risk Components (Refactor after testing)
- File Event Manager: Important for file collaboration UX
- Room Manager: Core to connection management
- Message Router: Affects all message handling

### High Risk Components (Refactor last, with extensive testing)
- Y.js Document Manager: Critical for preventing content duplication
- Core WebSocket Server: Orchestrates all functionality

## Recommendation

**Start with Phase 1 (Video Call Manager extraction)** as it provides immediate benefits with minimal risk to the core collaboration functionality. This will also establish the pattern and infrastructure for the remaining refactoring phases.

The refactoring should be done incrementally, with thorough testing at each phase, especially for the Y.js Document Manager which is critical for preventing the content duplication issue we just fixed.
