/**
 * File Manager Store
 * Manages file tree state, expanded folders, and file operations
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useFileManagerStore = create()(
  devtools(
    (set) => ({
      // File tree state
      expandedFolders: new Set(),
      selectedFilePath: null,
      
      // Dialog states
      deleteDialogOpen: false,
      fileToDelete: null,
      
      // File operations
      isDeleting: false,
      deletingFiles: new Set(),
      
      // File upload state
      isDragOver: false,
      validationError: null,

      // Actions
      toggleFolder: (folderPath) => set((state) => {
        const newExpanded = new Set(state.expandedFolders);
        if (newExpanded.has(folderPath)) {
          newExpanded.delete(folderPath);
        } else {
          newExpanded.add(folderPath);
        }
        return { expandedFolders: newExpanded };
      }, false, 'toggleFolder'),

      setSelectedFile: (filePath) => set({ 
        selectedFilePath: filePath 
      }, false, 'setSelectedFile'),

      openDeleteDialog: (file) => set({ 
        deleteDialogOpen: true, 
        fileToDelete: file 
      }, false, 'openDeleteDialog'),

      closeDeleteDialog: () => set({ 
        deleteDialogOpen: false, 
        fileToDelete: null 
      }, false, 'closeDeleteDialog'),

      setDeletingFile: (filePath, isDeleting) => set((state) => {
        const newDeletingFiles = new Set(state.deletingFiles);
        if (isDeleting) {
          newDeletingFiles.add(filePath);
        } else {
          newDeletingFiles.delete(filePath);
        }
        return { deletingFiles: newDeletingFiles };
      }, false, 'setDeletingFile'),

      // Expand folder and all parent folders
      expandToFile: (filePath) => set((state) => {
        const pathParts = filePath.split('/');
        const newExpanded = new Set(state.expandedFolders);
        
        // Expand all parent folders
        let currentPath = '';
        for (let i = 0; i < pathParts.length - 1; i++) {
          currentPath += (currentPath ? '/' : '') + pathParts[i];
          newExpanded.add(currentPath);
        }
        
        return { expandedFolders: newExpanded };
      }, false, 'expandToFile'),

      // Reset state
      reset: () => set({
        expandedFolders: new Set(),
        selectedFilePath: null,
        deleteDialogOpen: false,
        fileToDelete: null,
        isDeleting: false,
        deletingFiles: new Set(),
        isDragOver: false,
        validationError: null
      }, false, 'reset'),

      // File upload actions
      setDragOver: (isDragOver) => set({ 
        isDragOver 
      }, false, 'setDragOver'),

      setValidationError: (error) => set({ 
        validationError: error 
      }, false, 'setValidationError'),

      clearValidationError: () => set({ 
        validationError: null 
      }, false, 'clearValidationError')
    }),
    {
      name: 'file-manager-store',
    }
  )
);

export default useFileManagerStore;
