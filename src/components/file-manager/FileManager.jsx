/**
 * Simple File Manager Component
 * Basic file tree with upload functionality
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import { RefreshCw, Files, Upload as UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from './FileUpload';
import { FileTree } from './FileTree';
import { useFileManager } from '@/hooks/file-manager/useFileQueries';
import { useFileEvents } from '@/hooks/file-manager/useFileEvents';
import { cn } from '@/lib/utils';

export function FileManager({ sessionId, onFileSelect, onFileDeleted, selectedFilePath, userEmail, className }) {
  const { isRefreshing, refreshFiles, error } = useFileManager(sessionId);
  const { isConnected } = useFileEvents(sessionId);
  const [activeTab, setActiveTab] = useState('files');

  const handleRefresh = () => {
    refreshFiles();
  };

  return (
    <div className={cn('h-full flex flex-col bg-sidebar text-sidebar-foreground', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-2">
          <Files className="h-5 w-5" />
          <h2 className="font-semibold">Files</h2>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="files">
                <Files className="h-4 w-4 mr-2" />
                Browse
              </TabsTrigger>
              <TabsTrigger value="upload">
                <UploadIcon className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Files Tab */}
          <TabsContent value="files" className="flex-1 overflow-hidden px-4 pb-4 mt-0">
            <div className="h-full overflow-auto pt-4">
              <FileTree 
                sessionId={sessionId} 
                className="pt-2"
                onFileSelect={onFileSelect}
                onFileDeleted={onFileDeleted}
                selectedFilePath={selectedFilePath}
                userEmail={userEmail}
              />
            </div>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1 overflow-auto px-4 pb-4 mt-0">
            <div className="pt-4">
              <FileUpload sessionId={sessionId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Connection Status */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground flex items-center">
          <div className={cn(
            'w-2 h-2 rounded-full mr-2',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          )} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 border-t bg-red-50 dark:bg-red-950/20">
          <div className="text-sm text-red-600 dark:text-red-400">
            Error: {error.message}
          </div>
        </div>
      )}
    </div>
  );
}

FileManager.propTypes = {
  sessionId: PropTypes.string,
  onFileSelect: PropTypes.func,
  onFileDeleted: PropTypes.func,
  selectedFilePath: PropTypes.string,
  userEmail: PropTypes.string,
  className: PropTypes.string
};

export default FileManager;
