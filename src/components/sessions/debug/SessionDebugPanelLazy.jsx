/**
 * Lazy Loading Wrapper for Session Debug Panel
 * 
 * Performance optimization component that lazy loads debug panel only when needed.
 * Provides fallback loading state and error boundaries for development tools.
 * 
 * @component
 * @version 4.1.0 - Phase 4 Performance Enhancement
 * @since 4.1.0
 * 
 * @param {Object} props - Component properties
 * @param {string} props.userEmail - Current user's email
 * @param {boolean} props.isVisible - Whether debug panel is visible
 * @param {Function} props.onToggle - Toggle visibility callback
 * 
 * @example
 * ```jsx
 * <SessionDebugPanelLazy
 *   userEmail="user@example.com"
 *   isVisible={debugState.isVisible}
 *   onToggle={debugState.toggleDebug}
 * />
 * ```
 */
import { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Bug, Loader2, AlertTriangle } from 'lucide-react';
import PropTypes from 'prop-types';

// Lazy load the debug panel for better performance
const SessionDebugPanel = lazy(() => import('./SessionDebugPanel'));

/**
 * Loading fallback component for debug panel
 * @component
 * @returns {JSX.Element} Loading indicator
 */
const DebugPanelLoader = () => (
  <div className="fixed bottom-4 right-4 z-50 bg-gray-900 border border-gray-700 rounded-lg p-4 flex items-center gap-2">
    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
    <span className="text-sm text-gray-300">Loading debug panel...</span>
  </div>
);

/**
 * Error fallback component for debug panel
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onRetry - Retry callback
 * @returns {JSX.Element} Error indicator
 */
const DebugPanelError = ({ onRetry }) => (
  <div className="fixed bottom-4 right-4 z-50 bg-red-900 border border-red-700 rounded-lg p-4 flex items-center gap-2">
    <AlertTriangle className="h-4 w-4 text-red-400" />
    <span className="text-sm text-red-300">Debug panel failed to load</span>
    <Button 
      onClick={onRetry} 
      variant="outline" 
      size="sm"
      className="ml-2 border-red-600 text-red-300 hover:bg-red-800"
    >
      Retry
    </Button>
  </div>
);

DebugPanelError.propTypes = {
  onRetry: PropTypes.func.isRequired
};

/**
 * Debug panel toggle button for when panel is not visible
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onToggle - Toggle callback
 * @returns {JSX.Element} Toggle button
 */
const DebugToggleButton = ({ onToggle }) => (
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

DebugToggleButton.propTypes = {
  onToggle: PropTypes.func.isRequired
};

/**
 * Main lazy loading wrapper component
 * @component
 * @param {Object} props - Component properties
 * @returns {JSX.Element} Lazy debug panel or toggle button
 */
export const SessionDebugPanelLazy = ({ userEmail, isVisible, onToggle }) => {
  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  // Show toggle button when panel is not visible
  if (!isVisible) {
    return <DebugToggleButton onToggle={onToggle} />;
  }

  // Lazy load the debug panel with suspense and error boundary
  return (
    <Suspense fallback={<DebugPanelLoader />}>
      <SessionDebugPanel
        userEmail={userEmail}
        isVisible={isVisible}
        onToggle={onToggle}
      />
    </Suspense>
  );
};

/**
 * PropTypes validation for SessionDebugPanelLazy component
 */
SessionDebugPanelLazy.propTypes = {
  /** 
   * Current user's email address for session context
   * @type {string}
   * @required
   */
  userEmail: PropTypes.string.isRequired,
  
  /** 
   * Whether the debug panel should be visible
   * @type {boolean}
   * @required
   */
  isVisible: PropTypes.bool.isRequired,
  
  /** 
   * Callback function to toggle debug panel visibility
   * @type {Function}
   * @required
   */
  onToggle: PropTypes.func.isRequired
};

export default SessionDebugPanelLazy;
