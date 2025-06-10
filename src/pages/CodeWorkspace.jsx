import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CodeEditor from '@/components/CodeEditor';
import { FileManager } from '@/components/file-manager/FileManager';
import { SidebarProvider, SidebarInset, Sidebar } from "@/components/ui/sidebar";

export default function Page() {
  const location = useLocation();
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const session = searchParams.get("session");
    setSessionId(session);
  }, [location.search]);

  return (
    <SidebarProvider className="h-screen w-screen flex bg-[#1e1e1e]">
      <Sidebar className="border-r border-[#444]">
        <FileManager sessionId={sessionId} />
      </Sidebar>
      <SidebarInset className="flex-1">
        <CodeEditor />
      </SidebarInset>
    </SidebarProvider>
  );
}