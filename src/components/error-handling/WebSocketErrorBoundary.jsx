/**
 * WebSocket Error Boundary
 * Catches and handles WebSocket-related errors to prevent UI freezes
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class WebSocketErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error) {
    // Check if this is a WebSocket-related error
    const isWebSocketError = 
      error.message?.includes('WebSocket') ||
      error.message?.includes('Y-WebSocket') ||
      error.message?.includes('yjs') ||
      error.message?.includes('y-websocket') ||
      error.stack?.includes('websocket') ||
      error.stack?.includes('yjs');

    if (isWebSocketError) {
      console.error('🚨 WebSocket Error Boundary caught error:', error);
      return { hasError: true };
    }

    // Re-throw non-WebSocket errors
    throw error;
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 WebSocket Error Boundary details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo
    });

    // Auto-retry after a delay (max 3 retries)
    if (this.state.retryCount < 3) {
      setTimeout(() => {
        this.handleRetry();
      }, 2000 + (this.state.retryCount * 1000)); // Exponential backoff
    }
  }

  handleRetry = async () => {
    if (this.state.isRetrying) return;

    this.setState({ isRetrying: true });

    try {
      // Clean up any lingering WebSocket connections
      const { codeCollaborationService } = await import('@/services/code-editor/codeCollaborationService');
      codeCollaborationService.disconnectAll();

      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
        isRetrying: false
      });

      console.log('🔄 WebSocket Error Boundary: Retry successful');
    } catch (retryError) {
      console.error('❌ WebSocket Error Boundary: Retry failed:', retryError);
      this.setState({ isRetrying: false });
    }
  };

  handleManualRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[200px] p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500 h-6 w-6" />
              <h3 className="text-lg font-semibold text-red-800">
                Connection Error
              </h3>
            </div>
            
            <p className="text-red-700 mb-4">
              A collaborative editing connection error occurred. This might affect real-time features.
            </p>

            <div className="space-y-2">
              {this.state.retryCount < 3 && (
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {this.state.isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Reconnecting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Retry Connection
                    </>
                  )}
                </button>
              )}

              <button
                onClick={this.handleManualRefresh}
                className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
              >
                Refresh Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto max-h-32">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WebSocketErrorBoundary;
