# Backend Route Consolidation

## Problem Analysis

The backend had **redundant and inconsistent file management routes** split across two route files:

### Before Consolidation:

**fileUpload.js** mounted at `/api/file-upload/`:
- `POST /api/file-upload/file-upload` ❌ **Redundant path**
- `GET /api/file-upload/session-files/:sessionId`

**getFile.js** mounted at `/api/`:
- `GET /api/get-file`
- `GET /api/by-session` 
- `GET /api/hierarchy`
- `DELETE /api/delete-file`
- `GET /api/stats`

### Issues:
1. **Redundant path**: `/api/file-upload/file-upload` was unnecessarily repetitive
2. **Inconsistent organization**: File operations split between two files with different mounting patterns
3. **Confusing API surface**: Frontend had to call different base paths for related operations
4. **Maintenance overhead**: Two files doing similar things

## Solution: Unified File Routes

Created a single **`/api/routes/files.js`** with clean, RESTful endpoints:

### New Unified API Structure:

```
/api/files/
├── POST   /upload                     # File upload (single or ZIP)
├── GET    /content?path=...&sessionId=...  # Get file content
├── GET    /session/:sessionId         # Get all files in session
├── GET    /hierarchy/:sessionId       # Get file hierarchy
├── GET    /stats/:sessionId          # Get storage statistics
└── DELETE /:sessionId/*              # Delete file (wildcard path)
```

### Benefits:

1. **Consistent API Pattern**: All file operations under `/api/files/*`
2. **RESTful Design**: Uses proper HTTP methods and resource-based URLs
3. **Clean Paths**: No redundant segments like `/file-upload/file-upload`
4. **Single Responsibility**: One file handles all file operations
5. **Better Documentation**: Clear, predictable API surface

## Frontend API Service Updates

Updated `/src/services/file-manager/fileApi.js` to use the new unified endpoints:

### Before:
```javascript
// Mixed endpoints - confusing!
await apiClient.post('/file-upload/file-upload', formData);
await apiClient.get('/api/by-session?session=...');
await apiClient.get('/hierarchy?session=...');
await apiClient.get('/get-file?path=...');
await apiClient.delete('/delete-file', {...});
```

### After:
```javascript
// Consistent /api/files/* pattern
await apiClient.post('/api/files/upload', formData);
await apiClient.get('/api/files/session/${sessionId}');
await apiClient.get('/api/files/hierarchy/${sessionId}');
await apiClient.get('/api/files/content?path=...&sessionId=...');
await apiClient.delete('/api/files/${sessionId}/${filePath}');
```

## Migration Strategy

### 1. Server Changes:
- ✅ Created unified `/api/routes/files.js`
- ✅ Updated `server.js` to mount single route: `app.use('/api/files', fileRoutes())`
- ✅ Removed separate route imports and mounts

### 2. Frontend Changes:
- ✅ Updated `fileApiService` to use new endpoints
- ✅ Maintained same API interface - no component changes needed
- ✅ Fixed inconsistent route patterns

### 3. Backward Compatibility:
- **Old endpoints will return 404** - clean break
- **Frontend updated simultaneously** - no compatibility issues
- **Y-WebSocket integration preserved** - real-time features unaffected

## Performance Benefits

1. **Reduced API confusion**: Developers know all file operations are under `/api/files/*`
2. **Better caching**: Consistent URL patterns enable better HTTP caching strategies
3. **Simplified testing**: Single route file to test instead of two
4. **Cleaner documentation**: One endpoint namespace to document

## Route Comparison Table

| Operation | Old Endpoint | New Endpoint | Improvement |
|-----------|-------------|--------------|-------------|
| Upload | `/api/file-upload/file-upload` | `/api/files/upload` | Removed redundancy |
| Get Files | `/api/by-session?session=X` | `/api/files/session/X` | RESTful params |
| Get Content | `/api/get-file?path=X&sessionId=Y` | `/api/files/content?path=X&sessionId=Y` | Clearer purpose |
| Hierarchy | `/api/hierarchy?session=X` | `/api/files/hierarchy/X` | RESTful params |
| Delete | `/api/delete-file` | `/api/files/X/Y` | RESTful resource |
| Stats | `/api/stats?session=X` | `/api/files/stats/X` | RESTful params |

## Files Modified

### Backend:
- ✅ **Created**: `/api/routes/files.js` (unified file management)
- ✅ **Modified**: `/api/server.js` (updated route mounting)
- 🗂️ **Legacy**: `/api/routes/fileUpload.js` (can be removed)
- 🗂️ **Legacy**: `/api/routes/getFile.js` (can be removed)

### Frontend:
- ✅ **Modified**: `/src/services/file-manager/fileApi.js` (updated endpoints)

## Testing Checklist

- [ ] Upload single file
- [ ] Upload ZIP file
- [ ] Download file content
- [ ] View file hierarchy
- [ ] Delete files
- [ ] Check storage stats
- [ ] Real-time collaboration still works
- [ ] Y-WebSocket notifications still fire

## Next Steps

1. **Remove legacy route files** after confirming everything works
2. **Update API documentation** to reflect new endpoint structure
3. **Add API versioning** if needed for future changes
4. **Consider rate limiting** on file operations
5. **Add file operation logging** for audit trails

## API Documentation Update

The new unified file API provides a clean, RESTful interface:

```bash
# Upload a file
POST /api/files/upload
Content-Type: multipart/form-data
Body: { file, sessionID, email }

# Get file content  
GET /api/files/content?path={filePath}&sessionId={sessionId}

# Get all files in session
GET /api/files/session/{sessionId}

# Get file hierarchy
GET /api/files/hierarchy/{sessionId}

# Get storage stats
GET /api/files/stats/{sessionId}

# Delete a file
DELETE /api/files/{sessionId}/{filePath}
Body: { userEmail }
```

This consolidation eliminates confusion and provides a much cleaner API surface for the frontend to consume.
