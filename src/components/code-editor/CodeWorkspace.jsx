/**
 * Modern Code Workspace Component
 * Replaces the legacy CodeEditor with modular architecture
 */

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useSidebar } from "@/components/ui/sidebar";
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

export function CodeWorkspace({ selectedFile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar, open } = useSidebar();
  
  // URL parameters
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get("session");
  const encryptedAccess = searchParams.get("access");
  
  // State
  const [activeTab, setActiveTab] = useState("chat");
  const [output, setOutput] = useState("");
  const [isOutputVisible, setIsOutputVisible] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentContent, setCurrentContent] = useState("");

  // Hooks
  const { executeCode } = useCodeExecution();

  // Decrypt access permissions
  useEffect(() => {
    if (encryptedAccess) {
      try {
        console.log('CodeWorkspace: Attempting to decrypt access token:', encryptedAccess);
        const access = decryptSessionAccess(encryptedAccess);
        console.log('CodeWorkspace: Decrypted access:', access);
        setIsEditable(access === "edit");
      } catch (error) {
        console.error("Error decrypting access:", error);
        toast.error("Invalid session access token");
        // Don't navigate away immediately, let the user see the workspace
        // Just set read-only mode
        setIsEditable(false);
      }
    } else {
      // No access token provided, default to read-only
      console.log('CodeWorkspace: No access token provided, defaulting to read-only');
      setIsEditable(false);
    }
  }, [encryptedAccess, navigate]);

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
      setIsOutputVisible(true);
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
        setIsOutputVisible(true);
        setOutput(`Unsupported file type: .${extension}`);
        return;
    }

    setIsExecuting(true);
    setIsOutputVisible(true);
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
      setIsExecuting(false);
    }
  };

  // Handle content change from Monaco editor
  const handleContentChange = (newContent) => {
    setCurrentContent(newContent);
  };

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
        toggleSidebar={toggleSidebar} 
        open={open} 
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
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab}
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
                onClose={() => setIsOutputVisible(false)}
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
