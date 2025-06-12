import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { CodeWorkspace } from '@/components/code-editor/CodeWorkspace';
import { FileManager } from '@/components/file-manager/FileManager';
import { SidebarProvider, SidebarInset, Sidebar } from "@/components/ui/sidebar";
import WebSocketErrorBoundary from '@/components/error-handling/WebSocketErrorBoundary';

export default function CodeWorkspacePage() {
  const location = useLocation();
  const [sessionId, setSessionId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const lastSelectedFileRef = useRef(null);

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
  }, []);

  // Handle file deletion - clear selection if deleted file was selected
  const handleFileDeleted = useCallback((deletedFilePath) => {
    console.log('🗑️ File deleted:', deletedFilePath);
    if (selectedFile && selectedFile.path === deletedFilePath) {
      console.log('📝 Clearing selected file as it was deleted');
      setSelectedFile(null);
      lastSelectedFileRef.current = null;
    }
  }, [selectedFile]);

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
            />
          </WebSocketErrorBoundary>
        </SidebarInset>
      </SidebarProvider>
    </WebSocketErrorBoundary>
  );
}