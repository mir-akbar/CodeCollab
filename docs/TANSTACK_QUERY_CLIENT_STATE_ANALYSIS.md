# TanStack Query Client State Analysis

## Overview
This document identifies areas where TanStack Query may be handling pure client state that would be better managed by Zustand for improved performance and cleaner architecture.

## Current State Management Responsibilities

### ✅ **Correctly Using TanStack Query (Server State)**
- File CRUD operations (`useFileQueries.js`)
- Session data fetching (`useSessionQueries.js`) 
- User authentication (`AuthContext.jsx`)
- Upload/download mutations
- Cache invalidation and optimistic updates

### ✅ **Correctly Using Zustand (Client/UI State)**
- UI state (`uiStore.js`) - active tabs, sidebar state
- Dialog states (`dialogStore.js`) - modal open/close states
- File operations UI (`fileOperationsStore.js`) - drag/drop, validation
- Editor state (`editorStore.js`) - editor preferences
- Chat UI (`chatStore.js`) - message input state
- Session UI (`sessionStore.js`) - filters, dialog states

---

## 🔍 **Potential Issues: Client State in Components Using `useState`**

### **1. Code Collaboration Hook (`useCodeCollaboration.js`)**
**Current:** Using `useState` for collaboration UI state
```javascript
const [isConnected, setIsConnected] = useState(false);
const [isCollaborationReady, setIsCollaborationReady] = useState(false);
const [onlineUsers, setOnlineUsers] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);
```

**Issue:** This collaboration state is component-local but could benefit from global state management since multiple components need to know collaboration status.

**Recommendation:** Move to Zustand `collaborationStore.js` (which already exists but may not be fully utilized)

---

### **2. Session Awareness Hook (`useSessionAwareness.js`)**
**Current:** Using `useState` for online user tracking
```javascript
const [onlineUsers, setOnlineUsers] = useState(new Set());
const [userCount, setUserCount] = useState(0);
```

**Issue:** Online user state is being managed locally per component, but this should be global state shared across the application.

**Recommendation:** Move to `collaborationStore.js` for centralized awareness state

---

### **3. File Events Hook (`useFileEvents.js`)**
**Current:** Using `useState` for WebSocket connection state
```javascript
const [isConnected, setIsConnected] = useState(false);
const [lastEvent, setLastEvent] = useState(null);
```

**Issue:** Connection state is component-local but should be global since multiple components need to know if file events are connected.

**Recommendation:** Move to `fileOperationsStore.js` or create dedicated `connectionStore.js`

---

### **4. User Context (`UserContext.jsx`)**
**Current:** Using `useState` for user email
```javascript
const [userEmail, setUserEmail] = useState(null);
```

**Issue:** User email is duplicated between Context and TanStack Query auth state. This creates potential sync issues.

**Recommendation:** Remove `useState` and rely purely on TanStack Query's auth state, or move to Zustand if performance is critical

---

### **5. Session Navigation Components**

#### **SessionTabs.jsx**
**Current:** Using `useState` for animation state
```javascript
const [previousTab, setPreviousTab] = useState(activeSessionTab);
const [direction, setDirection] = useState(0);
```

**Issue:** Animation state is local but could be shared for consistent animations across the app.

**Recommendation:** Keep local (animation state is typically component-specific) OR move to `uiStore.js` if animations need coordination

#### **SessionManagerTopNavBar.jsx**
**Current:** Using `useState` for user and session data
```javascript
const [userData, setUserData] = useState({...});
const [sessionData, setSessionData] = useState(null);
```

**Issue:** This appears to be duplicating server state that should come from TanStack Query.

**Recommendation:** Replace with TanStack Query hooks for server data

---

### **6. Form State in Pages**

#### **VerificationPage.jsx**
**Current:** Using `useState` for form state
```javascript
const [code, setCode] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState('');
const [successMessage, setSuccessMessage] = useState('');
```

**Issue:** Form loading states are duplicated with TanStack Query mutation states.

**Recommendation:** Use TanStack Query mutation states directly instead of local `useState`

#### **CodeWorkspace.jsx** 
**Current:** Using `useState` for session ID
```javascript
const [sessionId, setSessionId] = useState("");
```

**Issue:** Session ID should come from URL params or be managed globally.

**Recommendation:** Use URL params directly or move to `uiStore.js`

---

## 🎯 **Priority Recommendations**

### **High Priority**
1. **Consolidate collaboration state** in `collaborationStore.js`
   - Move connection states from multiple hooks
   - Centralize online user management
   - Create single source of truth for collaboration status

2. **Remove duplicate form states** - Use TanStack Query mutation states instead of local `useState`

3. **Centralize connection states** - WebSocket connections should be global

### **Medium Priority**
4. **Review UserContext** - Decide between Context vs TanStack Query vs Zustand
5. **Consolidate session UI state** - Some session state is scattered across components

### **Low Priority**
6. **Animation coordination** - Only move to Zustand if animations need cross-component coordination

---

## 🔧 **Implementation Strategy**

### **Phase 1: Collaboration State**
```javascript
// Add to collaborationStore.js
const useCollaborationStore = create((set, get) => ({
  // Connection states
  connections: {
    yjs: { isConnected: false, error: null },
    websocket: { isConnected: false, error: null },
    fileEvents: { isConnected: false, lastEvent: null }
  },
  
  // Online users (global)
  onlineUsers: new Map(), // sessionId -> Set<users>
  
  // Collaboration readiness
  isCollaborationReady: false,
  
  // Actions
  setConnection: (type, status) => set((state) => ({
    connections: {
      ...state.connections,
      [type]: { ...state.connections[type], ...status }
    }
  })),
  
  setOnlineUsers: (sessionId, users) => set((state) => ({
    onlineUsers: new Map(state.onlineUsers).set(sessionId, users)
  }))
}));
```

### **Phase 2: Form State Cleanup**
Replace form `useState` with TanStack Query mutation states:
```javascript
// Instead of:
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState('');

// Use:
const { isPending, error } = useMutation({...});
```

### **Phase 3: Connection State Migration**
Move WebSocket connection states from hooks to Zustand stores.

---

## ✅ **Expected Benefits**

1. **Better Performance** - Reduced re-renders from shared state
2. **Cleaner Architecture** - Clear separation between server and client state  
3. **Easier Debugging** - Centralized state in Zustand DevTools
4. **Consistent State** - No more sync issues between duplicate states
5. **Better Testing** - Easier to mock and test centralized state

---

## 📋 **Action Items**

- [ ] Audit all `useState` usage in hooks and identify client vs server state
- [ ] Migrate collaboration state to `collaborationStore.js`
- [ ] Remove duplicate form states and use TanStack Query mutation states
- [ ] Centralize WebSocket connection states
- [ ] Review and potentially refactor UserContext
- [ ] Update components to use centralized state
- [ ] Add proper TypeScript types for better type safety
- [ ] Update tests to work with new state management approach

This analysis shows that while the current TanStack Query/Zustand separation is generally good, there are several areas where client state has leaked into components via `useState` that would benefit from centralized Zustand management.
