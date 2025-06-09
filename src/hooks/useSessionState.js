/**
 * useSessionState - Custom hook for session state management
 * 
 * Provides reusable session state logic for components.
 * Centralizes common state patterns used across session components.
 * 
 * @version 1.0.0 - Phase 4 Modularity Enhancement
 */

import { useState, useCallback } from 'react';

/**
 * Hook for managing session dialog states
 * @param {string} initialDialog - Initial dialog to open
 * @returns {object} Dialog state and handlers
 */
export const useSessionDialogs = (initialDialog = null) => {
  const [dialogs, setDialogs] = useState({
    create: false,
    invite: false,
    delete: false,
    activeData: null
  });

  const openDialog = useCallback((dialogType, data = null) => {
    setDialogs(prev => ({
      ...prev,
      [dialogType]: true,
      activeData: data
    }));
  }, []);

  const closeDialog = useCallback((dialogType) => {
    setDialogs(prev => ({
      ...prev,
      [dialogType]: false,
      activeData: prev.activeData && dialogType === 'invite' ? null : prev.activeData
    }));
  }, []);

  const closeAllDialogs = useCallback(() => {
    setDialogs({
      create: false,
      invite: false,
      delete: false,
      activeData: null
    });
  }, []);

  return {
    dialogs,
    openDialog,
    closeDialog,
    closeAllDialogs
  };
};

/**
 * Hook for managing session filters and tabs
 * @param {object} initialFilters - Initial filter state
 * @param {string} initialTab - Initial active tab
 * @returns {object} Filter state and handlers
 */
export const useSessionFilters = (
  initialFilters = { search: "", sort: "recent" },
  initialTab = "all"
) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [filters, setFilters] = useState(initialFilters);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setActiveTab(initialTab);
  }, [initialFilters, initialTab]);

  return {
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    updateFilters,
    resetFilters
  };
};

/**
 * Hook for managing session loading states
 * @returns {object} Loading state management
 */
export const useSessionLoading = () => {
  const [loadingStates, setLoadingStates] = useState({
    refreshing: false,
    creating: false,
    deleting: false,
    inviting: false
  });

  const setLoading = useCallback((operation, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [operation]: isLoading
    }));
  }, []);

  const resetLoading = useCallback(() => {
    setLoadingStates({
      refreshing: false,
      creating: false,
      deleting: false,
      inviting: false
    });
  }, []);

  return {
    loadingStates,
    setLoading,
    resetLoading,
    isAnyLoading: Object.values(loadingStates).some(Boolean)
  };
};

/**
 * Hook for managing session debug state (development only)
 * @returns {object} Debug state management
 */
export const useSessionDebug = () => {
  const [debugState, setDebugState] = useState({
    isVisible: false,
    activeTab: 'overview',
    isCollapsed: false
  });

  const isDevelopment = import.meta.env.DEV;

  const toggleDebug = useCallback(() => {
    if (!isDevelopment) return;
    setDebugState(prev => ({ ...prev, isVisible: !prev.isVisible }));
  }, [isDevelopment]);

  const setDebugTab = useCallback((tab) => {
    setDebugState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const toggleCollapse = useCallback(() => {
    setDebugState(prev => ({ ...prev, isCollapsed: !prev.isCollapsed }));
  }, []);

  return {
    debugState,
    toggleDebug,
    setDebugTab,
    toggleCollapse,
    isDevelopment
  };
};

/**
 * Composite hook that combines common session state patterns
 * @param {object} options - Configuration options
 * @returns {object} Combined state and handlers
 */
export const useSessionManagerState = (options = {}) => {
  const {
    initialFilters = { search: "", sort: "recent" },
    initialTab = "all",
    enableDebug = true
  } = options;

  const dialogState = useSessionDialogs();
  const filterState = useSessionFilters(initialFilters, initialTab);
  const loadingState = useSessionLoading();
  const debugState = enableDebug ? useSessionDebug() : null;

  return {
    ...dialogState,
    ...filterState,
    ...loadingState,
    ...(debugState && { debug: debugState })
  };
};
