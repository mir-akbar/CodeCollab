// Updated CodeEditorPanel.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Editor } from "@monaco-editor/react";
import { io } from "socket.io-client";
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { SocketIOProvider } from './yjs/SocketIOProvider';
import { API_URL } from "../common/Constant";
import '../styles/yjs-cursors.css';

const socket = io(`${API_URL}`, { transports: ["websocket", "polling"] });

export function CodeEditorPanel({ content, onCodeChange, readOnly, sessionId, currentFile }) {
  const email = localStorage.getItem("email") || "Anonymous";
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const yjsDocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const [isYjsReady, setIsYjsReady] = useState(false);

  const setupYjsBinding = useCallback(() => {
    if (!yjsDocRef.current || !providerRef.current || !editorRef.current || !providerRef.current.awareness) return;

    const ytext = yjsDocRef.current.getText('monaco');
    
    // Create MonacoBinding with awareness for collaborative cursors
    const binding = new MonacoBinding(
      ytext,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      providerRef.current.awareness
    );
    bindingRef.current = binding;

    // Listen for changes to call the onCodeChange callback
    ytext.observe((event, transaction) => {
      if (transaction.local) {
        const newValue = ytext.toString();
        onCodeChange?.(newValue);
      }
    });

    // Set up cursor tracking
    editorRef.current.onDidChangeCursorPosition(() => {
      if (providerRef.current?.awareness) {
        const selection = editorRef.current.getSelection();
        providerRef.current.awareness.setLocalStateField('cursor', {
          anchor: {
            lineNumber: selection.startLineNumber,
            column: selection.startColumn
          },
          head: {
            lineNumber: selection.endLineNumber,
            column: selection.endColumn
          }
        });
      }
    });

    // Set up selection tracking
    editorRef.current.onDidChangeCursorSelection((e) => {
      if (providerRef.current?.awareness) {
        providerRef.current.awareness.setLocalStateField('cursor', {
          anchor: {
            lineNumber: e.selection.startLineNumber,
            column: e.selection.startColumn
          },
          head: {
            lineNumber: e.selection.endLineNumber,
            column: e.selection.endColumn
          }
        });
      }
    });

    console.log('✅ YJS MonacoBinding setup complete with awareness');
  }, [onCodeChange]);

  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = "#";
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += ("00" + value.toString(16)).slice(-2);
    }
    return color;
  };

  useEffect(() => {
    if (!sessionId || !currentFile) return;

    // Clean up previous YJS instances
    if (bindingRef.current) {
      try {
        bindingRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying previous Monaco binding:', error.message);
      }
      bindingRef.current = null;
    }
    if (providerRef.current) {
      try {
        providerRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying previous SocketIO provider:', error.message);
      }
      providerRef.current = null;
    }
    if (yjsDocRef.current) {
      try {
        yjsDocRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying previous YJS document:', error.message);
      }
      yjsDocRef.current = null;
    }

    // Reset state
    setIsYjsReady(false);

    // Initialize new YJS document for this file
    const doc = new Y.Doc();
    yjsDocRef.current = doc;

    // Create provider for this specific file
    const roomName = `${sessionId}-${currentFile}`;
    const provider = new SocketIOProvider(roomName, socket, doc);
    providerRef.current = provider;

    // Set up awareness (for cursors and user presence) 
    if (provider.awareness && provider.awareness.setLocalStateField) {
      try {
        // Set user information
        provider.awareness.setLocalStateField('user', {
          name: email,
          color: stringToColor(email),
          colorLight: stringToColor(email) + '33', // Add transparency
        });
        
        console.log('✅ Awareness initialized for user:', email);
      } catch (error) {
        console.error('Error setting awareness:', error);
      }
    }

    // Wait for sync before setting up binding
    const handleSynced = () => {
      console.log('🔄 YJS provider synced for:', currentFile);
      const ytext = yjsDocRef.current.getText('monaco');
      console.log(`📏 YJS document length after sync: ${ytext.length}`);
      
      setIsYjsReady(true);
      if (editorRef.current) {
        setupYjsBinding();
      }
    };

    // Always wait for the sync event
    provider.on('synced', handleSynced);

    return () => {
      console.log('🧹 Cleaning up YJS resources for:', currentFile);
      
      // Clean up in reverse order of creation
      if (bindingRef.current) {
        try {
          bindingRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying Monaco binding:', error.message);
        }
        bindingRef.current = null;
      }
      
      if (providerRef.current) {
        try {
          providerRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying SocketIO provider:', error.message);
        }
        providerRef.current = null;
      }
      
      if (yjsDocRef.current) {
        try {
          yjsDocRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying YJS document:', error.message);
        }
        yjsDocRef.current = null;
      }
      
      setIsYjsReady(false);
    };
  }, [sessionId, currentFile, email, setupYjsBinding]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Set up YJS binding if document is ready
    if (isYjsReady && yjsDocRef.current && providerRef.current) {
      setupYjsBinding();
    }
  };

  const getLanguageFromFile = (filePath) => {
    if (!filePath) return "javascript";
    const extension = filePath.split('.').pop().toLowerCase();
    const languageMap = {
      js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
      html: "html", css: "css", json: "json", py: "python", java: "java",
      c: "c", cpp: "cpp", cs: "csharp", go: "go", php: "php", rb: "ruby",
      rs: "rust", swift: "swift", md: "markdown", txt: "plaintext"
    };
    return languageMap[extension] || "plaintext";
  };

  if (!currentFile) {
    return (
      <div className="h-full border border-[#444] rounded-xl overflow-hidden flex flex-col">
        <div className="p-2 bg-gray-700 text-yellow-300 text-sm">
          No file selected
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#1e1e1e] text-gray-400 p-6 text-center">
          <div>
            <h3 className="text-xl mb-3">No file is currently open</h3>
            <p>Please select a file from the sidebar to start editing, or wait for an admin to upload files.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full border border-[#444] rounded-xl overflow-hidden">
      <div className="p-2 bg-gray-700 text-yellow-300 text-sm">
        {isYjsReady ? "🔗 YJS Real-time collaboration active" : "⏳ Connecting to collaboration..."}
      </div>
      <Editor
        height="100%"
        language={getLanguageFromFile(currentFile)}
        theme="vs-dark"
        onMount={handleEditorMount}
        options={{
          readOnly,
          fontSize: 14,
          minimap: { enabled: false },
          automaticLayout: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: true,
          // YJS-specific options
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 0, bottom: 40 },
        }}
      />
    </div>
  );
}

