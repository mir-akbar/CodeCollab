import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { CodeWorkspace } from '@/components/code-editor/CodeWorkspace';
import { FileManager } from '@/components/file-manager/FileManager';
import { SidebarProvider, SidebarInset, Sidebar } from "@/components/ui/sidebar";
import WebSocketErrorBoundary from '@/components/error-handling/WebSocketErrorBoundary';
import { useUIStore } from '@/stores';
import { useFileHierarchy } from '@/hooks/file-manager/useFileQueries';

export default function CodeWorkspacePage() {
  const location = useLocation();
  const [sessionId, setSessionId] = useState("");
  
  // Zustand state for file selection
  const { selectedFile, setSelectedFile, resetSelectedFile } = useUIStore();
  const lastSelectedFileRef = useRef(null);
  const autoSelectionDoneRef = useRef(false);

  // Get file hierarchy for auto-selection
  const { hierarchy } = useFileHierarchy(sessionId);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const session = searchParams.get("session");
    setSessionId(session);
  }, [location.search]);

  // Handle file selection from the file manager with debouncing
  const handleFileSelect = useCallback((filePath, content) => {
    // Prevent rapid successive selections of the same file
    if (lastSelectedFileRef.current === filePath) {
      return;
    }
    
    console.log('📁 File selected:', filePath);
    lastSelectedFileRef.current = filePath;
    
    setSelectedFile({
      path: filePath,
      content: content || "",
      name: filePath.split("/").pop()
    });
  }, [setSelectedFile]);

  // Auto-select first file when hierarchy loads and no file is selected
  useEffect(() => {
    if (
      hierarchy && 
      hierarchy.length > 0 && 
      !selectedFile && 
      !autoSelectionDoneRef.current
    ) {
      // Find the first file (not folder) in the hierarchy
      const findFirstFile = (files) => {
        for (const file of files) {
          if (file.type !== 'folder') {
            return file;
          }
          if (file.children && file.children.length > 0) {
            const childFile = findFirstFile(file.children);
            if (childFile) return childFile;
          }
        }
        return null;
      };

      const firstFile = findFirstFile(hierarchy);
      if (firstFile) {
        console.log('🎯 Auto-selecting first file for collaboration:', firstFile.path);
        autoSelectionDoneRef.current = true;
        handleFileSelect(firstFile.path, '');
      }
    }
  }, [hierarchy, selectedFile, handleFileSelect]);

  // Handle file deletion - clear selection if deleted file was selected
  const handleFileDeleted = useCallback((deletedFilePath) => {
    console.log('🗑️ File deleted:', deletedFilePath);
    if (selectedFile && selectedFile.path === deletedFilePath) {
      console.log('📝 Clearing selected file as it was deleted');
      resetSelectedFile();
      lastSelectedFileRef.current = null;
    }
  }, [selectedFile, resetSelectedFile]);

  return (
    <WebSocketErrorBoundary>
      <SidebarProvider className="h-screen w-screen flex bg-[#1e1e1e]">
        <Sidebar className="border-r border-[#444]">
          <WebSocketErrorBoundary>
            <FileManager 
              sessionId={sessionId} 
              onFileSelect={handleFileSelect}
              onFileDeleted={handleFileDeleted}
              selectedFilePath={selectedFile?.path}
            />
          </WebSocketErrorBoundary>
        </Sidebar>
        <SidebarInset className="flex-1">
          <WebSocketErrorBoundary>
            <CodeWorkspace 
              selectedFile={selectedFile} 
              sessionId={sessionId}
              onFileDeleted={handleFileDeleted}
            />
          </WebSocketErrorBoundary>
        </SidebarInset>
      </SidebarProvider>
    </WebSocketErrorBoundary>
  );
}