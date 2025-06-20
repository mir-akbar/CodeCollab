/**
 * Monaco Code Editor Component
 * Modern, modular Monaco editor with Y-WebSocket collaboration
 */

import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Editor } from "@monaco-editor/react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCodeCollaboration } from "@/hooks/code-editor/useCodeCollaboration";
import { useFileContent } from "@/hooks/file-manager/useFileQueries";
import { useEditorStore } from '@/stores';
import { trackFileLoading } from "@/utils/performanceMonitor";
import "../../styles/yjs-cursors.css";

export function MonacoEditor({ 
  sessionId, 
  filePath, 
  onContentChange, 
  readOnly = false,
  className = ""
}) {
  const editorRef = useRef(null);
  const bindingRef = useRef(null);
  const cursorListenerRef = useRef(null);
  
  // State to track cursor position
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  
  // Zustand store for editor state
  const { 
    currentFilePath, 
    hasContentSet, 
    setCurrentFile, 
    setContentSet
  } = useEditorStore();

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

  // REMOVED: Duplicate content initialization useEffect to prevent race conditions
  // Content initialization is now handled ONLY in handleEditorMount to prevent duplication
  // This eliminates the race condition where content could be set twice

  // Create Monaco binding when editor is ready - SINGLE POINT OF CONTENT INITIALIZATION
  const handleEditorMount = useCallback((editor) => {
    console.log(`🎯 [MONACO EDITOR] Editor mounted for: ${filePath}`);
    editorRef.current = editor;

    // Set up cursor position tracking
    const updateCursorPosition = () => {
      const position = editor.getPosition();
      if (position) {
        setCursorPosition({ lineNumber: position.lineNumber, column: position.column });
      }
    };

    // Listen for cursor position changes
    cursorListenerRef.current = editor.onDidChangeCursorPosition(updateCursorPosition);
    
    // Set initial cursor position
    updateCursorPosition();

    // CRITICAL FIX: Initialize content ONLY here to prevent duplication
    // This is the SINGLE point of content initialization to eliminate race conditions
    // Initialize content for collaboration
    if (fileContent !== undefined && contentLoaded && filePath) {
      try {
        console.log(`📝 [MONACO EDITOR] SINGLE-POINT content initialization for: ${filePath} (Length: ${fileContent.length})`);
        trackFileLoading.editorMount(filePath);
        
        // For collaboration: Only initialize YJS document, never set Monaco content directly
        if (sessionId && filePath) {
          console.log(`🔗 [MONACO EDITOR] Collaboration mode: delegating content to YJS for: ${filePath}`);
          
          // Always create binding and initialize content, regardless of connection state
          // The binding will sync once connection is ready
          bindingRef.current = createBinding(editor, onContentChange);
          
          // Initialize YJS content immediately (this will sync to Monaco via binding)
          const initializeContentAsync = async () => {
            const initialized = await initializeContent(fileContent);
            
            if (initialized) {
              console.log(`✅ [MONACO EDITOR] YJS content initialized for: ${filePath}`);
            } else {
              console.log(`📄 [MONACO EDITOR] YJS content already exists for: ${filePath}`);
              // Check if content is already there and force sync if needed
              const currentContent = getContent();
              if (currentContent.length > 0) {
                const modelContent = editor.getModel()?.getValue() || '';
                if (modelContent.length === 0) {
                  console.log(`🔄 [MONACO EDITOR] Manually syncing YJS content to Monaco for: ${filePath}`);
                  editor.getModel()?.setValue(currentContent);
                }
              }
            }
          };
          
          initializeContentAsync();
          setContentSet(true);
        } else {
          // Non-collaboration mode: set Monaco content directly
          const model = editor.getModel();
          if (model) {
            model.setValue(fileContent);
            console.log(`✅ [MONACO EDITOR] Direct content set for: ${filePath}`);
            setContentSet(true);
          }
        }
        
        trackFileLoading.contentSet(filePath);
      } catch (error) {
        console.error(`❌ [MONACO EDITOR] Error setting content on mount:`, error);
      }
    } else {
      console.log(`⏳ [MONACO EDITOR] Content not ready yet for: ${filePath}`, {
        hasFileContent: fileContent !== undefined,
        contentLoaded,
        hasFilePath: !!filePath
      });
    }
  }, [sessionId, filePath, fileContent, contentLoaded, createBinding, onContentChange, initializeContent, getContent, setContentSet]);

  // Setup collaboration binding as fallback if not set up during mount
  useEffect(() => {
    if (editorRef.current && isConnected && isCollaborationReady && !bindingRef.current && filePath && hasContentSet) {
      try {
        console.log('🔗 Setting up fallback Monaco collaboration binding for:', filePath);
        bindingRef.current = createBinding(editorRef.current, onContentChange);
        
        // Initialize YJS content if needed
        if (fileContent && fileContent.trim()) {
          setTimeout(async () => {
            try {
              const currentContent = getContent();
              if (currentContent.length === 0) {
                console.log('📝 Initializing YJS content (fallback) for:', filePath);
                const initialized = await initializeContent(fileContent);
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
      
      if (cursorListenerRef.current) {
        try {
          cursorListenerRef.current.dispose();
        } catch (error) {
          console.warn('Error disposing cursor listener:', error);
        }
        cursorListenerRef.current = null;
      }
    };
  }, []);

  // Reset state when file changes (editor will remount due to key prop)
  useEffect(() => {
    if (filePath && filePath !== currentFilePath) {
      console.log(`📁 [MONACO EDITOR] File path changed from ${currentFilePath} to ${filePath}`);
      
      // Reset content state immediately for new file
      setContentSet(false);
      
      // Reset cursor position
      setCursorPosition({ lineNumber: 1, column: 1 });
      
      // Note: bindingRef cleanup happens automatically due to editor remount
      bindingRef.current = null;
      cursorListenerRef.current = null;
      
      // Update currentFilePath 
      setCurrentFile(filePath);
      console.log(`🔄 [MONACO EDITOR] State reset for new file: ${filePath}`);
    }
  }, [filePath, currentFilePath, setContentSet, setCurrentFile]);

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

  // Bottom status bar component
  const BottomStatusBar = ({ lineNumber, column, language, filePath: currentFilePath }) => (
    <div className="px-3 py-1 bg-gray-700 border-t border-[#444] text-gray-300 text-xs flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span>Ln {lineNumber}, Col {column}</span>
        {language && <span className="capitalize text-yellow-300">{language}</span>}
      </div>
      {currentFilePath && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{currentFilePath.split('/').pop()}</span>
        </div>
      )}
    </div>
  );

  // PropTypes for BottomStatusBar
  BottomStatusBar.propTypes = {
    lineNumber: PropTypes.number.isRequired,
    column: PropTypes.number.isRequired,
    language: PropTypes.string,
    filePath: PropTypes.string
  };

  // Show loading only while content is loading
  if (contentLoading) {
    return (
      <div className={`h-full border border-[#444] rounded-xl overflow-hidden flex flex-col ${className}`}>
        <div className="p-2 bg-gray-700 text-yellow-300 text-sm">
          ⏳ Loading file...
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#1e1e1e] text-gray-400 p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-2"></div>
            <p>Loading file content...</p>
          </div>
        </div>
        {/* Bottom status bar for loading state */}
        <BottomStatusBar 
          lineNumber={1}
          column={1}
          language={getLanguageFromFile(filePath)}
          filePath={filePath}
        />
      </div>
    );
  }

  // Handle errors
  if (collabError || contentError) {
    return (
      <div className={`h-full border border-[#444] rounded-xl overflow-hidden flex flex-col ${className}`}>
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
        {/* Bottom status bar for error state */}
        <BottomStatusBar 
          lineNumber={1}
          column={1}
          language={filePath ? getLanguageFromFile(filePath) : 'plaintext'}
          filePath={filePath}
        />
      </div>
    );
  }

  // Handle no file selected
  if (!filePath) {
    return (
      <div className={`h-full border border-[#444] rounded-xl overflow-hidden flex flex-col ${className}`}>
        <div className="p-2 bg-gray-700 text-yellow-300 text-sm">
          No file selected
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#1e1e1e] text-gray-400 p-6">
          <div className="text-center">
            <h3 className="text-xl mb-3">No file is currently open</h3>
            <p>Please select a file from the sidebar to start editing.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render the editor
  return (
    <div className={`h-full border border-[#444] rounded-xl overflow-hidden flex flex-col ${className}`}>
      {/* Status bar */}
      <div className="p-2 bg-gray-700 text-yellow-300 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
          {isConnected ? '🔗 Real-time collaboration active' : '⏳ Connecting...'}
          {!isCollaborationReady && <span className="text-yellow-300 text-xs ml-2">⏳ Preparing...</span>}
        </div>
        {userCount > 0 && (
          <div className="text-xs text-gray-300" title={`${userCount} user${userCount !== 1 ? 's' : ''} viewing this file`}>
            {userCount} editing
          </div>
        )}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 flex flex-col">
        <Editor
          key={filePath} // Force remount when file changes to ensure clean state
          height="100%"
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
        
        {/* Bottom status bar */}
        <BottomStatusBar 
          lineNumber={cursorPosition.lineNumber}
          column={cursorPosition.column}
          language={getLanguageFromFile(filePath)}
          filePath={filePath}
        />
      </div>
    </div>
  );
}

MonacoEditor.propTypes = {
  sessionId: PropTypes.string.isRequired,
  filePath: PropTypes.string,
  onContentChange: PropTypes.func,
  readOnly: PropTypes.bool,
  className: PropTypes.string
};

export default MonacoEditor;
