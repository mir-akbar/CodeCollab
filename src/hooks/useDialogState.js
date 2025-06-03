import { useState } from "react";

export const useDialogState = () => {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);

    // Helper function to ensure only one dialog is open at a time
    const openDialog = (dialogType, session = null) => {
        setIsCreateDialogOpen(false);
        setIsInviteDialogOpen(false);
        setIsDeleteDialogOpen(false);
        
        setSelectedSession(session);
        
        // Open the requested dialog after a small delay to ensure clean transition
        setTimeout(() => {
            switch (dialogType) {
                case 'create':
                    setIsCreateDialogOpen(true);
                    break;
                case 'invite':
                    setIsInviteDialogOpen(true);
                    break;
                case 'delete':
                    setIsDeleteDialogOpen(true);
                    break;
                default:
                    break;
            }
        }, 50);
    };

    // Reset UI state when dialogs close
    const resetUIState = () => {
        setSelectedSession(null);
        
        // Force blur any active element to prevent selection issues
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    // Close dialog handlers with proper cleanup
    const closeCreateDialog = () => {
        setIsCreateDialogOpen(false);
        setTimeout(resetUIState, 100);
    };

    const closeInviteDialog = () => {
        setIsInviteDialogOpen(false);
        setTimeout(resetUIState, 100);
    };

    const closeDeleteDialog = () => {
        setIsDeleteDialogOpen(false);
        setTimeout(resetUIState, 100);
    };

    return {
        // State
        isCreateDialogOpen,
        isInviteDialogOpen,
        isDeleteDialogOpen,
        selectedSession,
        
        // Actions
        openDialog,
        closeCreateDialog,
        closeInviteDialog,
        closeDeleteDialog,
        resetUIState
    };
};
