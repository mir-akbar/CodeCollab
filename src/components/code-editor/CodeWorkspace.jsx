/**
 * Modern Code Workspace Component
 * Replaces the legacy CodeEditor with modular architecture
 */

import { useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

import { MonacoEditor } from "./MonacoEditor";
import { CollaborationPanel } from "../CollaborationPanel";
import { OutputPanel } from "../OutputPanel";
import { TopNavBar } from "../TopNavBar";
import { useCodeExecution } from "@/hooks/code-editor/useCodeCollaboration";
import { codeCollaborationService } from "@/services/code-editor/codeCollaborationService";
import { useFileEvents } from "@/hooks/file-manager/useFileEvents";
import { decryptSessionAccess } from "@/utils/sessionUtils";
import useEditorStore from "@/stores/editorStore";

export function CodeWorkspace({ selectedFile, onFileDeleted }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // URL parameters
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get("session");
  const encryptedAccess = searchParams.get("access");
  
  // Zustand state
  const { 
    output, 
    isOutputVisible, 
    isEditable, 
    isExecuting, 
    currentContent,
    setOutput,
    setOutputVisible,
    setEditable,
    setExecuting,
    setCurrentContent
  } = useEditorStore();

  // Hooks
  const { executeCode } = useCodeExecution();
  const { lastEvent } = useFileEvents(sessionId);

  // Handle file deletion events - centralized handler
  const handleFileDeleted = useCallback((deletedFilePath) => {
    console.log('🗑️ File deletion handler called in CodeWorkspace:', deletedFilePath);
    
    // Clear the editor content and reset state
    setCurrentContent('');
    setOutputVisible(false);
    setOutput('');
    
    // Notify parent to clear the selected file
    if (onFileDeleted) {
      onFileDeleted(deletedFilePath);
    }
  }, [setCurrentContent, setOutputVisible, setOutput, onFileDeleted]);
  
  // Handle file deletion events from file events system
  useEffect(() => {
    if (lastEvent?.type === 'file-deleted' && selectedFile) {
      const deletedFilePath = lastEvent.data.file?.path;
      const deletedBy = lastEvent.data.deletedBy;
      
      // Check if the currently open file was deleted
      if (deletedFilePath === selectedFile.path) {
        console.log('🗑️ Currently open file was deleted:', deletedFilePath);
        
        // Show notification to user
        toast.error(`File deleted by ${deletedBy || 'another user'}`, {
          description: `"${selectedFile.name || selectedFile.path}" has been deleted and is no longer available.`,
          duration: 5000
        });
        
        // Clean up collaboration for this file (use special method for deleted files)
        if (sessionId) {
          try {
            codeCollaborationService.disconnectDeletedFile(sessionId, selectedFile.path);
          } catch (error) {
            console.warn('Error disconnecting collaboration for deleted file:', error);
          }
        }
        
        // Use centralized deletion handler
        handleFileDeleted(deletedFilePath);
      }
    }
  }, [lastEvent, selectedFile, sessionId, handleFileDeleted]);

  // Decrypt access permissions
  useEffect(() => {
    if (encryptedAccess) {
      try {
        console.log('CodeWorkspace: Attempting to decrypt access token:', encryptedAccess);
        const access = decryptSessionAccess(encryptedAccess);
        console.log('CodeWorkspace: Decrypted access:', access);
        setEditable(access === "edit");
      } catch (error) {
        console.error("Error decrypting access:", error);
        toast.error("Invalid session access token");
        // Don't navigate away immediately, let the user see the workspace
        // Just set read-only mode
        setEditable(false);
      }
    } else {
      // No access token provided, default to read-only
      console.log('CodeWorkspace: No access token provided, defaulting to read-only');
      setEditable(false);
    }
  }, [encryptedAccess, navigate, setEditable]);

  // Validate session ID
  useEffect(() => {
    if (!sessionId) {
      toast.error("No session ID provided");
      navigate("/");
      return;
    }
  }, [sessionId, navigate]);

  // Handle code execution
  const handleRunCode = async () => {
    if (!selectedFile) {
      setOutputVisible(true);
      setOutput("No file selected. Please select a file to run code.");
      return;
    }

    const extension = selectedFile.path.split(".").pop()?.toLowerCase();
    let language;

    // Map file extensions to execution languages
    switch (extension) {
      case "js":
      case "jsx":
        language = "javascript";
        break;
      case "py":
        language = "python";
        break;
      case "java":
        language = "java";
        break;
      case "cpp":
      case "cc":
        language = "cpp";
        break;
      case "c":
        language = "c";
        break;
      default:
        setOutputVisible(true);
        setOutput(`Unsupported file type: .${extension}`);
        return;
    }

    setExecuting(true);
    setOutputVisible(true);
    setOutput("Executing code...\n");

    try {
      // Get the live collaborative content from Y.js document
      let codeToExecute = '';
      
      if (sessionId && selectedFile.path) {
        // Try to get live content from the collaboration service first
        const liveContent = codeCollaborationService.getContent(sessionId, selectedFile.path);
        if (liveContent && liveContent.trim()) {
          codeToExecute = liveContent;
          console.log('🚀 Using live collaborative content for execution:', {
            filePath: selectedFile.path,
            contentLength: liveContent.length,
            preview: liveContent.substring(0, 100) + '...'
          });
        } else {
          // Fallback to current content from store or file content
          codeToExecute = currentContent || selectedFile.content;
          console.log('🚀 Using fallback content for execution:', {
            source: currentContent ? 'currentContent (from store)' : 'selectedFile.content',
            filePath: selectedFile.path,
            contentLength: codeToExecute?.length || 0
          });
        }
      } else {
        // Non-collaborative mode
        codeToExecute = currentContent || selectedFile.content;
        console.log('🚀 Using non-collaborative content for execution:', {
          source: currentContent ? 'currentContent' : 'selectedFile.content',
          contentLength: codeToExecute?.length || 0
        });
      }

      if (!codeToExecute || !codeToExecute.trim()) {
        setOutput("No code to execute. The file appears to be empty.");
        return;
      }

      const result = await executeCode(language, codeToExecute);
      setOutput(result);
      toast.success("Code executed successfully");
    } catch (error) {
      const errorMessage = `Error executing code: ${error.message}`;
      setOutput(errorMessage);
      toast.error("Code execution failed");
      console.error("Code execution error:", error);
    } finally {
      setExecuting(false);
    }
  };

  // Handle content change from Monaco editor with debounced auto-save
  const saveTimeoutRef = useRef(null);
  
  const handleContentChange = useCallback(async (newContent) => {
    // Always update the store with the latest content (collaborative or local)
    setCurrentContent(newContent);
    console.log('📝 Content updated in CodeWorkspace:', {
      filePath: selectedFile?.path,
      contentLength: newContent?.length || 0,
      isEditable,
      source: isEditable ? 'user edit' : 'collaborative change'
    });
    
    // Auto-save functionality with debouncing - only for editable mode
    if (selectedFile && isEditable) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          // Import fileApiService dynamically to avoid circular imports
          const { fileApiService } = await import('@/services/file-manager/fileApi');
          await fileApiService.saveFileContent(selectedFile.path, sessionId, newContent);
          console.log('📝 Auto-saved file:', selectedFile.path);
        } catch (error) {
          console.error('❌ Failed to auto-save file:', error);
          console.error('❌ Auto-save error details:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });
          // Could add a toast notification here for user feedback
        }
      }, 500); // 0.5 second delay for testing
    }
  }, [selectedFile, sessionId, isEditable, setCurrentContent]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Get current file path for breadcrumb
  const getCurrentPath = () => {
    if (!selectedFile) return ["No file selected"];
    return selectedFile.path.split("/");
  };

  // Handle session validation errors
  if (!sessionId) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid session. Please check your URL and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top Navigation */}
      <TopNavBar 
        currentPath={getCurrentPath()} 
        onRunCode={handleRunCode}
        isExecuting={isExecuting}
        extraActions={
          !isEditable && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-md text-sm">
              👁️ View Only
            </div>
          )
        }
      />

      {/* Main Content */}
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* Editor Section */}
        <ResizablePanel id="editor-section" order={1} minSize={30}>
          <div className="h-full pt-2">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Monaco Code Editor */}
              <ResizablePanel id="code-editor" order={1} defaultSize={65} minSize={30}>
                <MonacoEditor
                  sessionId={sessionId}
                  filePath={selectedFile?.path}
                  onContentChange={handleContentChange} // Always pass handler to track collaborative changes
                  onFileDeleted={handleFileDeleted} // Handle file deletion events
                  readOnly={!isEditable}
                  className="h-full"
                />
              </ResizablePanel>

              {/* Resizable Handle */}
              <ResizableHandle />

              {/* Collaboration Panel */}
              <ResizablePanel id="collab-panel" order={2} defaultSize={35} minSize={20}>
                <CollaborationPanel 
                  sessionId={sessionId}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>

        {/* Output Panel (conditionally rendered) */}
        {isOutputVisible && (
          <>
            <ResizableHandle />
            <ResizablePanel id="output-panel" order={2} defaultSize={30} minSize={20}>
              <OutputPanel 
                output={output} 
                onClose={() => setOutputVisible(false)}
                isExecuting={isExecuting}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

CodeWorkspace.propTypes = {
  selectedFile: PropTypes.shape({
    path: PropTypes.string.isRequired,
    content: PropTypes.string,
    name: PropTypes.string
  }),
  onFileDeleted: PropTypes.func
};

export default CodeWorkspace;
