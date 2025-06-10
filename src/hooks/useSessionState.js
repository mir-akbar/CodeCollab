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
 * @returns {object} Dialog state and handlers
 */
export const useSessionDialogs = () => {
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
 * Composite hook that combines common session state patterns
 * @param {object} options - Configuration options
 * @returns {object} Combined state and handlers
 */
export const useSessionManagerState = (options = {}) => {
  const {
    initialFilters = { search: "", sort: "recent" },
    initialTab = "all"
  } = options;

  const dialogState = useSessionDialogs();
  const filterState = useSessionFilters(initialFilters, initialTab);
  const loadingState = useSessionLoading();

  return {
    ...dialogState,
    ...filterState,
    ...loadingState
  };
};
