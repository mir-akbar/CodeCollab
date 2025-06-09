/**
 * Session Debug Panel
 * 
 * Development tool for debugging session state and operations.
 * Only available in development mode.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bug, 
  Eye, 
  RefreshCw, 
  Database, 
  Network,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useSessions } from '@/hooks/useSessions';
import PropTypes from 'prop-types';

export const SessionDebugPanel = ({ userEmail, isVisible = false, onToggle }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: sessions = [], isLoading, error, refetch } = useSessions();

  if (!isVisible) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white border-red-600"
      >
        <Bug className="h-4 w-4 mr-2" />
        Debug
      </Button>
    );
  }

  const debugTabs = [
    { id: 'overview', label: 'Overview', icon: <Eye className="h-4 w-4" /> },
    { id: 'sessions', label: 'Sessions', icon: <Database className="h-4 w-4" /> },
    { id: 'network', label: 'Network', icon: <Network className="h-4 w-4" /> }
  ];

  const getHealthStatus = () => {
    if (error) return { status: 'error', color: 'text-red-500', icon: <XCircle className="h-4 w-4" /> };
    if (isLoading) return { status: 'loading', color: 'text-yellow-500', icon: <RefreshCw className="h-4 w-4 animate-spin" /> };
    return { status: 'healthy', color: 'text-green-500', icon: <CheckCircle className="h-4 w-4" /> };
  };

  const health = getHealthStatus();

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 z-50 bg-gray-900 border-gray-700 text-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Session Debug Panel
          </div>
          <Button
            onClick={onToggle}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Health Status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">System Health:</span>
          <div className={`flex items-center gap-1 ${health.color}`}>
            {health.icon}
            <span className="text-xs capitalize">{health.status}</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-800 p-2 rounded">
            <div className="text-gray-400">Total Sessions</div>
            <div className="font-mono">{sessions.length}</div>
          </div>
          <div className="bg-gray-800 p-2 rounded">
            <div className="text-gray-400">User Email</div>
            <div className="font-mono truncate">{userEmail}</div>
          </div>
        </div>

        {/* Debug Tabs */}
        <div className="flex gap-1">
          {debugTabs.map(tab => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              className="flex-1 text-xs"
            >
              {tab.icon}
              <span className="ml-1">{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="max-h-32 overflow-y-auto text-xs">
          {activeTab === 'overview' && (
            <div className="space-y-2">
              <div className="text-gray-400">Component Status:</div>
              <div className="space-y-1">
                <Badge variant="outline" className="text-xs">SessionManager: Active</Badge>
                <Badge variant="outline" className="text-xs">TanStack Query: Connected</Badge>
                <Badge variant="outline" className="text-xs">Context: Initialized</Badge>
              </div>
            </div>
          )}
          
          {activeTab === 'sessions' && (
            <div className="space-y-1">
              {sessions.map((session, index) => (
                <div key={session.id || index} className="bg-gray-800 p-1 rounded">
                  <div className="font-mono">{session.name || 'Untitled'}</div>
                  <div className="text-gray-400">ID: {session.id}</div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'network' && (
            <div className="space-y-1">
              <div className="text-gray-400">Last Request:</div>
              <div className="font-mono">GET /api/sessions</div>
              <div className="text-gray-400">Status: {error ? 'Error' : 'Success'}</div>
              {error && (
                <div className="text-red-400 text-xs">{error.message}</div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button
            onClick={() => console.log('Sessions data:', sessions)}
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
          >
            Log Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

SessionDebugPanel.propTypes = {
  userEmail: PropTypes.string,
  isVisible: PropTypes.bool,
  onToggle: PropTypes.func.isRequired
};
