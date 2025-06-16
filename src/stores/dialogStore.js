/**
 * Dialog Store
 * Manages dialog form states and modal interactions
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useDialogStore = create()(
  devtools(
    (set) => ({
      // Create Session Dialog
      createSession: {
        name: '',
        description: '',
        isSubmitting: false
      },
      
      // Invitation Dialog
      invitation: {
        email: '',
        role: 'editor',
        isSubmitting: false
      },
      
      // User Management Dialog
      userManagement: {
        userToRemove: null,
        isOpen: false
      },
      
      // Delete Session Dialog
      deleteSession: {
        confirmationText: '',
        isDeleting: false
      },

      // Pending Invitations
      pendingInvitations: {
        processingInvitation: null
      },

      // Actions for Create Session Dialog
      setCreateSessionName: (name) => set((state) => ({
        createSession: { ...state.createSession, name }
      }), false, 'setCreateSessionName'),
      
      setCreateSessionDescription: (description) => set((state) => ({
        createSession: { ...state.createSession, description }
      }), false, 'setCreateSessionDescription'),
      
      setCreateSessionSubmitting: (isSubmitting) => set((state) => ({
        createSession: { ...state.createSession, isSubmitting }
      }), false, 'setCreateSessionSubmitting'),
      
      resetCreateSession: () => set({
        createSession: { name: '', description: '', isSubmitting: false }
      }, false, 'resetCreateSession'),

      // Actions for Invitation Dialog
      setInvitationEmail: (email) => set((state) => ({
        invitation: { ...state.invitation, email }
      }), false, 'setInvitationEmail'),
      
      setInvitationRole: (role) => set((state) => ({
        invitation: { ...state.invitation, role }
      }), false, 'setInvitationRole'),
      
      setInvitationSubmitting: (isSubmitting) => set((state) => ({
        invitation: { ...state.invitation, isSubmitting }
      }), false, 'setInvitationSubmitting'),
      
      resetInvitation: () => set({
        invitation: { email: '', role: 'editor', isSubmitting: false }
      }, false, 'resetInvitation'),

      // Actions for User Management Dialog
      setUserToRemove: (user) => set((state) => ({
        userManagement: { ...state.userManagement, userToRemove: user }
      }), false, 'setUserToRemove'),
      
      setUserManagementOpen: (isOpen) => set((state) => ({
        userManagement: { ...state.userManagement, isOpen }
      }), false, 'setUserManagementOpen'),
      
      resetUserManagement: () => set({
        userManagement: { userToRemove: null, isOpen: false }
      }, false, 'resetUserManagement'),

      // Actions for Delete Session Dialog
      setDeleteConfirmationText: (text) => set((state) => ({
        deleteSession: { ...state.deleteSession, confirmationText: text }
      }), false, 'setDeleteConfirmationText'),
      
      setDeleteSessionDeleting: (isDeleting) => set((state) => ({
        deleteSession: { ...state.deleteSession, isDeleting }
      }), false, 'setDeleteSessionDeleting'),
      
      resetDeleteSession: () => set({
        deleteSession: { confirmationText: '', isDeleting: false }
      }, false, 'resetDeleteSession'),

      // Actions for Pending Invitations
      setProcessingInvitation: (invitationId) => set((state) => ({
        pendingInvitations: { ...state.pendingInvitations, processingInvitation: invitationId }
      }), false, 'setProcessingInvitation'),
      
      clearProcessingInvitation: () => set((state) => ({
        pendingInvitations: { ...state.pendingInvitations, processingInvitation: null }
      }), false, 'clearProcessingInvitation')
    }),
    {
      name: 'dialog-store',
    }
  )
);

export default useDialogStore;
