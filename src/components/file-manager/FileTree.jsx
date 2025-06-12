/**
 * File Tree Component
 * Displays hierarchical file structure with interactive features
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen, 
  Trash2, 
  Download,
  MoreHorizontal 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFileManager, fileQueryKeys } from '@/hooks/file-manager/useFileQueries';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/lib/utils';
import { trackFileLoading } from '@/utils/performanceMonitor';

export function FileTree({ sessionId, onFileSelect, onFileDeleted, selectedFilePath, userEmail, className }) {
  const { hierarchy, isLoading, deleteFile, isDeleting } = useFileManager(sessionId, userEmail);
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  // Prefetch file content on hover for instant loading
  const handleFileHover = async (file) => {
    if (file.type !== 'folder' && sessionId) {
      const queryKey = fileQueryKeys.content(sessionId, file.path);
      
      // Check if already cached
      const cachedData = queryClient.getQueryData(queryKey);
      if (!cachedData) {
        // Prefetch content in background
        queryClient.prefetchQuery({
          queryKey,
          queryFn: async () => {
            const response = await apiClient.get(
              `/api/files/content?path=${encodeURIComponent(file.path)}&sessionId=${encodeURIComponent(sessionId)}`,
              { responseType: 'text' }
            );
            return response.data;
          },
          staleTime: 10 * 60 * 1000,
        });
      }
    }
  };

  // Prefetch small files immediately when component mounts
  React.useEffect(() => {
    if (hierarchy && hierarchy.length > 0 && sessionId) {
      const prefetchSmallFiles = (items) => {
        items.forEach((item, index) => {
          if (item.type === 'file' && item.size && item.size < 100000) { // Files under 100KB (increased from 50KB)
            const queryKey = fileQueryKeys.content(sessionId, item.path);
            
            // Only prefetch if not already cached
            if (!queryClient.getQueryData(queryKey)) {
              // Stagger requests to avoid overwhelming server
              setTimeout(() => {
                console.log('🚀 Prefetching file for instant loading:', item.path);
                queryClient.prefetchQuery({
                  queryKey,
                  queryFn: async () => {
                    const response = await apiClient.get(
                      `/api/files/content?path=${encodeURIComponent(item.path)}&sessionId=${encodeURIComponent(sessionId)}`,
                      { responseType: 'text' }
                    );
                    return response.data;
                  },
                  staleTime: 10 * 60 * 1000, // 10 minutes
                  gcTime: 30 * 60 * 1000, // 30 minutes
                });
              }, index * 200); // Stagger with 200ms intervals
            }
          } else if (item.children) {
            prefetchSmallFiles(item.children);
          }
        });
      };
      
      // Start prefetching after a short delay to let the UI settle
      setTimeout(() => {
        prefetchSmallFiles(hierarchy);
      }, 500);
    }
  }, [hierarchy, sessionId, queryClient]);

  const handleFileClick = async (file) => {
    if (onFileSelect && file.type !== 'folder') {
      // Start performance tracking
      trackFileLoading.start(file.path);
      
      const queryKey = fileQueryKeys.content(sessionId, file.path);
      
      // Try to get content from cache first for instant loading
      trackFileLoading.cacheCheck(file.path);
      const cachedContent = queryClient.getQueryData(queryKey);
      
      if (cachedContent !== undefined) {
        // Use cached content for instant loading
        console.log('⚡ Instant file loading from cache:', file.path);
        onFileSelect(file.path, cachedContent);
        trackFileLoading.end(file.path);
      } else {
        // Content not in cache, start loading and pass empty content for now
        console.log('📡 Loading file content from server:', file.path);
        trackFileLoading.apiRequest(file.path);
        onFileSelect(file.path, '');
        
        // Trigger content fetch in background
        queryClient.prefetchQuery({
          queryKey,
          queryFn: async () => {
            const response = await apiClient.get(
              `/api/files/content?path=${encodeURIComponent(file.path)}&sessionId=${encodeURIComponent(sessionId)}`,
              { responseType: 'text' }
            );
            trackFileLoading.apiResponse(file.path);
            return response.data;
          },
          staleTime: 10 * 60 * 1000,
        }).then(() => {
          trackFileLoading.end(file.path);
        });
      }
    }
  };

  const handleDeleteClick = (file, e) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent any default behavior
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (fileToDelete && !isDeleting) {
      const filePathToDelete = fileToDelete.path;
      
      try {
        // First close the dialog and clear state
        setDeleteDialogOpen(false);
        setFileToDelete(null);
        
        // Then perform the deletion
        await deleteFile({ filePath: filePathToDelete });
        
        // Notify parent component about the deletion after successful deletion
        if (onFileDeleted) {
          onFileDeleted(filePathToDelete);
        }
      } catch (error) {
        console.error('Delete operation failed:', error);
        // Reset state on error
        setDeleteDialogOpen(false);
        setFileToDelete(null);
      }
    }
  };

  const getFileIcon = (file) => {
    if (file.type === 'folder') {
      return expandedFolders.has(file.path) ? (
        <FolderOpen className="h-4 w-4 text-blue-500" />
      ) : (
        <Folder className="h-4 w-4 text-blue-500" />
      );
    }

    // File type icons
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return <File className="h-4 w-4 text-yellow-500" />;
      case 'ts':
      case 'tsx':
        return <File className="h-4 w-4 text-blue-600" />;
      case 'py':
        return <File className="h-4 w-4 text-green-500" />;
      case 'java':
        return <File className="h-4 w-4 text-orange-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderTreeNode = (node, level = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFilePath === node.path;

    return (
      <div key={node.path}>
        <div
          className={cn(
            'flex items-center group hover:bg-accent/50 rounded-sm cursor-pointer',
            isSelected && 'bg-accent',
            level > 0 && `ml-${level * 4}`
          )}
          style={{ paddingLeft: `${level * 16}px` }}
          onClick={() => isFolder ? toggleFolder(node.path) : handleFileClick(node)}
          onMouseEnter={() => !isFolder ? handleFileHover(node) : null}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-4 h-4 flex items-center justify-center">
            {isFolder && (
              isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )
            )}
          </div>

          {/* File/Folder Icon */}
          <div className="mr-2">
            {getFileIcon(node)}
          </div>

          {/* Name */}
          <span className="flex-1 text-sm truncate">
            {node.name}
          </span>

          {/* File Size */}
          {!isFolder && node.size && (
            <span className="text-xs text-muted-foreground mr-2">
              {formatFileSize(node.size)}
            </span>
          )}

          {/* Actions Menu */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
                aria-label="File actions menu"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              {!isFolder && (
                <DropdownMenuItem onClick={() => handleFileClick(node)}>
                  <Download className="h-4 w-4 mr-2" />
                  Open
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => handleDeleteClick(node, e)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Children */}
        {isFolder && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (!hierarchy || hierarchy.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No files in this session</p>
        <p className="text-xs">Upload files to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn('space-y-1', className)}>
        {hierarchy.map(node => renderTreeNode(node))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{fileToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

FileTree.propTypes = {
  sessionId: PropTypes.string.isRequired,
  onFileSelect: PropTypes.func,
  onFileDeleted: PropTypes.func,
  selectedFilePath: PropTypes.string,
  userEmail: PropTypes.string,
  className: PropTypes.string
};

export default FileTree;
