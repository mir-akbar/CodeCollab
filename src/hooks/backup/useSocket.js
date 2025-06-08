import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../common/Constant';

export const useSocket = (userEmail, handlers) => {
  useEffect(() => {
    const socket = io(API_URL, { transports: ['polling', 'websocket'] });
    
    socket.on('connect', () => console.log('Connected:', socket.id));
    socket.on('session-invitation', handlers.handleInvitation);
    socket.on('session-updated', handlers.handleUpdate);
    socket.on('session-deleted', handlers.handleDelete);

    return () => {
      socket.off('session-invitation');
      socket.off('session-updated');
      socket.off('session-deleted');
      socket.disconnect();
    };
  }, [userEmail, handlers]);
};