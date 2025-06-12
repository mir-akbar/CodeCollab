import { useSessionActions } from '../../hooks/useSessions';
import { useRealTimeSession } from '../../hooks/useRealTimeSession';
import { useFileManager } from '../../hooks/file-manager/useFileQueries';
import { useUser } from '../../contexts/UserContext';
import PropTypes from 'prop-types';

/**
 * Debug component for testing TanStack Query + Zustand implementation
 * This component provides a comprehensive testing interface for the capstone project
 */
export const TanStackDebugComponent = ({ sessionId }) => {
  const { userEmail } = useUser();
  
  // Test session management hooks
  const sessionActions = useSessionActions(userEmail);
  const realTimeSession = useRealTimeSession(sessionId, userEmail);
  const sessionFiles = useSessionFiles(sessionId);
  const fileManager = useFileManager(sessionId, userEmail);

  const testCreateSession = async () => {
    try {
      const result = await sessionActions.createSession.mutateAsync({
        name: 'TanStack Test Session',
        description: 'Testing TanStack Query + Zustand integration',
        creator: userEmail
      });
      console.log('✅ Create session test:', result);
    } catch (error) {
      console.error('❌ Create session test failed:', error);
    }
  };

  const testFileUpload = async () => {
    try {
      const mockFile = new File(['console.log("Hello TanStack!");'], 'test.js', {
        type: 'application/javascript'
      });
      
      const result = await fileManager.uploadFile(mockFile);
      console.log('✅ File upload test:', result);
    } catch (error) {
      console.error('❌ File upload test failed:', error);
    }
  };

  const testRealTimeConnection = () => {
    if (realTimeSession.isConnected) {
      console.log('✅ Real-time connection active');
      console.log('👥 Active users:', realTimeSession.activeUsers);
      console.log('📊 Connection status:', realTimeSession.connectionStatus);
    } else {
      console.log('⏳ Real-time connection establishing...');
    }
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg m-4" data-testid="debug-interface">
      <h2 className="text-2xl font-bold mb-4 text-blue-600">
        🧪 TanStack Query + Zustand Debug Panel
      </h2>
      
      {/* Session ID Display */}
      <div className="mb-4 p-3 bg-yellow-100 rounded-lg border border-yellow-300">
        <p className="text-sm text-gray-800">
          <strong className="text-gray-900">Current Session ID:</strong> 
          <span data-testid="current-session-id" className="font-mono ml-2 text-blue-700 bg-blue-100 px-2 py-1 rounded">
            {sessionId || 'No session active'}
          </span>
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            placeholder="Enter session ID to join..."
            data-testid="session-id-input"
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-gray-800 bg-white"
          />
          <button
            data-testid="join-session-btn"
            className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
          >
            Join Session
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Session Management Tests */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2 text-green-600">📋 Session Management</h3>
          <div className="space-y-2">
            <button
              onClick={testCreateSession}
              disabled={sessionActions.createSession.isPending}
              data-testid="create-session-btn"
              className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {sessionActions.createSession.isPending ? 'Creating...' : 'Test Create Session'}
            </button>
            
            <div className="text-sm text-gray-700">
              <p>Create: {sessionActions.createSession.isPending ? '⏳' : '✅'}</p>
              <p>Delete: {sessionActions.deleteSession.isPending ? '⏳' : '✅'}</p>
              <p>Invite: {sessionActions.inviteUser.isPending ? '⏳' : '✅'}</p>
            </div>
          </div>
        </div>

        {/* Real-time Collaboration Tests */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2 text-purple-600">🔄 Real-time Collaboration</h3>
          <div className="space-y-2">
            <button
              onClick={testRealTimeConnection}
              data-testid="test-realtime-btn"
              className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Test Real-time Connection
            </button>
            
            <div className="text-sm text-gray-700">
              <p>Status: <span className={realTimeSession.isConnected ? 'text-green-600' : 'text-red-600'}>
                {realTimeSession.connectionStatus}
              </span></p>
              <p>Active Users: <span data-testid="user-count" className="font-semibold text-blue-600">{realTimeSession.activeUsers.length}</span></p>
              <p>YJS Ready: {realTimeSession.ydoc ? '✅' : '❌'}</p>
            </div>
          </div>
        </div>

        {/* File Management Tests */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2 text-orange-600">📁 File Management</h3>
          <div className="space-y-2">
            <button
              onClick={testFileUpload}
              disabled={fileManager.isUploading}
              data-testid="test-file-upload-btn"
              className="w-full px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {fileManager.isUploading ? 'Uploading...' : 'Test File Upload'}
            </button>
            
            <div className="text-sm text-gray-700">
              <p>Upload: {fileManager.isUploading ? '⏳' : '✅'}</p>
              <p>Delete: {fileManager.isDeleting ? '⏳' : '✅'}</p>
              <p>Files Loaded: <span data-testid="file-list" className="font-semibold text-blue-600">{sessionFiles.data?.length || 0}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Session Data Display for Testing */}
      <div className="mt-4 p-3 bg-white rounded-lg shadow">
        <h4 className="font-semibold mb-2 text-gray-800">Session Data</h4>
        <div data-testid="session-data" className="text-sm font-mono bg-gray-800 text-green-400 p-3 rounded border">
          {JSON.stringify({
            sessionId,
            connected: realTimeSession.isConnected,
            userCount: realTimeSession.activeUsers.length,
            filesCount: sessionFiles.data?.length || 0
          }, null, 2)}
        </div>
      </div>

      {/* TanStack Query DevTools Status */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-2 text-blue-600">🔧 TanStack Query Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-800">Session Loading</p>
            <p className={realTimeSession.isLoading ? 'text-yellow-600' : 'text-green-600'}>
              {realTimeSession.isLoading ? 'Loading...' : 'Ready'}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-800">Files Loading</p>
            <p className={sessionFiles.isLoading ? 'text-yellow-600' : 'text-green-600'}>
              {sessionFiles.isLoading ? 'Loading...' : 'Ready'}
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-800">Cache Status</p>
            <p className="text-green-600">Active</p>
          </div>
          <div>
            <p className="font-medium text-gray-800">Optimistic Updates</p>
            <p className="text-green-600">Enabled</p>
          </div>
        </div>
      </div>

      {/* Implementation Summary */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-800">🎯 Implementation Summary</h3>
        <ul className="text-sm space-y-1 text-blue-700">
          <li>✅ TanStack Query provider configured with 5min stale time</li>
          <li>✅ Session management hooks with optimistic updates</li>
          <li>✅ Real-time YJS integration with Socket.IO provider</li>
          <li>✅ File management with intelligent caching</li>
          <li>✅ Participant management (add, remove, promote)</li>
          <li>✅ Error handling and retry logic</li>
          <li>✅ Development devtools enabled</li>
        </ul>
      </div>
    </div>
  );
};

TanStackDebugComponent.propTypes = {
  sessionId: PropTypes.string.isRequired
};

export default TanStackDebugComponent;
