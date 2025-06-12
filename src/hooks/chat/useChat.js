/**
 * Chat Hooks
 * React hooks for chat functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatWebSocketService } from '../../services/chat/chatWebSocket';
import { useUser } from '../../contexts/UserContext';

export function useChat(sessionId) {
  const { userEmail } = useUser();
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const connectionRef = useRef(null);

  // Initialize chat connection
  useEffect(() => {
    if (!sessionId || !userEmail) {
      setIsLoading(false);
      return;
    }

    console.log('🔗 Initializing chat for session:', sessionId);
    setIsLoading(true);
    setError(null);

    try {
      // Connect to chat
      connectionRef.current = chatWebSocketService.connect(sessionId);
      
      // Set user presence
      chatWebSocketService.setUserPresence(sessionId, {
        email: userEmail,
        name: userEmail.split('@')[0]
      });

      // Set up event listeners
      const handleMessages = (newMessages) => {
        setMessages([...newMessages]);
      };

      const handleUsers = (users) => {
        setOnlineUsers([...users]);
      };

      const handleConnection = (connected) => {
        setIsConnected(connected);
        if (connected) {
          // Load initial messages when connected
          const initialMessages = chatWebSocketService.getMessages(sessionId);
          setMessages([...initialMessages]);
          
          // Load initial users
          const initialUsers = chatWebSocketService.getOnlineUsers(sessionId);
          setOnlineUsers([...initialUsers]);
        }
        setIsLoading(false);
      };

      // Subscribe to events
      chatWebSocketService.on(sessionId, 'messages', handleMessages);
      chatWebSocketService.on(sessionId, 'users', handleUsers);
      chatWebSocketService.on(sessionId, 'connected', handleConnection);

      // Check if already connected
      if (chatWebSocketService.isConnected(sessionId)) {
        handleConnection(true);
      }

      return () => {
        console.log('🧹 Cleaning up chat connection');
        chatWebSocketService.off(sessionId, 'messages', handleMessages);
        chatWebSocketService.off(sessionId, 'users', handleUsers);
        chatWebSocketService.off(sessionId, 'connected', handleConnection);
        chatWebSocketService.disconnect(sessionId);
      };
    } catch (err) {
      console.error('Error initializing chat:', err);
      setError(err);
      setIsLoading(false);
    }
  }, [sessionId, userEmail]);

  // Send message function
  const sendMessage = useCallback(async (content) => {
    if (!sessionId || !userEmail || !content.trim()) {
      throw new Error('Invalid message parameters');
    }

    if (!isConnected) {
      throw new Error('Chat is not connected');
    }

    try {
      const message = {
        content: content.trim(),
        sender: userEmail.split('@')[0],
        senderEmail: userEmail,
        type: 'message'
      };

      const sentMessage = chatWebSocketService.sendMessage(sessionId, message);
      console.log('💬 Message sent:', sentMessage.content);
      return sentMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err);
      throw err;
    }
  }, [sessionId, userEmail, isConnected]);

  // Send system message
  const sendSystemMessage = useCallback(async (content) => {
    if (!sessionId || !content.trim()) {
      throw new Error('Invalid system message parameters');
    }

    if (!isConnected) {
      throw new Error('Chat is not connected');
    }

    try {
      const message = {
        content: content.trim(),
        sender: 'System',
        senderEmail: 'system@codelab.app',
        type: 'system'
      };

      const sentMessage = chatWebSocketService.sendMessage(sessionId, message);
      console.log('🔔 System message sent:', sentMessage.content);
      return sentMessage;
    } catch (err) {
      console.error('Error sending system message:', err);
      setError(err);
      throw err;
    }
  }, [sessionId, isConnected]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get user color
  const getUserColor = useCallback((email) => {
    return chatWebSocketService.stringToColor(email);
  }, []);

  return {
    // State
    messages,
    onlineUsers,
    isConnected,
    isLoading,
    error,
    
    // Actions
    sendMessage,
    sendSystemMessage,
    clearError,
    getUserColor,
    
    // Computed
    userCount: onlineUsers.length,
    hasMessages: messages.length > 0
  };
}

export default useChat;
