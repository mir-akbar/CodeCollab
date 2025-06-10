# File Upload Flow Documentation - CodeLab Backend

## Overview
This document provides a comprehensive guide to how the file upload system works in the CodeLab backend. The system is designed for real-time collaborative coding sessions with Y-WebSocket support and MongoDB storage.

## Architecture Overview

The file upload system consists of several key components:

1. **Upload Route Handler** (`/api/routes/fileUpload.js`)
2. **File Storage Service** (`/api/services/fileStorageService.js`) - Main orchestrator
3. **Core Storage Operations** (`/api/services/FileStorageCore.js`)
4. **ZIP Processing** (`/api/services/ZipProcessor.js`)
5. **Upload Handler** (`/api/services/FileUploadHandler.js`)
6. **Y.js Document Sync** (`/api/services/YjsDocumentSync.js`)
7. **MongoDB Model** (`/api/models/FileStorage.js`)
8. **Y-WebSocket Server** (`/api/services/yjsWebSocketServer.js`)

## File Upload Flow

### 1. Initial Request Validation

**Endpoint**: `POST /file-upload/file-upload`

**Required Headers**:
- `Content-Type: multipart/form-data`

**Required Fields**:
- `file`: The uploaded file (single file via multer)
- `sessionID`: Session identifier
- `email`: User's email address

**Validation Steps**:
1. **File Presence Check**: Ensures a file is uploaded
2. **Required Fields Check**: Validates sessionID and email are provided
3. **File Extension Check**: Only allows `.js`, `.java`, `.py`, `.zip` files
4. **File Size Check**: Maximum 50MB limit
5. **Session Access Check**: Validates user has "editor" permission for the session

### 2. Session Access Validation

```javascript
const hasAccess = await accessService.checkSessionAccess(sessionID, email, 'editor');
```

- Uses `accessService` to verify user permissions
- Requires "editor" level access for file uploads
- Returns 403 error if access is denied

### 3. File Processing Branch

The system handles two types of uploads:

#### A. Single File Upload (`.js`, `.java`, `.py`)

**Flow**:
1. **Y-WebSocket Server Check**: Ensures real-time collaboration service is available
2. **File Storage**: Calls `fileStorageService.uploadFile()`
3. **Real-time Notification**: Notifies Y-WebSocket room about new file
4. **Y-WebSocket Events**: Broadcasts `fileUploaded` event to session participants

**File Storage Process**:
```javascript
const result = await fileStorageService.uploadFile(
  sessionID,
  {
    fileName: req.file.originalname,
    fileType: fileExt,
    content: req.file.buffer,
    mimeType: req.file.mimetype || 'text/plain',
    parentFolder: null,
    filePath: req.file.originalname
  },
  email
);
```

#### B. ZIP File Upload

**Flow**:
1. **Y-WebSocket Server Check**: Ensures real-time collaboration service is available
2. **Initial Event**: Broadcasts `zipUploadStarted` event to session participants
3. **ZIP Processing**: Calls `fileStorageService.uploadZipFile()`
4. **Real-time Notifications**: Notifies Y-WebSocket rooms for each extracted file
5. **Completion Events**: Broadcasts `zipUploadComplete` event to session participants

### 4. File Storage Service Layer

**Main Service**: `PureYjsFileStorageService`

**Key Components**:
- `FileStorageCore`: Core CRUD operations
- `ZipProcessor`: ZIP file extraction and processing
- `YjsDocumentSync`: Y.js document synchronization
- `FileUploadHandler`: Upload orchestration

**Core Methods**:
```javascript
// Single file upload
async uploadFile(sessionId, fileData, uploaderEmail)

// ZIP file upload
async uploadZipFile(sessionId, zipFile, uploaderEmail)

// Core operations
async storeFile(fileData)
async getFile(sessionId, filePath)
async updateFileContent(sessionId, filePath, newContent, cognitoId)
async deleteFile(sessionId, filePath)
```

### 5. ZIP Processing Flow

**ZipProcessor Service**:

