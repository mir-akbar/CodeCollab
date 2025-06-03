import { TanStackDebugComponent } from "@/components/debug/TanStackDebugComponent";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function DebugPage() {
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    // Get sessionId from URL params or use a default test session
    const urlSessionId = searchParams.get("sessionId");
    setSessionId(urlSessionId || "test-session-123");
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🧪 TanStack Query + Zustand Debug Interface
          </h1>
          <p className="text-gray-600">
            Comprehensive testing interface for Phase 5 validation of the CodeLab capstone project.
            This tool tests session management, real-time collaboration, and file management features.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <p><strong>Session ID:</strong> {sessionId}</p>
            <p><strong>Phase:</strong> 5 - Testing & Validation</p>
            <p><strong>Architecture:</strong> TanStack Query + YJS Real-time Integration</p>
          </div>
        </div>
        
        <TanStackDebugComponent sessionId={sessionId} />
        
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2 text-gray-800">🚀 Quick Start Instructions</h3>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. <strong>Test Session Management:</strong> Click &quot;Test Create Session&quot; to verify TanStack Query mutations</li>
            <li>2. <strong>Test Real-time Connection:</strong> Click &quot;Test Real-time Connection&quot; to verify YJS integration</li>
            <li>3. <strong>Test File Management:</strong> Click &quot;Test File Upload&quot; to verify file operations</li>
            <li>4. <strong>Monitor Status:</strong> Check the TanStack Query status indicators below</li>
            <li>5. <strong>View Console:</strong> Open browser DevTools to see detailed test results</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
