/**
 * File Upload Component
 * Modern drag-and-drop file upload with progress tracking
 */

import { useState, useRef } from 'react';
import { Upload, File, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFileManager } from '@/hooks/file-manager/useFileManager';
import { useUploadProgress } from '@/hooks/file-manager/useFileEvents';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';

const ALLOWED_EXTENSIONS = ['.js', '.java', '.py', '.zip'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function FileUpload({ sessionId, className }) {
  const { userEmail } = useUser();
  const { uploadFile, isUploading } = useFileManager(sessionId);
  const { uploadProgress, startUpload, updateProgress, completeUpload, failUpload } = useUploadProgress();
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);

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
    setValidationError(null);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setValidationError(validationError);
      return;
    }

    if (!userEmail) {
      setValidationError('User email is required for file upload');
      return;
    }

    const fileId = `${Date.now()}-${file.name}`;
    startUpload(fileId, file.name);

    try {
      await uploadFile({
        file,
        userEmail,
        onProgress: (progress) => updateProgress(fileId, progress)
      });
      
      completeUpload(fileId);
    } catch (error) {
      failUpload(fileId, error.message);
      setValidationError(error.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]); // Only handle first file
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
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

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <UploadProgressItem
              key={fileId}
              fileName={progress.fileName}
              progress={progress.progress}
              status={progress.status}
              error={progress.error}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UploadProgressItem({ fileName, progress, status, error }) {
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="p-3 border rounded-lg bg-card">
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          {error && (
            <p className="text-xs text-red-500 truncate">{error}</p>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {status === 'uploading' ? `${progress}%` : status}
        </div>
      </div>
      
      {status === 'uploading' && (
        <Progress 
          value={progress} 
          className="mt-2 h-2"
          indicatorClassName={getStatusColor()}
        />
      )}
    </div>
  );
}

export default FileUpload;
