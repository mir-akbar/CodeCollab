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
import { decryptSessionAccess } from "@/utils/sessionUtils";
import useEditorStore from "@/stores/editorStore";

export function CodeWorkspace({ selectedFile }) {
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
      // Use current content from Monaco editor or fallback to file content
      const codeToExecute = currentContent || selectedFile.content;
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
    setCurrentContent(newContent);
    
    // Auto-save functionality with debouncing - save 2 seconds after user stops typing
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
                  onContentChange={isEditable ? handleContentChange : null}
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
  })
};

export default CodeWorkspace;
