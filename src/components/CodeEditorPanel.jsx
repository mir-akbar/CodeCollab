import { useState, useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import { io } from "socket.io-client";
import { API_URL } from "../common/Constant";

const socket = io(`${API_URL}`, { transports: ["websocket", "polling"] });

export function CodeEditorPanel({ content, onCodeChange, readOnly, sessionId, currentFile }) {
  const [code, setCode] = useState(content);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const email = localStorage.getItem("email") || "Anonymous";
  const editorRef = useRef(null);
  const idleTimerRef = useRef(null);
  const cursorPositionRef = useRef(null);
  const decorationsRef = useRef({});
  const monacoRef = useRef(null);

  useEffect(() => {
    setCode(content);
  }, [content]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    let session = searchParams.get("session");
    socket.emit("register-user", email);

    const handleUserUpdate = (userList) => {
      const uniqueUsers = [...new Set(
        userList
          .filter(user => user?.email)
          .map(user => user.email.split("@")[0])
      )];
      setUsers(uniqueUsers);
    };

    const handleCodeUpdate = (data) => {
      if (data?.author !== email && session === data.sessionId) {
        setCode(data.code);
      }
    };

    const handleEditingUser = (data) => {
      setEditingUser(data.user || null);
    };

    const sanitizeUserForClass = (user) => user.replace(/[^a-zA-Z0-9_-]/g, "_");

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

    const injectDynamicStyle = (user, color) => {
      const safeUser = sanitizeUserForClass(user);
      const className = `cursor-style-${safeUser}`;
      if (document.getElementById(className)) return;

      const style = document.createElement("style");
      style.id = className;
      style.innerHTML = `
        .cursor-${safeUser}::after {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          border-left: 2px solid ${color};
          animation: blink 1s step-start infinite;
        }
        .cursor-${safeUser}::before {
          content: "${user}";
          position: absolute;
          top: -2em;
          left: 0;
          background: ${color};
          color: white;
          font-size: 0.75em;
          padding: 1px 4px;
          border-radius: 4px;
          white-space: nowrap;
        }
        @keyframes blink {
          50% { border-color: transparent; }
        }
      `;
      document.head.appendChild(style);
    };

    const handleRemoteCursor = ({ user, position, sessionID }) => {
      // console.log(sessionID);
      if (user === email || !editorRef.current || !monacoRef.current) return;

      const safeUser = sanitizeUserForClass(user);
      const color = stringToColor(user);
      injectDynamicStyle(user, color);

      const Range = monacoRef.current.Range;
      if (!Range) return;

      const decoration = {
        range: new Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        options: {
          className: '',
          afterContentClassName: `cursor-${safeUser}`,
          stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      };

      decorationsRef.current[safeUser] = editorRef.current.deltaDecorations(
        decorationsRef.current[safeUser] || [],
        [decoration]
      );
    };

    socket.on("active-users", handleUserUpdate);
    socket.on("code-update", handleCodeUpdate);
    socket.on("editing-user", handleEditingUser);
    socket.on("remote-cursor", handleRemoteCursor);

    return () => {
      socket.off("active-users", handleUserUpdate);
      socket.off("code-update", handleCodeUpdate);
      socket.off("editing-user", handleEditingUser);
      socket.off("remote-cursor", handleRemoteCursor);
    };
  }, [email]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      const position = e.position;
      socket.emit("cursor-move", {
        user: email,
        position: position,
        sessionID: sessionId,
      });
    });
  };

  const handleEditorChange = (newValue) => {
    if (readOnly) return;

    if (editorRef.current) {
      const position = editorRef.current.getPosition();
      cursorPositionRef.current = position;

      socket.emit("cursor-move", {
        user: email,
        position: position,
        sessionId: sessionId,
      });
    }

    setCode(newValue);
    onCodeChange?.(newValue);

    socket.emit("editing-user", { user: email });

    if (currentFile) {
      const normalizedPath = currentFile.replace(/\\/g, "/");
      const fileParts = normalizedPath.split("/");
      const fileName = fileParts.pop();
      const fileDirectory = fileParts.join("/");

      socket.emit("code-change", {
        code: newValue,
        user: email,
        sessionId: sessionId,
        fileName: fileName,
        directory: fileDirectory
      });
    }

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      socket.emit("editing-user", { user: null });
      setEditingUser(null);
    }, 8000);
  };

  useEffect(() => {
    if (cursorPositionRef.current && editorRef.current) {
      editorRef.current.setPosition(cursorPositionRef.current);
    }
  }, [code]);

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
        {editingUser ? `✍️ ${editingUser} is editing...` : "No one is currently editing..."}
      </div>
      <Editor
        height="100%"
        language={getLanguageFromFile(currentFile)}
        theme="vs-dark"
        value={code}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        options={{
          readOnly,
          fontSize: 14,
          minimap: { enabled: false },
          automaticLayout: true,
        }}
      />
    </div>
  );
}
