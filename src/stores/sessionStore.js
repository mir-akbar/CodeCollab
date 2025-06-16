/**
 * Session State Store
 * Manages session-related UI state, filters, and dialogs
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useSessionStore = create()(
  devtools(
    (set, get) => ({
      // Filter state  
      filters: {
        search: '',
        sort: 'recent'
      },
      
      // Dialog state
      dialogs: {
        create: false,
        invite: false,
        delete: false,
        activeData: null
      },

      // Loading states
      loadingStates: {
        refreshing: false,
        creating: false,
        deleting: false,
        inviting: false
      },

      // Actions for filters
      updateFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      }), false, 'updateFilters'),

      resetFilters: () => set({
        filters: { search: '', sort: 'recent' }
      }, false, 'resetFilters'),

      setSearchFilter: (search) => set((state) => ({
        filters: { ...state.filters, search }
      }), false, 'setSearchFilter'),

      setSortFilter: (sort) => set((state) => ({
        filters: { ...state.filters, sort }
      }), false, 'setSortFilter'),

      // Actions for dialogs
      openDialog: (dialogType, data = null) => set((state) => ({
        dialogs: {
          ...state.dialogs,
          [dialogType]: true,
          activeData: data
        }
      }), false, 'openDialog'),

      closeDialog: (dialogType) => set((state) => ({
        dialogs: {
          ...state.dialogs,
          [dialogType]: false,
          activeData: dialogType === 'invite' ? null : state.dialogs.activeData
        }
      }), false, 'closeDialog'),

      closeAllDialogs: () => set({
        dialogs: {
          create: false,
          invite: false,
          delete: false,
          activeData: null
        }
      }, false, 'closeAllDialogs'),

      // Actions for loading states
      setLoading: (operation, isLoading) => set((state) => ({
        loadingStates: {
          ...state.loadingStates,
          [operation]: isLoading
        }
      }), false, 'setLoading'),

      resetLoading: () => set({
        loadingStates: {
          refreshing: false,
          creating: false,
          deleting: false,
          inviting: false
        }
      }, false, 'resetLoading'),

      // Computed selectors
      isAnyLoading: () => {
        const { loadingStates } = get();
        return Object.values(loadingStates).some(Boolean);
      },

      getActiveDialogData: () => get().dialogs.activeData,

      hasActiveFilters: () => {
        const { filters } = get();
        return filters.search.length > 0 || filters.sort !== 'recent';
      },
    }),
    { name: 'SessionStore' }
  )
);

export { useSessionStore };
