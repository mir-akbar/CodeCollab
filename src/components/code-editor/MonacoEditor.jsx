/**
 * Monaco Code Editor Component
 * Modern, modular Monaco editor with Y-WebSocket collaboration
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Editor } from "@monaco-editor/react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCodeCollaboration } from "@/hooks/code-editor/useCodeCollaboration";
import { useFileContent } from "@/hooks/file-manager/useFileQueries";
import { trackFileLoading } from "@/utils/performanceMonitor";
import "../../styles/yjs-cursors.css";

export function MonacoEditor({ 
  sessionId, 
  filePath, 
  onContentChange, 
  readOnly = false,
  className = "",
  height = "100%" 
}) {
  const editorRef = useRef(null);
  const bindingRef = useRef(null);
  const [currentFilePath, setCurrentFilePath] = useState(null);
  const [hasContentSet, setHasContentSet] = useState(false);

  // Memoize collaboration hook to prevent unnecessary re-initializations
  const collaborationParams = useMemo(() => ({ sessionId, filePath }), [sessionId, filePath]);
  
  // Use collaboration hook with memoized params
  const {
    isConnected,
    isCollaborationReady,
    error: collabError,
    createBinding,
    initializeContent,
    getContent,
    userCount
  } = useCodeCollaboration(collaborationParams.sessionId, collaborationParams.filePath);

  // Fetch file content directly - no complex caching
  const {
    data: fileContent,
    isLoading: contentLoading,
    error: contentError,
    isSuccess: contentLoaded
  } = useFileContent(sessionId, filePath);

  // Initialize content immediately when editor and data are ready - don't wait for collaboration
  useEffect(() => {
    console.log(`🔄 [MONACO EDITOR] Content initialization check for ${filePath}:`, {
      hasEditor: !!editorRef.current,
      contentLoaded,
      hasContentSet,
      filePathMatches: filePath !== currentFilePath,
      hasFileContent: fileContent !== undefined,
      timestamp: new Date().toISOString()
    });

    // Skip if already handled in handleEditorMount or conditions not met
    if (!editorRef.current || !contentLoaded || hasContentSet || !filePath || filePath === currentFilePath) {
      return;
    }

    console.log(`🚀 [MONACO EDITOR] Starting content initialization for: ${filePath} (no collaboration wait)`);

    // Initialize content immediately with file data - don't wait for collaboration
    const editor = editorRef.current;
    if (fileContent !== undefined) {
      try {
        console.log(`📝 [MONACO EDITOR] Setting initial content for: ${filePath} (Length: ${fileContent.length})`);
        trackFileLoading.editorMount(filePath);
        
        const model = editor.getModel();
        if (model) {
          // Check if the model already has content to prevent duplication
          const currentModelContent = model.getValue();
          if (currentModelContent.length === 0 || currentModelContent !== fileContent) {
            model.setValue(fileContent);
            console.log(`✅ [MONACO EDITOR] Content set in Monaco Editor for: ${filePath}`);
          } else {
            console.log(`📄 [MONACO EDITOR] Content already set in Monaco Editor for: ${filePath}`);
          }
          setHasContentSet(true);
          trackFileLoading.contentSet(filePath);
        }
      } catch (error) {
        console.error(`❌ [MONACO EDITOR] Error setting editor content:`, error);
      }
    }
  }, [contentLoaded, fileContent, filePath, currentFilePath, hasContentSet]);

  // Create Monaco binding when editor is ready
  const handleEditorMount = useCallback((editor) => {
    console.log(`🎯 [MONACO EDITOR] Editor mounted for: ${filePath}`);
    editorRef.current = editor;

    // Initialize content immediately if we have it - since editor remounts, we always need to set content
    if (fileContent !== undefined && contentLoaded && filePath) {
      try {
        console.log(`📝 [MONACO EDITOR] Setting content on editor mount for: ${filePath} (Length: ${fileContent.length})`);
        trackFileLoading.editorMount(filePath);
        
        const model = editor.getModel();
        if (model) {
          // Check if content is already set to prevent duplication
          const currentModelContent = model.getValue();
          if (currentModelContent.length === 0) {
            model.setValue(fileContent);
            console.log(`✅ [MONACO EDITOR] Content set on editor mount for: ${filePath}`);
          } else {
            console.log(`📄 [MONACO EDITOR] Content already exists on editor mount for: ${filePath} (${currentModelContent.length} chars)`);
          }
          setHasContentSet(true);
          trackFileLoading.contentSet(filePath);
        }
      } catch (error) {
        console.error(`❌ [MONACO EDITOR] Error setting content on mount:`, error);
      }
    }

    // Set up collaboration binding immediately after editor mount if ready
    if (sessionId && filePath && isConnected) {
      try {
        console.log(`🔗 [MONACO EDITOR] Setting up collaboration binding on mount for: ${filePath}`);
        bindingRef.current = createBinding(editor, onContentChange);
        
        // Initialize YJS content if we have file content and Y.js document is empty
        if (fileContent && fileContent.trim()) {
          setTimeout(() => {
            try {
              const currentContent = getContent();
              if (currentContent.length === 0) {
                console.log('📝 Initializing YJS content on mount for:', filePath);
                const initialized = initializeContent(fileContent);
                if (!initialized) {
                  console.log('⚠️  Content initialization skipped (document not empty or race condition):', filePath);
                }
              } else {
                console.log(`📄 YJS document already has content (${currentContent.length} chars), skipping initialization:`, filePath);
              }
            } catch (error) {
              console.warn('Error initializing YJS content on mount:', error);
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error creating collaboration binding on mount:', error);
      }
    }
  }, [sessionId, filePath, fileContent, contentLoaded, isConnected, createBinding, onContentChange, getContent, initializeContent]);

  // Setup collaboration binding as fallback if not set up during mount
  useEffect(() => {
    if (editorRef.current && isConnected && isCollaborationReady && !bindingRef.current && filePath && hasContentSet) {
      try {
        console.log('🔗 Setting up fallback Monaco collaboration binding for:', filePath);
        bindingRef.current = createBinding(editorRef.current, onContentChange);
        
        // Initialize YJS content if needed
        if (fileContent && fileContent.trim()) {
          setTimeout(() => {
            try {
              const currentContent = getContent();
              if (currentContent.length === 0) {
                console.log('📝 Initializing YJS content (fallback) for:', filePath);
                const initialized = initializeContent(fileContent);
                if (!initialized) {
                  console.log('⚠️  Content initialization skipped (document not empty or race condition):', filePath);
                }
              } else {
                console.log(`📄 YJS document already has content (${currentContent.length} chars), skipping fallback initialization:`, filePath);
              }
            } catch (error) {
              console.warn('Error initializing YJS content (fallback):', error);
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error creating fallback collaboration binding:', error);
      }
    }
  }, [isConnected, isCollaborationReady, hasContentSet, createBinding, onContentChange, filePath, fileContent, getContent, initializeContent]);

  // Cleanup on unmount or file change
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        try {
          bindingRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying Monaco binding:', error);
        }
        bindingRef.current = null;
      }
    };
  }, []);

  // Reset state when file changes (editor will remount due to key prop)
  useEffect(() => {
    if (filePath && filePath !== currentFilePath) {
      console.log(`📁 [MONACO EDITOR] File path changed from ${currentFilePath} to ${filePath}`);
      
      // Reset content state immediately for new file
      setHasContentSet(false);
      
      // Note: bindingRef cleanup happens automatically due to editor remount
      bindingRef.current = null;
      
      // Update currentFilePath 
      setCurrentFilePath(filePath);
      console.log(`🔄 [MONACO EDITOR] State reset for new file: ${filePath}`);
    }
  }, [filePath, currentFilePath]);

  // Get language from file extension
  const getLanguageFromFile = useCallback((filePath) => {
    if (!filePath) return "javascript";
    const extension = filePath.split('.').pop()?.toLowerCase();
    const languageMap = {
      js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
      html: "html", css: "css", json: "json", py: "python", java: "java",
      c: "c", cpp: "cpp", cs: "csharp", go: "go", php: "php", rb: "ruby",
      rs: "rust", swift: "swift", md: "markdown", txt: "plaintext"
    };
    return languageMap[extension] || "plaintext";
  }, []);

  // Show loading only while content is loading
  if (contentLoading) {
    return (
      <div className={`h-full border border-[#444] rounded-xl overflow-hidden ${className}`}>
        <div className="p-2 bg-gray-700 text-yellow-300 text-sm">
          ⏳ Loading file...
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#1e1e1e] text-gray-400 p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-2"></div>
            <p>Loading file content...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle errors
  if (collabError || contentError) {
    return (
      <div className={`h-full border border-[#444] rounded-xl overflow-hidden ${className}`}>
        <div className="p-2 bg-red-700 text-red-100 text-sm">
          ❌ Connection Error
        </div>
        <div className="flex-1 p-4 bg-[#1e1e1e]">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {collabError?.message || contentError?.message || 'Failed to load editor'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Handle no file selected
  if (!filePath) {
    return (
      <div className={`h-full border border-[#444] rounded-xl overflow-hidden ${className}`}>
        <div className="p-2 bg-gray-700 text-yellow-300 text-sm">
          No file selected
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#1e1e1e] text-gray-400 p-6 text-center">
          <div>
            <h3 className="text-xl mb-3">No file is currently open</h3>
            <p>Please select a file from the sidebar to start editing.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render the editor
  return (
    <div className={`h-full border border-[#444] rounded-xl overflow-hidden ${className}`}>
      {/* Status bar */}
      <div className="p-2 bg-gray-700 text-yellow-300 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
          {isConnected ? '🔗 Real-time collaboration active' : '⏳ Connecting...'}
          {!isCollaborationReady && <span className="text-yellow-300 text-xs ml-2">⏳ Preparing...</span>}
        </div>
        {userCount > 0 && (
          <div className="text-xs text-gray-300">
            {userCount} user{userCount !== 1 ? 's' : ''} online
          </div>
        )}
      </div>

      {/* Monaco Editor */}
      <Editor
        key={filePath} // Force remount when file changes to ensure clean state
        height={height}
        language={getLanguageFromFile(filePath)}
        theme="vs-dark"
        onMount={handleEditorMount}
        options={{
          readOnly,
          fontSize: 14,
          minimap: { enabled: false },
          automaticLayout: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 0, bottom: 40 },
          // Collaboration-friendly options
          suggest: {
            snippetsPreventQuickSuggestions: false,
          },
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true
          }
        }}
      />
    </div>
  );
}

MonacoEditor.propTypes = {
  sessionId: PropTypes.string.isRequired,
  filePath: PropTypes.string,
  onContentChange: PropTypes.func,
  readOnly: PropTypes.bool,
  className: PropTypes.string,
  height: PropTypes.string
};

export default MonacoEditor;
