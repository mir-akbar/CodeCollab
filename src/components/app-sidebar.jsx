import { useState, useEffect, useRef } from "react";
import { ChevronRight, File, Folder, Upload, Trash, RefreshCw } from "lucide-react";
import { io } from "socket.io-client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { API_URL } from "../common/Constant";
import { useUser } from "@/contexts/UserContext";

export function AppSidebar({ onFileSelect }) {
  const { userEmail } = useUser();
  const [files, setFiles] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastClickedFile, setLastClickedFile] = useState(null);
  const [lastClickTime, setLastClickTime] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    let session = searchParams.get("session");
    
    console.log(`🔍 Sidebar initializing for session: ${session}`);

    // Create socket connection for this session
    if (session) {
      socketRef.current = io(`${API_URL}`, {
        transports: ["websocket", "polling"],
        reconnection: true,
        query: { sessionId: session }
      });

      // Initial fetch of files
      fetchFilesBySession();

      // Listen for file upload events
      socketRef.current.on("fileUploaded", (updatedFiles) => {
        console.log(`📤 Socket fileUploaded event received:`, updatedFiles);
        if (session === updatedFiles.sessionID) {
          console.log(`✅ Session match - updating files for ${session}`);
          
          // For ZIP extraction, accumulate files instead of replacing
          if (updatedFiles.isZipExtraction) {
            setFiles(prevFiles => {
              const newFiles = [...prevFiles];
              updatedFiles.files.forEach(newFile => {
                // Only add if not already exists
                if (!newFiles.find(f => f.path === newFile.path)) {
                  newFiles.push(newFile);
                }
              });
              return newFiles;
            });
          } else {
            // For single file uploads, replace the entire array
            setFiles(updatedFiles.files || []);
          }
          
          setIsRefreshing(false); // Stop loading state
        } else {
          console.log(`❌ Session mismatch - ignoring event for ${updatedFiles.sessionID}`);
        }
      });

      socketRef.current.on("fileDeleted", ({ deletedFile }) => {
        console.log("🗑️ File deleted:", deletedFile);
        // Refresh files after deletion
        fetchFilesBySession();
      });

      socketRef.current.on("fileUpdated", ({ files }) => {
        console.log("📝 Files updated:", files);
        setFiles(files || []);
        setIsRefreshing(false); // Stop loading state
      });

      // Listen for any file system changes
      socketRef.current.on("filesChanged", async (data) => {
        console.log("📁 Files changed event received:", data);
        if (data.sessionId === session) {
          console.log(`🔄 Auto-refreshing due to file system change...`);
          await fetchFilesBySession();
        }
      });

      // ZIP-specific event handlers for better user feedback
      socketRef.current.on("zipUploadStarted", (data) => {
        if (data.sessionID === session) {
          console.log(`📦 ZIP upload started: ${data.fileName}`);
          setIsRefreshing(true);
        }
      });

      socketRef.current.on("zipProgress", (data) => {
        if (data.sessionID === session) {
          console.log(`📊 ZIP progress: ${data.message}`);
        }
      });

      socketRef.current.on("zipFileProcessed", (data) => {
        if (data.sessionID === session) {
          console.log(`✅ ZIP file processed: ${data.file.name} (${data.processedFiles}/${data.totalFiles})`);
        }
      });

      socketRef.current.on("zipExtractionComplete", (data) => {
        if (data.sessionID === session) {
          console.log(`🎉 ZIP extraction complete: ${data.totalFiles} files added`);
          // Final refresh to ensure all files are displayed
          fetchFilesBySession();
          setIsRefreshing(false);
        }
      });

      socketRef.current.on("sessionFilesUpdated", (data) => {
        if (data.sessionID === session) {
          console.log(`🔄 Session files updated: ${data.files.length} total files`);
          setFiles(data.files);
          setIsRefreshing(false);
        }
      });

      // Request current folder structure
      socketRef.current.emit("request-folder-structure");

      // Add socket connection listeners
      socketRef.current.on("connect", () => {
        console.log(`🔌 Sidebar socket connected for session ${session}`);
      });

      socketRef.current.on("disconnect", () => {
        console.log(`🔌 Sidebar socket disconnected for session ${session}`);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("fileUploaded");
        socketRef.current.off("fileDeleted");
        socketRef.current.off("fileUpdated");
        socketRef.current.off("filesChanged");
        socketRef.current.off("zipUploadStarted");
        socketRef.current.off("zipProgress");
        socketRef.current.off("zipFileProcessed");
        socketRef.current.off("zipExtractionComplete");
        socketRef.current.off("sessionFilesUpdated");
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array to run once on mount

  // Add a manual refresh function for debugging
  const refreshFiles = async () => {
    console.log("🔄 Manual refresh triggered");
    setIsRefreshing(true);
    try {
      await fetchFilesBySession();
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchFilesBySession = async () => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const session = searchParams.get("session");
      
      console.log(`🔄 Fetching file hierarchy for session: ${session}`);
      const response = await fetch(`${API_URL}/files/hierarchy?session=${session}`);
      if (!response.ok) throw new Error("Failed to fetch file hierarchy");
      const data = await response.json();
      console.log(`📁 Fetched file hierarchy with ${data.length} items:`, data);
      setFiles(data);
    } catch (error) {
      console.error("Error fetching file hierarchy:", error);
    }
  };

  const fetchFileContent = async (fileName, filePath) => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const session = searchParams.get("session");
      
      const response = await fetch(`${API_URL}/files/get-file?path=${encodeURIComponent(filePath)}&sessionId=${session}`);
      const fileContent = await response.text();
      if (response.status !== 404) {
        onFileSelect(fileName, fileContent, filePath);
      }
    } catch (error) {
      console.error("Failed to fetch file:", error);
    }
  };

  const handleFileClick = async (file) => {
    const currentTime = Date.now();
    
    // Prevent rapid successive clicks of the same file (debounce with 500ms)
    if (lastClickedFile === file.path && (currentTime - lastClickTime) < 500) {
      console.log(`📄 Ignoring rapid successive click on ${file.name}`);
      return;
    }
    
    console.log(`📂 Opening file: ${file.name} (${file.path})`);
    setLastClickedFile(file.path);
    setLastClickTime(currentTime);
    await fetchFileContent(file.name, file.path);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const searchParams = new URLSearchParams(location.search);
    const session = searchParams.get("session");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sessionID", session);
    formData.append("email", userEmail);

    try {
      console.log(`📤 Starting upload of ${file.name}...`);
      setIsRefreshing(true); // Show loading state during upload
      
      const response = await fetch(`${API_URL}/file-upload/file-upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Upload successful, received ${data.files?.length || 0} files`);
      
      // Update files immediately from response
      if (data.files) {
        setFiles(data.files);
        console.log(`📁 Updated sidebar with ${data.files.length} files`);
      }
      
      // Emit socket event for other clients
      if (socketRef.current) {
        socketRef.current.emit("fileUploaded", data);
        console.log(`📡 Emitted socket event for session ${session}`);
      }
      
      // Automatic refresh as fallback (in case socket doesn't work)
      setTimeout(async () => {
        console.log(`🔄 Auto-refreshing after upload (fallback)...`);
        await fetchFilesBySession();
        setIsRefreshing(false);
      }, 1500);
      
    } catch (error) {
      console.error("Upload failed:", error);
      setIsRefreshing(false);
      alert(`Upload failed: ${error.message}`);
      
      // Even if upload fails, try to refresh to get current state
      setTimeout(async () => {
        console.log(`🔄 Refreshing after upload error...`);
        await fetchFilesBySession();
      }, 500);
    }
    
    // Clear the file input so the same file can be uploaded again if needed
    event.target.value = '';
  };

  const handleFileDelete = async (file) => {
    // Confirm deletion
    const confirmDelete = window.confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`);
    if (!confirmDelete) {
      return;
    }

    try {
      const searchParams = new URLSearchParams(location.search);
      const session = searchParams.get("session");
      
      const response = await fetch(`${API_URL}/files/delete-file`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          path: file.path,
          sessionId: session
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`);
      }

      // Update local state by removing the deleted file
      setFiles(prevFiles => prevFiles.filter(f => f.path !== file.path));
      
      // Clear the last clicked file if the deleted file was the last one clicked
      if (lastClickedFile === file.path) {
        setLastClickedFile(null);
      }
      onFileSelect(null, "// File was deleted. Please select another file to edit.", null, { deleted: true, deletedFile: file });
      
      console.log(`✅ Successfully deleted file: ${file.name}`);
      
    } catch (error) {
      console.error("Delete failed:", error);
      alert(`Failed to delete file: ${error.message}`);
    }
  };

  const renderFiles = (fileList) => {
    return fileList.map((file, index) => {
      if (file.type === "folder") {
        return (
          <Collapsible key={index} className="w-full">
            <CollapsibleTrigger className="flex items-center w-full text-left hover:bg-[#2d2d2d] p-2">
              <ChevronRight className="w-4 h-4 mr-2" />
              <Folder className="text-gray-400 mr-2" />
              <span className="text-gray-300">{file.name}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-5">{renderFiles(file.children)}</CollapsibleContent>
          </Collapsible>
        );
      } else {
        return (
          <div key={index} className="flex justify-between items-center hover:bg-[#2d2d2d] p-2">
            <SidebarMenuButton className="flex-1" onClick={() => handleFileClick(file)}>
              <File className="text-gray-400 mr-2" />
              <span className="text-gray-300">{file.name}</span>
            </SidebarMenuButton>
            <button
              className="ml-2 p-1 text-red-500 hover:text-red-700"
              onClick={() => handleFileDelete(file)}
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        );
      }
    });
  };

  return (
    <Sidebar className="bg-[#1e1e1e] text-gray-300">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 flex items-center justify-between">
            Files
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshFiles}
                disabled={isRefreshing}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                title="Refresh files"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <label className="cursor-pointer flex items-center">
                <Upload className="w-5 h-5 mr-2 text-gray-400" />
                <input type="file" accept=".zip,.js,.java,.py" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isRefreshing ? (
                // Show skeleton loading while refreshing
                <div className="space-y-2 p-2">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4 bg-gray-600" />
                    <Skeleton className="h-4 w-24 bg-gray-600" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4 bg-gray-600" />
                    <Skeleton className="h-4 w-32 bg-gray-600" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4 bg-gray-600" />
                    <Skeleton className="h-4 w-20 bg-gray-600" />
                  </div>
                </div>
              ) : files.length > 0 ? (
                renderFiles(files)
              ) : (
                <p className="text-gray-500 text-sm p-2">No files uploaded</p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
