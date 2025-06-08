import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useLocation, useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";

import { useSidebar } from "@/components/ui/sidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { TopNavBar } from "./TopNavBar";
import { CodeEditorPanel } from "./CodeEditorPanel";
import { CollaborationPanel } from "./CollaborationPanel";
import { OutputPanel } from "./OutputPanel";
import { AppSidebar } from "./app-sidebar";
import axios from "axios";
import { API_URL } from "../common/Constant";

const SECRET_KEY = "f9a8b7c6d5e4f3a2b1c0d9e8f7g6h5i4j3k2l1m0n9o8p7q6";

function decryptData(cipherText) {
  try {
    if (!cipherText) return "";

    const decodedCipherText = decodeURIComponent(cipherText);

    const bytes = CryptoJS.AES.decrypt(decodedCipherText, SECRET_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) throw new Error("Decryption returned empty string");

    return decryptedText;
  } catch (error) {
    console.error("Decryption error:", error.message);
    return "";
  }
}

export default function CodeEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar, open } = useSidebar();
  const socketRef = useRef(null);

  const [sessionId, setSessionId] = useState("");
  const [currentPath, setCurrentPath] = useState([]);
  const [activeTab, setActiveTab] = useState("chat");
  const [output, setOutput] = useState("");
  const [isOutputVisible, setIsOutputVisible] = useState(false);
  const [selectedFileContent, setSelectedFileContent] = useState("// Please select a file to begin editing");
  const [currentFile, setCurrentFile] = useState(null);
  const [updatedCode, setUpdatedCode] = useState("");
  const [isEditable, setIsEditable] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    let session = searchParams.get("session");
    const encryptedAccess = searchParams.get("access");
    const access = decryptData(encryptedAccess);
    const sessionID = searchParams.get("session");

    const fetchUsers = async () => {
      try {
        const response = await axios.post(`${API_URL}/api/sessions/active-users`, {
          session_id: sessionID
        }, {
          withCredentials: true
        });
        console.log(response);
        setIsEditable(access === "edit");
      } catch (error) {
        console.error("Error fetching active users:", error);
      }
    };

    fetchUsers();
    setSessionId(session);

    // Create socket connection with proper configuration
    socketRef.current = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      query: { sessionId: session }
    });

    const handleCodeUpdate = (data) => {
      if(session === data.sessionId) {
        setSelectedFileContent(data.code);
        setUpdatedCode(data.code);
      }
    };

    const handleFileUpdate = ({ fileName, code, sessionId }) => {
      console.log(`📄 File updated: ${fileName}`);
      if(session === sessionId) {
        setSelectedFileContent(code);
        setUpdatedCode(code);
      }
    };

    socketRef.current.on("code-update", handleCodeUpdate);
    socketRef.current.on("file-update", handleFileUpdate);

    return () => {
      if (socketRef.current) {
        socketRef.current.off("code-update", handleCodeUpdate);
        socketRef.current.off("file-update", handleFileUpdate);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [location.search, navigate]);

  const handleRunCode = async () => {
    if (!currentFile) {
      setIsOutputVisible(true);
      setOutput("No file selected. Please select a file to run code.");
      return;
    }
    
    setIsOutputVisible(true);
    setOutput("Running code...\n");

    const code = updatedCode || selectedFileContent;
    const extension = currentFile?.split(".").pop();
    let language;

    if (extension === "js") language = "javascript";
    else if (extension === "py") language = "python";
    else if (extension === "java") language = "java";
    else {
      setOutput("Unsupported file type.");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/execute/run`, {
        language,
        code,
      }, {
        withCredentials: true
      });
      setOutput(response.data.output);
    } catch (error) {
      setOutput("Error executing code: " + error.message);
    }
  };

  const handleCodeChange = (newCode) => {
    if (!isEditable) {
        console.warn("🚫 Editing is disabled in view mode!");
        return;
    }

    // Get the text editor element
    const editor = document.querySelector(".code-editor-textarea");
    const cursorPosition = editor?.selectionStart || 0;

    setUpdatedCode(newCode);
    setSelectedFileContent(newCode);

    if (currentFile) {
        const normalizedPath = currentFile.replace(/\\/g, "/");
        const fileParts = normalizedPath.split("/");
        const fileName = fileParts.pop();
        const fileDirectory = fileParts.join("/");

        console.log("📂 Updating file:", fileDirectory, fileName);
        
        if (socketRef.current) {
          socketRef.current.emit("code-change", { 
              sessionId: sessionId,
              code: newCode, 
              user: "",
              filePath: currentFile, 
              fileName: fileName,
              directory: fileDirectory
          });
        }
    }

    setTimeout(() => {
        if (editor) {
            editor.setSelectionRange(cursorPosition, cursorPosition);
        }
    }, 0);
};


  const handleFileSelect = (fileName, content, filePath, metadata) => {
    // Handle file deletion case
    if (metadata?.deleted) {
      // Only clear the editor if the deleted file was currently open
      if (currentFile === metadata.deletedFile.path) {
        setCurrentFile(null);
        setCurrentPath(["File deleted"]);
        setSelectedFileContent("// The file you were editing has been deleted. Please select another file to continue editing.");
        setUpdatedCode("");
        console.log(`🗑️ Cleared editor because the open file was deleted: ${metadata.deletedFile.name}`);
      } else {
        console.log(`🗑️ File deleted but wasn't currently open: ${metadata.deletedFile.name}`);
      }
      return;
    }

    // Normal file selection
    setCurrentFile(filePath);
    setCurrentPath(filePath ? filePath.split("/") : ["No file selected"]);
    setSelectedFileContent(content);
    setUpdatedCode(content);

    if (filePath && socketRef.current) {
      const normalizedFilePath = filePath.replace(/\\/g, "/");
      socketRef.current.emit("file-change", { filePath: normalizedFilePath, content, sessionId: sessionId });
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <AppSidebar onFileSelect={handleFileSelect} />
      <div className="flex flex-col flex-1">
        <TopNavBar 
          toggleSidebar={toggleSidebar} 
          open={open} 
          currentPath={currentPath.length > 0 ? currentPath : ["No file selected"]} 
          onRunCode={handleRunCode} 
        />

        <ResizablePanelGroup direction="vertical" className="flex-1">
          <ResizablePanel id="editor-section" order={1} minSize={30}>
            <div className="h-full pt-2">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel id="code-editor" order={1} defaultSize={65} minSize={30}>
                <CodeEditorPanel 
                  onCodeChange={isEditable ? handleCodeChange : null}
                  content={selectedFileContent} 
                  readOnly={!isEditable}
                  sessionId={sessionId}
                  currentFile={currentFile}
                />
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel id="collab-panel" order={2} defaultSize={35} minSize={20}>
                  <CollaborationPanel activeTab={activeTab} setActiveTab={setActiveTab} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>
          {isOutputVisible && (
            <>
              <ResizableHandle />
              <ResizablePanel id="output-panel" order={2} defaultSize={30} minSize={20}>
                <OutputPanel output={output} onClose={() => setIsOutputVisible(false)} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
