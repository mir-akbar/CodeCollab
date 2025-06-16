/**
 * UI State Store
 * Manages global UI state that was previously scattered across components
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useUIStore = create()(
  devtools(
    persist(
      (set) => ({
        // Sidebar state
        sidebarOpen: true,
        sidebarMobile: false,

        // Active tabs across the application  
        activeSessionTab: 'all', // all, shared, favorites
        activeCollaborationTab: 'chat', // chat, video, settings
        activeFileManagerTab: 'files', // files, upload

        // Selected items
        selectedFile: null,
        selectedFilePath: null,

        // Loading states for UI feedback
        isRefreshing: false,

        // Actions
        setSidebarOpen: (open) => set({ sidebarOpen: open }, false, 'setSidebarOpen'),
        setSidebarMobile: (open) => set({ sidebarMobile: open }, false, 'setSidebarMobile'),
        setActiveSessionTab: (tab) => set({ activeSessionTab: tab }, false, 'setActiveSessionTab'),
        setActiveCollaborationTab: (tab) => set({ activeCollaborationTab: tab }, false, 'setActiveCollaborationTab'),
        setActiveFileManagerTab: (tab) => set({ activeFileManagerTab: tab }, false, 'setActiveFileManagerTab'),
        
        setSelectedFile: (file) => set({ 
          selectedFile: file,
          selectedFilePath: file?.path || null 
        }, false, 'setSelectedFile'),

        setIsRefreshing: (refreshing) => set({ isRefreshing: refreshing }, false, 'setIsRefreshing'),

        // Bulk actions for complex state updates
        resetSelectedFile: () => set({ 
          selectedFile: null, 
          selectedFilePath: null 
        }, false, 'resetSelectedFile'),

        toggleSidebar: () => set((state) => ({ 
          sidebarOpen: !state.sidebarOpen 
        }), false, 'toggleSidebar'),
      }),
      {
        name: 'ui-store',
        // Only persist specific UI preferences
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          activeSessionTab: state.activeSessionTab,
        }),
      }
    ),
    { name: 'UIStore' }
  )
);

export { useUIStore };
