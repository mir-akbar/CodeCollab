/**
 * UserContext.jsx
 * Provides user information across components without relying on localStorage
 */

import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../hooks/useAuth';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { user, isLoading } = useAuth();
  const [userEmail, setUserEmail] = useState(null);

  // Update user email whenever auth state changes
  useEffect(() => {
    if (user && user.email) {
      setUserEmail(user.email);
    } else if (!isLoading) {
      // Only clear if not loading (to avoid clearing during auth check)
      console.log('UserContext: Clearing user data');
      setUserEmail(null);
    }
  }, [user, isLoading]);

  const value = {
    userEmail,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

UserProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
