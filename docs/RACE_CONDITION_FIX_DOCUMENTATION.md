# File Upload and Editor Collaboration Race Condition Fix

## Problem Description
Previously, there was a race condition between file uploads and collaboration initialization:

1. **Single file upload** → File content loads → Editor tries to initialize → Y-WebSocket not ready → Empty editor
2. **Multiple files** → Collaboration already established from first file → Subsequent files load correctly
3. **File switching** → Sometimes collaboration connection not ready → Empty editor panels

## Solution Implementation

### 1. Collaboration Readiness State
Added `isCollaborationReady` state to coordinate collaboration setup with editor initialization:

```js
const [isCollaborationReady, setIsCollaborationReady] = useState(false);
```

### 2. File Upload Event Coordination
Listen for `collaboration-ready` events from Y-WebSocket server:

```js
const cleanupFileEvents = fileWebSocketService.subscribeToFileEvents(sessionId, (event) => {
  if (event.type === 'collaboration-ready' && event.data.file?.path === filePath) {
    setIsCollaborationReady(true);
  }
});
```

### 3. Backend Event Emission
Updated file upload handlers to emit `file-ready-for-collaboration` events:

```js
this.yjsDocumentSync.notifyCollaborationRoom(sessionId, fileInfo.path, {
  type: 'file-ready-for-collaboration',
  file: fileInfo,
  message: `File uploaded and ready for real-time editing: ${fileName}`
});
```

### 4. Editor Initialization Sequencing
Modified Monaco Editor to wait for collaboration readiness:

```js
// Wait for collaboration to be ready before initializing content
if (!isCollaborationReady) {
  console.log('⏳ Waiting for collaboration to be ready for:', filePath);
  return;
}
```

### 5. Loading States
Updated loading conditions to show proper states:

```js
// Show loading while content is loading OR waiting for collaboration
if (contentLoading || (!isCollaborationReady && filePath)) {
  return <LoadingSpinner message="Setting up real-time collaboration..." />;
}
```

## Flow Sequence

### New File Upload:
1. User uploads file
2. Backend stores file in MongoDB  
3. Backend creates Y-WebSocket collaboration room
4. Backend emits `file-ready-for-collaboration` event
5. Frontend receives event and sets `isCollaborationReady = true`
6. Editor waits for both file content AND collaboration readiness
7. Editor initializes with content when both are ready

### Existing File Selection:
1. User selects existing file
2. File content loads from cache/API
3. Y-WebSocket connection establishes (short timeout)
4. Collaboration readiness set after brief delay
5. Editor initializes when both content and collaboration are ready

## Benefits

✅ **Eliminates race conditions** between file loading and collaboration setup
✅ **Consistent behavior** for single uploads, multiple uploads, and file switching  
✅ **Better user feedback** with specific loading messages
✅ **Fallback timeout** ensures system doesn't hang indefinitely
✅ **Preserves performance** with shorter timeouts for existing files

## Testing

To test the fix:
1. Upload a single file → Should show "Setting up real-time collaboration..." then load content
2. Upload multiple files → All files should load properly  
3. Switch between files → Should consistently load without empty editors
4. Check browser console for collaboration events and timing logs
