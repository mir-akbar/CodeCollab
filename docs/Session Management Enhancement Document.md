# Session Management Enhancement Document

## Overview
This document outlines comprehensive improvements to the CodeLab session management system, addressing two critical issues:
1. **Session Name Uniqueness** - Preventing duplicate session names and improving user experience
2. **Complete Session Deletion** - Ensuring proper cleanup of files and database records

---

## 1. Session Name Uniqueness Implementation

### Problem Statement
Currently, multiple sessions can have identical names, creating confusion for users when identifying and managing their sessions.

### Solution Architecture
Implement **user-scoped uniqueness** with real-time validation and smart suggestions.

### Database Schema Changes

#### File: `api/models/Session.js`

**Add new fields:**
```javascript
const SessionSchema = new mongoose.Schema({
  // ... existing fields
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true // Global unique identifier for URLs
  },
  // ... rest of schema
});

// Add compound index for user-scoped uniqueness
SessionSchema.index({ creator: 1, name: 1 }, { unique: true });

// Pre-save middleware for validation and slug generation
SessionSchema.pre('save', async function(next) {
  if (this.isModified('name') || this.isNew) {
    // Validate name uniqueness for user
    await this.validateNameUniqueness();
    
    // Generate unique slug for URLs
    this.slug = await this.generateUniqueSlug();
  }
  next();
});

SessionSchema.methods.validateNameUniqueness = async function() {
  const existing = await this.constructor.findOne({
    creator: this.creator,
    name: this.name,
    status: 'active',
    _id: { $ne: this._id }
  });
  
  if (existing) {
    throw new Error('You already have a session with this name');
  }
};

SessionSchema.methods.generateUniqueSlug = async function() {
  const baseSlug = this.name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
    
  let slug = baseSlug;
  let counter = 1;
  
  while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};
```

### API Endpoints

#### File: `api/routes/sessions.js`

**Add name validation endpoint:**
```javascript
// Real-time name validation
router.get('/validate-name', validateSessionAccess, async (req, res) => {
  try {
    const { name, creator } = req.query;
    
    if (!name || !creator) {
      return res.status(400).json({
        error: 'Name and creator are required'
      });
    }
    
    const exists = await Session.findOne({
      name: name.trim(),
      creator,
      status: 'active'
    });
    
    if (exists) {
      // Generate suggestions
      const suggestions = await generateNameSuggestions(name, creator);
      return res.json({
        available: false,
        suggestions
      });
    }
    
    res.json({ available: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Name suggestion generator
async function generateNameSuggestions(baseName, creator) {
  const suggestions = [];
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  
  // Try common variations
  const variations = [
    `${baseName} (New)`,
    `${baseName} v2`,
    `${baseName} - ${timestamp}`,
    `${baseName} (Copy)`,
    `My ${baseName}`
  ];
  
  for (const variation of variations) {
    const exists = await Session.findOne({
      name: variation,
      creator,
      status: 'active'
    });
    
    if (!exists) {
      suggestions.push(variation);
    }
    
    if (suggestions.length >= 3) break;
  }
  
  return suggestions;
}
```

### Frontend Implementation

#### File: `src/hooks/useNameValidation.js` (NEW FILE)

```javascript
import { useState, useEffect } from 'react';
import apiClient from '../utils/api';

export const useNameValidation = (name, creator, debounceMs = 500) => {
  const [validation, setValidation] = useState({
    isChecking: false,
    isValid: true,
    suggestions: [],
    error: null
  });

  useEffect(() => {
    if (!name?.trim() || !creator) {
      setValidation(prev => ({ ...prev, isValid: true, suggestions: [] }));
      return;
    }

    setValidation(prev => ({ ...prev, isChecking: true }));

    const debounceTimer = setTimeout(async () => {
      try {
        const response = await apiClient.get('/sessions/validate-name', {
          params: { name: name.trim(), creator }
        });

        setValidation({
          isChecking: false,
          isValid: response.data.available,
          suggestions: response.data.suggestions || [],
          error: null
        });
      } catch (error) {
        setValidation({
          isChecking: false,
          isValid: false,
          suggestions: [],
          error: error.message
        });
      }
    }, debounceMs);

    return () => clearTimeout(debounceTimer);
  }, [name, creator, debounceMs]);

  return validation;
};
```

#### File: `src/components/sessions/CreateSessionDialog.jsx`

