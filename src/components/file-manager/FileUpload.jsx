/**
 * File Upload Component
 * Modern drag-and-drop file upload with validation
 */

import { useRef } from 'react';
import PropTypes from 'prop-types';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFileUpload } from '@/hooks/file-manager/useFileQueries';
import { useFileOperationsStore } from '@/stores/fileOperationsStore';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';

const ALLOWED_EXTENSIONS = ['.js', '.java', '.py', '.zip'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function FileUpload({ sessionId, className }) {
  const { userEmail } = useUser();
  const { mutate: uploadFile, isPending: isUploading } = useFileUpload(sessionId);
  const fileInputRef = useRef(null);
  
  // Zustand store for UI state (just drag/drop and validation)
  const {
    sessions,
    initializeSession,
    setDragOver,
    setValidationError,
    clearValidationError
  } = useFileOperationsStore();

  // Initialize session if needed
  if (!sessions[sessionId]) {
    initializeSession(sessionId);
  }
  
  const sessionData = sessions[sessionId] || {};
  const { isDragOver = false, validationError = null } = sessionData;

  const validateFile = (file) => {
    // Check file extension
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      return `File type ${fileExt} is not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return `File too large: ${sizeMB}MB. Maximum size is 50MB.`;
    }

    return null;
  };

  const handleFileUpload = async (file) => {
    clearValidationError(sessionId);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setValidationError(sessionId, validationError);
      return;
    }

    if (!userEmail) {
      setValidationError(sessionId, 'User email is required for file upload');
      return;
    }

    try {
      await uploadFile({
        file,
        userEmail
      });
    } catch (error) {
      setValidationError(sessionId, error.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(sessionId, false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]); // Only handle first file
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(sessionId, true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(sessionId, false);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
    // Reset input
    e.target.value = '';
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
          'hover:border-primary/50 hover:bg-accent/10',
          isDragOver && 'border-primary bg-accent/20',
          isUploading && 'pointer-events-none opacity-50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-2">
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}

          <div>
            <p className="text-sm font-medium">
              {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: {ALLOWED_EXTENSIONS.join(', ')} (max 50MB)
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={(e) => {
              e.stopPropagation();
              openFileDialog();
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose File
          </Button>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// PropTypes
FileUpload.propTypes = {
  sessionId: PropTypes.string.isRequired,
  className: PropTypes.string
};

export default FileUpload;