1. **Stream Creation**: Creates readable stream from ZIP buffer
2. **Entry Processing**: Iterates through ZIP entries using `unzipper.Parse()`
3. **File Filtering**: 
   - Skips system files (`.DS_Store`, `__MACOSX`, etc.)
   - Only processes `.js`, `.java`, `.py` files
4. **Parallel Processing**: Processes multiple files concurrently with error recovery
5. **Content Extraction**: Reads file content into buffer
6. **MongoDB Storage**: Stores each file with proper metadata

**Key Features**:
- Progress tracking with file counters
- Error recovery (continues processing if one file fails)
- Folder structure preservation through `parentFolder` field

### 6. MongoDB Storage Schema

**Collection**: `file_storage`

**Document Structure**:
```javascript
{
  sessionId: String,      // Session identifier
  fileName: String,       // Original file name
  filePath: String,       // Full path within session
  fileType: String,       // File extension (.js, .py, etc.)
  mimeType: String,       // MIME type
  fileSize: Number,       // File size in bytes
  content: Buffer,        // File content as binary data
  uploadedBy: String,     // User's email/cognitoId
  parentFolder: String,   // Parent folder path (null for root)
  lastModified: Date,     // Last modification time
  createdAt: Date,        // Creation timestamp
  updatedAt: Date         // Last update timestamp
}
```

**Indexes**:
- `{ sessionId: 1, filePath: 1 }` (unique)
- `{ sessionId: 1, parentFolder: 1 }`
- `{ sessionId: 1, uploadedBy: 1 }`

### 7. Real-time Collaboration Integration

**Y-WebSocket Integration**:

1. **Room Creation**: Creates collaboration rooms for each file
2. **Real-time Notifications**: Broadcasts file events to room participants
3. **Document Sync**: Synchronizes Y.js document state with MongoDB

**Y-WebSocket Events Broadcasted**:
- `zipUploadStarted`: When ZIP processing begins
- `fileUploaded`: When single file is uploaded
- `filesChanged`: When file structure changes
- `zipUploadComplete`: When ZIP processing completes

### 8. Error Handling

**Common Error Scenarios**:

1. **File Validation Errors** (400):
   - No file uploaded
   - Unsupported file type
   - File too large
   - Missing required fields

2. **Access Control Errors** (403):
   - Insufficient session permissions
   - Session access denied

3. **Service Availability Errors** (503):
   - Y-WebSocket server unavailable
   - Real-time collaboration service down

4. **Processing Errors** (500):
   - MongoDB connection issues
   - File processing failures
   - ZIP extraction errors

## API Response Formats

### Successful Single File Upload
```javascript
{
  success: true,
  files: [{
    id: "64f7b123456789abcdef0123",
    name: "example.js",
    type: "js",
    path: "example.js",
    size: 1024,
    uploadedBy: "user@example.com",
    uploadedAt: "2024-01-15T10:30:00.000Z"
  }],
  message: "File uploaded and ready for collaboration",
  uploadMode: "hybrid",
  originalFileName: "example.js"
}
```

### Successful ZIP Upload
```javascript
{
  success: true,
  files: [
    {
      name: "main.js",
      type: "js", 
      path: "main.js",
      size: 1024
    },
    {
      name: "utils.py",
      type: "py",
      path: "src/utils.py", 
      size: 2048
    }
  ],
  totalFiles: 2,
  message: "ZIP upload complete: 2 files added",
  uploadMode: "hybrid",
  originalFileName: "project.zip"
}
```

### Error Response
```javascript
{
  error: "File upload failed",
  details: "Specific error message",
  fileName: "example.js",
  mode: "hybrid",
  hint: "Please try again or contact support if the issue persists"
}
```

## File Retrieval Flow

### Get File Content
**Endpoint**: `GET /files/get-file?path={filePath}&sessionId={sessionId}`

**Process**:
1. Decode and validate file path
2. Retrieve file from MongoDB using `fileStorageService.getFile()`
3. Set appropriate headers (Content-Type, Content-Length)
4. Return file content as buffer

### Get Session Files
**Endpoint**: `GET /files/by-session?session={sessionId}`

**Process**:
1. Validate session ID
2. Retrieve all files for session (excluding content)
3. Transform to frontend-expected format
4. Return file list with metadata