**Enhance with real-time validation:**
```javascript
import { useNameValidation } from '../../hooks/useNameValidation';

const CreateSessionDialog = ({ open, onClose, onCreate }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userEmail = localStorage.getItem('email');
  
  // Real-time name validation
  const { isChecking, isValid, suggestions, error } = useNameValidation(
    formData.name,
    userEmail
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isValid || isChecking) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate(formData);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Session creation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData(prev => ({ ...prev, name: suggestion }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Session Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter session name"
              className={!isValid ? 'border-red-500' : ''}
              required
            />
            
            {/* Validation feedback */}
            {isChecking && (
              <p className="text-sm text-blue-600 mt-1">
                Checking availability...
              </p>
            )}
            
            {!isValid && !isChecking && (
              <div className="mt-2">
                <p className="text-sm text-red-600">
                  You already have a session with this name
                </p>
                
                {suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Suggestions:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {error && (
              <p className="text-sm text-red-600 mt-1">
                Error checking name: {error}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || isChecking || isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 2. Complete Session Deletion with File Cleanup

### Problem Statement
Current session deletion only updates database status but doesn't clean up associated files, leading to storage waste and orphaned files.

### Solution Architecture
Implement transactional deletion with comprehensive file cleanup and background maintenance jobs.

### Enhanced Session Service

#### File: `api/services/sessionService.js`

**Update deleteSession method:**
```javascript
const mongoose = require('mongoose');
const fs = require('fs').promises;

class SessionService {
  
