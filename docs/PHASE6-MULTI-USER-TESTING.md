# Phase 6: Multi-User Integration Testing Guide

## Overview
Phase 6 focuses on comprehensive multi-user testing of the TanStack Query + YJS real-time collaboration system using the debug interface at `/debug`.

## Testing Scenarios

### 1. Concurrent Session Access
**Objective**: Verify multiple users can join the same session with proper state synchronization

**Test Steps**:
1. Open multiple browser windows/tabs to `http://localhost:3000/debug`
2. Create a new session in first window
3. Copy session ID to other windows
4. Join the same session from all windows
5. Verify all users see the same session data
6. Monitor TanStack Query cache updates across all instances

**Expected Results**:
- All users see identical session information
- User count updates in real-time across all windows
- TanStack Query cache stays synchronized
- No duplicate API calls for cached data

### 2. Real-Time Collaboration Testing
**Objective**: Test YJS document synchronization and user awareness

**Test Steps**:
1. Join same session from multiple windows
2. Make changes to shared documents from different windows
3. Monitor user awareness (cursors, selections)
4. Test concurrent editing scenarios
5. Verify conflict resolution

**Expected Results**:
- Changes appear instantly across all windows
- User awareness shows active participants
- Conflict resolution works seamlessly
- No data loss during concurrent edits

### 3. File Operations Multi-User
**Objective**: Test file upload, deletion, and modification across users

**Test Steps**:
1. Multiple users in same session
2. Upload files from different windows
3. Modify file content simultaneously
4. Delete files and verify propagation
5. Test file permission scenarios

**Expected Results**:
- File operations sync across all users
- Cache invalidation works correctly
- Optimistic updates provide instant feedback
- Error states handled gracefully

### 4. Network Resilience Testing
**Objective**: Test disconnection/reconnection scenarios

**Test Steps**:
1. Establish multi-user session
2. Disconnect one user (close tab/network)
3. Continue operations with remaining users
4. Reconnect disconnected user
5. Verify state synchronization

**Expected Results**:
- Other users see participant leave/join
- Reconnection restores full state
- No data corruption or inconsistencies
- Graceful degradation during offline periods

### 5. Performance Under Load
**Objective**: Test system performance with multiple concurrent users

**Test Steps**:
1. Open 5+ browser windows/tabs
2. Join same session from all windows
3. Perform rapid operations (editing, file operations)
4. Monitor performance metrics
5. Check for memory leaks or slowdowns

**Expected Results**:
- Responsive performance with multiple users
- Minimal latency for real-time updates
- No memory leaks or performance degradation
- Efficient bandwidth usage

## Testing Tools

### Debug Interface Features
Use the debug interface at `/debug` to:
- Monitor TanStack Query cache state
- Track YJS document synchronization
- View user awareness information
- Test session operations
- Simulate error conditions

### Browser DevTools
Monitor:
- Network requests and WebSocket connections
- Memory usage and performance
- Console errors and warnings
- Cache efficiency metrics

### Performance Metrics
Track:
- Time to first sync (TTFS)
- Operation latency (edit → sync)
- Cache hit/miss ratios
- Memory consumption
- Network bandwidth usage

## Success Criteria

### Functional Requirements
- [ ] Multiple users can join sessions simultaneously
- [ ] Real-time synchronization works flawlessly
- [ ] File operations propagate to all users
- [ ] Network disconnections handled gracefully
- [ ] No data loss or corruption

### Performance Requirements
- [ ] < 100ms latency for real-time updates
- [ ] < 2 seconds for session join/sync
- [ ] Minimal memory growth over time
- [ ] Efficient cache utilization
- [ ] Responsive UI with 5+ concurrent users

### Error Handling
- [ ] Graceful degradation on network issues
- [ ] Clear error messages for failures
- [ ] Automatic retry mechanisms work
- [ ] No unhandled exceptions
- [ ] Proper cleanup on disconnection

## Next Steps After Phase 6
Once multi-user testing is complete:
1. Document any issues found
2. Implement fixes for critical bugs
3. Optimize performance bottlenecks
4. Prepare Phase 7 demo scenarios
5. Create presentation materials

## Troubleshooting

### Common Issues
- **Cache not syncing**: Check TanStack Query devtools
- **YJS conflicts**: Monitor WebSocket connection status
- **Performance issues**: Check for memory leaks
- **Connection failures**: Verify server socket handling

### Debug Commands
```javascript
// Check TanStack Query cache
window.__REACT_QUERY_DEVTOOLS__

// Monitor YJS document state
console.log(ydoc.getMap('sessions'))

// Check socket connection
socket.connected
```