// ===============================================
// Updated app-sidebar.jsx integration
// ===============================================

// Add this method to your AppSidebar component to notify server about file access
const notifyFileAccess = async (sessionId, fileName, filePath) => {
  try {
    // Optional: Send file access notification to server
    // This can help the server pre-initialize YJS documents
    const response = await fetch(`${API_URL}/files/access-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        fileName,
        filePath
      })
    });
    
    if (response.ok) {
      console.log(`📧 Notified server about file access: ${fileName}`);
    }
  } catch (error) {
    console.warn('Failed to notify server about file access:', error);
  }
};

// Update your handleFileClick method in AppSidebar:
const handleFileClick = async (file) => {
  const currentTime = Date.now();
  
  // Prevent rapid successive clicks
  if (lastClickedFile === file.path && (currentTime - lastClickTime) < 500) {
    console.log(`📄 Ignoring rapid successive click on ${file.name}`);
    return;
  }
  
  console.log(`📂 Opening file: ${file.name} (${file.path})`);
  setLastClickedFile(file.path);
  setLastClickTime(currentTime);
  
  // Notify server about file access (optional)
  const searchParams = new URLSearchParams(location.search);
  const session = searchParams.get("session");
  await notifyFileAccess(session, file.name, file.path);
  
  // Fetch and display file content
  await fetchFileContent(file.name, file.path);
};