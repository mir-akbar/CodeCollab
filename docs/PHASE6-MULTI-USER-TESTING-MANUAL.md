# Phase 6 Multi-User Testing Manual
## TanStack Query + YJS Real-time Collaboration Testing

### Prerequisites
- ✅ Development server running on http://localhost:3000  
- ✅ Backend server running on http://localhost:3001
- ✅ Debug interface available at http://localhost:3000/debug
- ✅ Multiple browser windows/tabs for concurrent testing

### Phase 6 Testing Scenarios

#### Test 1: Concurrent Session Access
**Objective**: Verify multiple users can join the same session simultaneously

**Steps**:
1. **Browser 1 (User A)**: 
   - Navigate to http://localhost:3000/debug
   - Click "Test Create Session" 
   - Note the session ID displayed
   - Verify user count shows 1

2. **Browser 2 (User B)**:
   - Navigate to http://localhost:3000/debug?sessionId=[SESSION_ID_FROM_STEP_1]
   - Observe automatic session joining
   - Verify user count shows 2

3. **Browser 3 (User C)**:
   - Repeat step 2
   - Verify user count shows 3

**Expected Results**:
- ✅ All users see the same session data
- ✅ User count updates in real-time across all browsers
- ✅ YJS connection status shows "connected" for all users

#### Test 2: Real-time State Synchronization  
**Objective**: Verify TanStack Query cache updates propagate in real-time

**Steps**:
1. **All browsers**: Join the same session (from Test 1)
2. **Browser 1**: Click "Test Real-time Connection"
3. **Observe in all browsers**:
   - Active users list updates
   - Connection status changes
   - Session data refreshes

**Expected Results**:
- ✅ State changes in one browser appear in others within 2 seconds
- ✅ TanStack Query cache invalidation works across users
- ✅ No duplicate API calls or cache inconsistencies

#### Test 3: File Operations Multi-User
**Objective**: Test file upload/management with multiple concurrent users

**Steps**:
1. **Browser 1**: Click "Test File Upload"
2. **All browsers**: Monitor file list updates
3. **Browser 2**: Upload a different file
4. **All browsers**: Verify both files appear

**Expected Results**:
- ✅ File uploads appear in all user interfaces
- ✅ File lists stay synchronized
- ✅ No duplicate entries or missing files

#### Test 4: Network Resilience
**Objective**: Test system behavior with connection interruptions

**Steps**:
1. **All browsers**: Join session and verify connectivity
2. **Browser 2**: Simulate disconnection (close tab/disable network)
3. **Browser 1**: Continue operations (create/update)
4. **Browser 2**: Reconnect (reopen tab)
5. **Verify**: State synchronization after reconnection

**Expected Results**:
- ✅ System continues operating with fewer users
- ✅ Reconnected user receives latest state
- ✅ No data loss or corruption

### Validation Checklist

#### Real-time Features
- [ ] User awareness (who's online)
- [ ] Live cursor tracking
- [ ] Instant state updates
- [ ] Connection status indicators

#### TanStack Query Integration
- [ ] Optimistic updates work correctly
- [ ] Cache invalidation propagates
- [ ] No unnecessary API calls
- [ ] Error states handled gracefully

#### YJS Document Synchronization
- [ ] Document state stays consistent
- [ ] Conflict resolution works
- [ ] History preservation
- [ ] Proper cleanup on disconnect

#### Performance Metrics
- [ ] Initial load time < 3 seconds
- [ ] State update latency < 500ms
- [ ] Memory usage stable over time
- [ ] No memory leaks on disconnect/reconnect

### Debugging Tools

#### Debug Interface Features
- **Session Management**: Create, join, leave sessions
- **Real-time Status**: Connection state, user count, YJS status  
- **File Operations**: Upload, delete, list files
- **Network Simulation**: Test offline/online scenarios

#### Browser Developer Tools
- **Network Tab**: Monitor API calls and WebSocket traffic
- **Console**: Check for errors and performance warnings
- **Application Tab**: Inspect TanStack Query cache state
- **Performance Tab**: Profile rendering and memory usage

### Test Data Collection

For each test scenario, record:
- ⏱️ Response times
- 🔗 Connection stability  
- 📊 Success/failure rates
- 🐛 Any errors or issues
- 💾 Cache behavior
- 🔄 Sync accuracy

### Phase 6 Success Criteria

**All tests must pass with**:
- 100% state synchronization accuracy
- < 2 second real-time update latency
- Zero data loss during network interruptions
- Stable performance with 3+ concurrent users
- No memory leaks or connection issues

### Next Steps: Phase 7 Preparation

Upon successful Phase 6 completion:
1. Document all test results
2. Create demo scenarios for capstone presentation
3. Prepare performance benchmarks
4. Finalize documentation
5. Ready for Phase 7 demo validation
