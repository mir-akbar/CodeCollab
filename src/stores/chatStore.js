/**
 * Chat Store
 * Manages chat message input and related UI state
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useChatStore = create()(
  devtools(
    (set) => ({
      // Message input state
      newMessage: '',
      
      // Actions
      setNewMessage: (message) => set({ 
        newMessage: message 
      }, false, 'setNewMessage'),

      clearNewMessage: () => set({ 
        newMessage: '' 
      }, false, 'clearNewMessage'),

      // Reset state
      reset: () => set({
        newMessage: ''
      }, false, 'reset')
    }),
    {
      name: 'chat-store',
    }
  )
);

export default useChatStore;