  async deleteSession(sessionId, userEmail) {
    try {
      console.log(`🗑️ Starting session deletion: ${sessionId} by ${userEmail}`);
      
      // Step 1: Verify permissions
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }
      
      const userParticipant = await SessionParticipant.findOne({
        sessionId,
        userEmail
      });
      
      if (!userParticipant?.hasPermission('delete')) {
        throw new Error('Insufficient permissions to delete this session');
      }
      
      // Step 2: Start transaction for data consistency
      const mongoSession = await mongoose.startSession();
      
      try {
        await mongoSession.withTransaction(async () => {
          // Step 3: Mark session as deleted
          await Session.updateOne(
            { sessionId },
            { 
              status: 'deleted',
              deletedAt: new Date(),
              deletedBy: userEmail
            },
            { session: mongoSession }
          );
          
          // Step 4: Remove all participants
          await SessionParticipant.updateMany(
            { sessionId },
            { 
              status: 'removed',
              removedAt: new Date(),
              removedBy: userEmail
            },
            { session: mongoSession }
          );
          
          console.log(`✅ Database records updated for session: ${sessionId}`);
        });
        
        // Step 5: Clean up files after successful database operations
        const fileCleanupResult = await this.cleanupSessionFiles(sessionId);
        
        console.log(`🗑️ Session deletion completed:`, {
          sessionId,
          filesDeleted: fileCleanupResult.deletedCount,
          fileErrors: fileCleanupResult.error
        });
        
        return { 
          success: true,
          message: 'Session and associated files deleted successfully',
          filesDeleted: fileCleanupResult.deletedCount
        };
        
      } finally {
        await mongoSession.endSession();
      }
      
    } catch (error) {
      console.error(`❌ Session deletion failed for ${sessionId}:`, error);
      throw error;
    }
  }

  async cleanupSessionFiles(sessionId) {
    try {
      console.log(`🗑️ Starting file cleanup for session: ${sessionId}`);
      
      // Get all files for this session
      const FileStorage = require('../models/FileStorage');
      const files = await FileStorage.find({ sessionId });
      console.log(`📁 Found ${files.length} files to delete`);
      
      if (files.length === 0) {
        return { deletedCount: 0 };
      }
      
      // Delete files in batches to avoid overwhelming the system
      const batchSize = 10;
      let deletedCount = 0;
      const errors = [];
      
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (file) => {
          try {
            // Delete physical file if it exists
            if (file.filePath) {
              try {
                await fs.access(file.filePath);
                await fs.unlink(file.filePath);
                console.log(`🗑️ Deleted file: ${file.filePath}`);
              } catch (fsError) {
                // File doesn't exist, which is fine
                console.log(`📁 File not found (already deleted): ${file.filePath}`);
              }
            }
            
            // Delete file record from database
            await FileStorage.deleteOne({ _id: file._id });
            deletedCount++;
            
          } catch (fileError) {
            const errorMsg = `Failed to delete file ${file.filePath}: ${fileError.message}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
          }
        }));
        
        // Small delay between batches to prevent system overload
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ File cleanup completed. Deleted ${deletedCount}/${files.length} files`);
      
      return { 
        deletedCount,
        totalFiles: files.length,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      console.error('❌ File cleanup failed:', error);
      // Don't throw here - we want session deletion to succeed even if file cleanup fails
      return { 
        deletedCount: 0, 
        error: error.message 
      };
    }
  }

  // Method to get file count for a session (used by frontend)
  async getSessionFileCount(sessionId) {
    try {
      const FileStorage = require('../models/FileStorage');
      const count = await FileStorage.countDocuments({ sessionId });
      return { count };
    } catch (error) {
      console.error('Error getting file count:', error);
      return { count: 0 };
    }
  }
}
```

### File Storage Service Enhancement

#### File: `api/services/fileStorageService.js`

**Add comprehensive file management:**
```javascript
const fs = require('fs').promises;
const path = require('path');

class FileStorageService {
  
  async deleteSessionFiles(sessionId) {
    try {
      const FileStorage = require('../models/FileStorage');
      const files = await FileStorage.find({ sessionId });
      
      const results = {
        totalFiles: files.length,
        deleted: 0,
        failed: 0,
        errors: []
      };
      
      for (const file of files) {
        try {
          // Delete physical file
          if (file.filePath && await this.fileExists(file.filePath)) {
            await fs.unlink(file.filePath);
            console.log(`🗑️ Deleted physical file: ${file.filePath}`);
          }
          
          // Delete database record
          await FileStorage.deleteOne({ _id: file._id });
          results.deleted++;
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            file: file.filePath,
            error: error.message
          });
          console.error(`❌ Failed to delete file ${file.filePath}:`, error);
        }
      }
      
      // Try to remove empty session directory
      if (results.deleted > 0) {
        await this.cleanupEmptyDirectories(sessionId);
      }
      
      return results;
    } catch (error) {
      throw new Error(`File cleanup failed: ${error.message}`);
    }
  }
  
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async cleanupEmptyDirectories(sessionId) {
    try {
      // Assuming files are stored in uploads/sessions/{sessionId}/
      const sessionDir = path.join(process.cwd(), 'uploads', 'sessions', sessionId);
      
      if (await this.fileExists(sessionDir)) {
        const files = await fs.readdir(sessionDir);
        if (files.length === 0) {
          await fs.rmdir(sessionDir);
          console.log(`🗑️ Removed empty session directory: ${sessionDir}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up directories:', error);
      // Don't throw - this is best effort cleanup
    }
  }
  
  // Clean up orphaned files (files without session records)
  async cleanupOrphanedFiles() {
    try {
      const FileStorage = require('../models/FileStorage');
      const Session = require('../models/Session');
      
      console.log('🧹 Starting orphaned file cleanup...');
      
      const orphanedFiles = await FileStorage.aggregate([
        {
          $lookup: {
            from: 'sessions',
            localField: 'sessionId',
            foreignField: 'sessionId',
            as: 'session'
          }
        },
        {
          $match: {
            $or: [
              { session: { $size: 0 } }, // No matching session
              { 'session.status': 'deleted' } // Session is deleted
            ]
          }
        }
      ]);
      
      console.log(`📁 Found ${orphanedFiles.length} orphaned files`);
      
      let deletedCount = 0;
      for (const file of orphanedFiles) {
        try {
          if (file.filePath && await this.fileExists(file.filePath)) {
            await fs.unlink(file.filePath);
          }
          await FileStorage.deleteOne({ _id: file._id });
          deletedCount++;
        } catch (error) {
          console.error(`❌ Failed to delete orphaned file ${file.filePath}:`, error);
        }
      }
      
      console.log(`✅ Orphaned file cleanup completed. Deleted ${deletedCount} files.`);
      return { deletedCount, totalOrphaned: orphanedFiles.length };
      
    } catch (error) {
      console.error('❌ Orphaned file cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = new FileStorageService();
```

### API Route Enhancements

#### File: `api/routes/sessions.js`

**Add file count endpoint:**
```javascript
// Get file count for a session (for deletion warning)
router.get('/:sessionId/files/count', validateSessionAccess, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await sessionService.getSessionFileCount(sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced delete endpoint with file cleanup
router.delete('/:sessionId', validateSessionAccess, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const result = await sessionService.deleteSession(sessionId, email);
    res.json(result);
  } catch (error) {
    console.error('Session deletion failed:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Background Cleanup Jobs

#### File: `api/jobs/cleanupJobs.js` (NEW FILE)

```javascript
const cron = require('node-cron');
const Session = require('../models/Session');
const SessionParticipant = require('../models/SessionParticipant');
const fileStorageService = require('../services/fileStorageService');

class CleanupJobs {
  
  static init() {
    // Run cleanup job daily at 2 AM
    cron.schedule('0 2 * * *', () => {
      this.dailyCleanup();
    });
    
    // Run orphaned file cleanup weekly on Sundays at 3 AM
    cron.schedule('0 3 * * 0', () => {
      this.weeklyOrphanedFileCleanup();
    });
    
    console.log('🕐 Background cleanup jobs scheduled');
  }
  
  static async dailyCleanup() {
    console.log('🧹 Starting daily cleanup job...');
    
    try {
      // Clean up files for sessions deleted more than 30 days ago
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      
      const oldDeletedSessions = await Session.find({
        status: 'deleted',
        deletedAt: { $lt: cutoffDate }
      });
      
      console.log(`📁 Found ${oldDeletedSessions.length} old deleted sessions to clean up`);
      
      for (const session of oldDeletedSessions) {
        try {
          await fileStorageService.deleteSessionFiles(session.sessionId);
          console.log(`🗑️ Cleaned up files for session: ${session.sessionId}`);
          
          // Optionally hard delete very old sessions (90+ days)
          const veryOldDate = new Date();
          veryOldDate.setDate(veryOldDate.getDate() - 90);
          
          if (session.deletedAt < veryOldDate) {
            await Session.deleteOne({ _id: session._id });
            await SessionParticipant.deleteMany({ sessionId: session.sessionId });
            console.log(`🗑️ Hard deleted very old session: ${session.sessionId}`);
          }
        } catch (error) {
          console.error(`❌ Failed to clean up session ${session.sessionId}:`, error);
        }
      }
      
      console.log('✅ Daily cleanup completed');
    } catch (error) {
      console.error('❌ Daily cleanup failed:', error);
    }
  }
  
  static async weeklyOrphanedFileCleanup() {
    console.log('🧹 Starting weekly orphaned file cleanup...');
    
    try {
      const result = await fileStorageService.cleanupOrphanedFiles();
      console.log(`✅ Weekly orphaned file cleanup completed: ${result.deletedCount} files deleted`);
    } catch (error) {
      console.error('❌ Weekly orphaned file cleanup failed:', error);
    }
  }
  
  // Manual cleanup methods for admin use
  static async forceCleanupSession(sessionId) {
    try {
      const result = await fileStorageService.deleteSessionFiles(sessionId);
      console.log(`🗑️ Force cleanup completed for session ${sessionId}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Force cleanup failed for session ${sessionId}:`, error);
      throw error;
    }
  }
}

module.exports = CleanupJobs;
```

#### File: `api/server.js`

**Add cleanup job initialization:**
```javascript
// Add this after other imports
const CleanupJobs = require('./jobs/cleanupJobs');

// Add this after server setup but before starting the server
if (process.env.NODE_ENV !== 'test') {
  CleanupJobs.init();
}
```

### Frontend Enhancements

#### File: `src/components/sessions/DeleteDialog.jsx`

**Enhanced deletion confirmation with file warnings:**
```javascript
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileX, Loader2 } from 'lucide-react';
import apiClient from '../../utils/api';

const DeleteDialog = ({ open, session, onClose, onConfirm }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [isLoadingFileCount, setIsLoadingFileCount] = useState(false);
  
  useEffect(() => {
    if (open && session) {
      checkFileCount();
    }
  }, [open, session]);
  
  const checkFileCount = async () => {
    if (!session?.sessionId) return;
    
    setIsLoadingFileCount(true);
    try {
      const response = await apiClient.get(`/sessions/${session.sessionId}/files/count`);
      setFileCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to get file count:', error);
      setFileCount(0);
    } finally {
      setIsLoadingFileCount(false);
    }
  };
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (!session) return null;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Session
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <p>
              This will permanently delete "<strong>{session.name}</strong>" and cannot be undone.
            </p>
            
            {isLoadingFileCount ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for files...
              </div>
            ) : fileCount > 0 ? (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <FileX className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">
                    Files will be deleted
                  </p>
                  <p className="text-yellow-700">
                    This session contains {fileCount} file{fileCount !== 1 ? 's' : ''} that will also be permanently deleted.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                No files associated with this session.
              </div>
            )}
            
            <p className="text-sm font-medium text-gray-900">
              Are you sure you want to continue?
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="min-w-[100px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              'Delete Session'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteDialog;
```

#### File: `src/services/sessionActions.js`

**Enhanced error handling for deletion:**
```javascript
async deleteSession(sessionId, email) {
  try {
    console.log(`🗑️ Deleting session: ${sessionId}`);
    
    const response = await apiClient.delete(`/sessions/${sessionId}`, {
      data: { email }
    });
    
    if (response.data.success) {
      const filesDeleted = response.data.filesDeleted || 0;
      
      this.toast({ 
        title: "Session Deleted", 
        description: filesDeleted > 0 
          ? `Session and ${filesDeleted} associated files have been deleted`
          : "Session has been deleted successfully"
      });
      
      await this.refreshCallback();
      return { success: true };
    } else {
      throw new Error(response.data.error || 'Failed to delete session');
    }
  } catch (error) {
    console.error('Session deletion failed:', error);
    
    let errorMessage = 'Failed to delete session';
    if (error.response?.status === 403) {
      errorMessage = 'You do not have permission to delete this session';
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }
    
    this.handleError("Deletion Failed", { message: errorMessage });
    throw error;
  }
}
```

---

## Database Migration Script

#### File: `api/migrations/addSessionUniqueness.js` (NEW FILE)

```javascript
/**
 * Migration script to add session name uniqueness and slug generation
 * Run this after implementing the schema changes
 */

const mongoose = require('mongoose');
const Session = require('../models/Session');

async function migrateSessionSchema() {
  try {
    console.log('🔄 Starting session schema migration...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find all sessions without slugs
    const sessionsWithoutSlugs = await Session.find({ slug: { $exists: false } });
    console.log(`📁 Found ${sessionsWithoutSlugs.length} sessions without slugs`);
    
    let updated = 0;
    let errors = 0;
    
    for (const session of sessionsWithoutSlugs) {
      try {
        // Generate slug for existing session
        const baseSlug = session.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
          
        let slug = baseSlug;
        let counter = 1;
        
        // Ensure slug is unique
        while (await Session.findOne({ slug, _id: { $ne: session._id } })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        
        // Update the session
        await Session.updateOne(
          { _id: session._id },
          { $set: { slug } }
        );
        
        updated++;
        console.log(`✅ Updated session: ${session.name} -> ${slug}`);
        
      } catch (error) {
        errors++;
        console.error(`❌ Failed to update session ${session._id}:`, error.message);
      }
    }
    
    console.log(`🎉 Migration completed: ${updated} updated, ${errors} errors`);
    
    // Create indexes
    try {
      await Session.collection.createIndex({ creator: 1, name: 1 }, { unique: true });
      console.log('✅ Created compound index for name uniqueness');
    } catch (error) {
      console.error('❌ Failed to create index:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateSessionSchema();
}

module.exports = migrateSessionSchema;
```

---

## Testing Strategy

### Unit Tests

#### File: `tests/sessionNameUniqueness.test.js` (NEW FILE)

```javascript
const request = require('supertest');
const app = require('../api/server');
const Session = require('../api/models/Session');

describe('Session Name Uniqueness', () => {
  beforeEach(async () => {
    await Session.deleteMany({});
  });

  test('should prevent duplicate session names for same user', async () => {
    const sessionData = {
      name: 'Test Session',
      creator: 'test@example.com'
    };

    // Create first session
    await request(app)
      .post('/sessions')
      .send(sessionData)
      .expect(201);

    // Try to create duplicate
    const response = await request(app)
      .post('/sessions')
      .send(sessionData)
      .expect(400);

    expect(response.body.error).toContain('already have a session with this name');
  });

  test('should allow same session name for different users', async () => {
    const sessionData1 = { name: 'Test Session', creator: 'user1@example.com' };
    const sessionData2 = { name: 'Test Session', creator: 'user2@example.com' };

    await request(app).post('/sessions').send(sessionData1).expect(201);
    await request(app).post('/sessions').send(sessionData2).expect(201);
  });

  test('should validate session names in real-time', async () => {
    await Session.create({
      name: 'Existing Session',
      creator: 'test@example.com',
      sessionId: 'test-id'
    });

    const response = await request(app)
      .get('/sessions/validate-name')
      .query({ name: 'Existing Session', creator: 'test@example.com' })
      .expect(200);

    expect(response.body.available).toBe(false);
    expect(response.body.suggestions).toBeDefined();
  });
});
```

#### File: `tests/sessionDeletion.test.js` (NEW FILE)

```javascript
const request = require('supertest');
const app = require('../api/server');
const Session = require('../api/models/Session');
const FileStorage = require('../api/models/FileStorage');
const fs = require('fs').promises;
const path = require('path');

describe('Session Deletion with File Cleanup', () => {
  let testSession;
  let testFiles;

  beforeEach(async () => {
    // Create test session
    testSession = await Session.create({
      name: 'Test Session',
      creator: 'test@example.com',
      sessionId: 'test-session-id'
    });

    // Create test files
    testFiles = [
      { sessionId: 'test-session-id', filePath: '/tmp/test1.txt' },
      { sessionId: 'test-session-id', filePath: '/tmp/test2.txt' }
    ];

    for (const fileData of testFiles) {
      await FileStorage.create(fileData);
      await fs.writeFile(fileData.filePath, 'test content');
    }
  });

  afterEach(async () => {
    // Cleanup
    await Session.deleteMany({});
    await FileStorage.deleteMany({});
    
    for (const fileData of testFiles) {
      try {
        await fs.unlink(fileData.filePath);
      } catch (error) {
        // File already deleted, ignore
      }
    }
  });

  test('should delete session and all associated files', async () => {
    const response = await request(app)
      .delete(`/sessions/${testSession.sessionId}`)
      .send({ email: 'test@example.com' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.filesDeleted).toBe(2);

    // Verify session is marked as deleted
    const deletedSession = await Session.findOne({ sessionId: 'test-session-id' });
    expect(deletedSession.status).toBe('deleted');

    // Verify files are deleted from database
    const remainingFiles = await FileStorage.find({ sessionId: 'test-session-id' });
    expect(remainingFiles).toHaveLength(0);

    // Verify physical files are deleted
    for (const fileData of testFiles) {
      await expect(fs.access(fileData.filePath)).rejects.toThrow();
    }
  });

  test('should handle file deletion errors gracefully', async () => {
    // Delete one physical file before session deletion
    await fs.unlink(testFiles[0].filePath);

    const response = await request(app)
      .delete(`/sessions/${testSession.sessionId}`)
      .send({ email: 'test@example.com' })
      .expect(200);

    expect(response.body.success).toBe(true);
    // Should still succeed even if some files are missing
  });
});
```

---

## Deployment Checklist

### Pre-Deployment Steps

1. **Database Backup**
   ```bash
   mongodump --uri="your_mongodb_uri" --out=backup_before_session_changes
   ```

2. **Run Migration Script**
   ```bash
   node api/migrations/addSessionUniqueness.js
   ```

3. **Install Dependencies**
   ```bash
   npm install node-cron  # For background jobs
   ```

4. **Environment Variables**
   Add to `.env`:
   ```
   ENABLE_CLEANUP_JOBS=true
   FILE_CLEANUP_RETENTION_DAYS=30
   HARD_DELETE_RETENTION_DAYS=90
   ```

### Post-Deployment Verification

1. **Test Session Creation**
   - Create session with new name ✅
   - Try duplicate name (should fail) ✅
   - Check real-time validation ✅

2. **Test Session Deletion**
   - Delete session with files ✅
   - Verify files are cleaned up ✅
   - Check database status updates ✅

3. **Monitor Background Jobs**
   - Check cleanup job logs ✅
   - Verify orphaned file cleanup ✅

---

## Performance Considerations

1. **Database Indexes**
   - Compound index on `(creator, name)` for uniqueness checks
   - Index on `slug` for URL lookups
   - Index on `status` and `deletedAt` for cleanup jobs

2. **File Cleanup Batching**
   - Process files in batches of 10 to prevent system overload
   - Add delays between batches for large deletions

3. **Background Job Scheduling**
   - Daily cleanup during low-traffic hours (2 AM)
   - Weekly orphaned file cleanup on weekends

4. **Error Handling**
   - Session deletion succeeds even if file cleanup partially fails
   - Comprehensive logging for debugging
   - Graceful degradation for missing files

---

## Future Enhancements

1. **Session Templates**
   - Save successful session configurations as templates
   - Auto-suggest names based on templates

2. **Recycle Bin**
   - Soft delete with recovery option (30-day retention)
   - User interface for recovering deleted sessions

3. **File Versioning**
   - Keep file history for deleted sessions
   - Compress old files before final deletion

4. **Analytics**
   - Track deletion patterns
   - Storage usage analytics
   - Cleanup efficiency metrics

---

This comprehensive implementation ensures data integrity, improves user experience, and provides robust cleanup mechanisms for the CodeLab session management system.