### Get File Hierarchy
**Endpoint**: `GET /files/hierarchy?session={sessionId}`

**Process**:
1. Retrieve all session files
2. Build hierarchical structure using `FileUtils.buildHierarchy()`
3. Return nested folder/file structure

## Performance Considerations

1. **Memory Usage**: Files stored in memory during processing (50MB limit)
2. **MongoDB Optimization**: Content excluded from list queries
3. **Concurrent Processing**: ZIP files processed with parallel file handling
4. **Index Usage**: Efficient queries using compound indexes

## Security Features

1. **File Type Validation**: Only allows specific file extensions
2. **Size Limits**: 50MB maximum file size
3. **Session Access Control**: Editor permission required for uploads
4. **Path Validation**: Prevents directory traversal attacks
5. **Content Sanitization**: System files automatically filtered

## Y-WebSocket Events for Frontend Integration

### Upload Progress Events
```javascript
// Connect to Y-WebSocket server
const yjsProvider = new WebsocketProvider('ws://localhost:3001', sessionId);

// Listen for upload events
yjsProvider.on('message', (data) => {
  if (data.type === 'zipUploadStarted') {
    // data: { sessionID, fileName, fileSize, message }
  }
  
  if (data.type === 'fileUploaded') {
    // data: { sessionId, files, action }
  }
  
  if (data.type === 'zipUploadComplete') {
    // data: { sessionID, files, totalFiles, message }
  }
});
```

### Real-time Collaboration Events
```javascript
// File ready for collaboration
yjsProvider.on('message', (data) => {
  if (data.type === 'file-ready-for-collaboration') {
    // data: { type, file, message }
  }
});
```

## Frontend Integration Guidelines

### 1. File Upload Component Requirements

**Form Setup**:
```javascript
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('sessionID', currentSessionId);
formData.append('email', userEmail);
```

**Upload Request**:
```javascript
const response = await fetch('/file-upload/file-upload', {
  method: 'POST',
  body: formData
});
```

### 2. Progress Tracking

**For ZIP Files**:
- Listen to `zipUploadStarted` event via Y-WebSocket
- Show progress indicator
- Listen to `zipUploadComplete` event via Y-WebSocket
- Update file list

**For Single Files**:
- Listen to `fileUploaded` event via Y-WebSocket
- Update file list immediately

### 3. Error Handling

**Validation Errors** (400):
- Show user-friendly error message
- Highlight validation issues
- Provide corrective guidance

**Permission Errors** (403):
- Notify user about insufficient permissions
- Suggest contacting session owner

**Service Errors** (503):
- Show service unavailable message
- Suggest trying again later

### 4. File List Management

**After Upload**:
- Refresh file hierarchy
- Update file counts
- Maintain current folder state

**Real-time Updates**:
- Listen to `filesChanged` events via Y-WebSocket
- Update file list without full refresh
- Handle concurrent user uploads

## Database Queries

### Common Queries Used

```javascript
// Get file by path
FileStorage.findOne({ sessionId, filePath })

// Get all session files (metadata only)
FileStorage.find({ sessionId }).select('-content')

// Get files in folder
FileStorage.find({ sessionId, parentFolder })

// Update file content
FileStorage.findOneAndUpdate(
  { sessionId, filePath },
  { content, fileSize, uploadedBy, lastModified },
  { new: true }
)

// Delete file
FileStorage.deleteOne({ sessionId, filePath })

// Delete folder (cascade)
FileStorage.deleteMany({ 
  sessionId, 
  $or: [
    { filePath: folderPath },
    { filePath: { $regex: `^${folderPath}/` } }
  ]
})
```

## Configuration Requirements

### Environment Variables
- MongoDB connection string
- File upload limits
- Allowed file extensions
- Y-WebSocket server configuration

### Dependencies
- `multer`: File upload handling
- `unzipper`: ZIP file processing
- `mongoose`: MongoDB integration
- `y-websocket`: Real-time collaboration
- `yjs`: Shared document state

This documentation provides the complete picture of how file uploads work in the CodeLab backend. Use this as a reference when building the frontend components to ensure proper integration with all the backend features and real-time collaboration capabilities.
