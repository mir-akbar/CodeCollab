/**
 * Zustand DevTools Integration
 * Provides debugging capabilities for all Zustand stores
 */
import PropTypes from 'prop-types';
import { useUIStore, useEditorStore, useSessionStore } from '@/stores';

export function ZustandDevTools() {
  // Subscribe to all stores to make them visible in devtools
  useUIStore();
  useEditorStore(); 
  useSessionStore();

  // This component renders nothing but enables devtools
  return null;
}

// Only show in development
export const DevToolsProvider = ({ children }) => {
  return (
    <>
      {children}
      {import.meta.env.DEV && <ZustandDevTools />}
    </>
  );
};

DevToolsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
