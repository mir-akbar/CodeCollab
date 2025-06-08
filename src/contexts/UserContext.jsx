/**
 * UserContext.jsx
 * Provides user information across components without relying on localStorage
 */

import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../hooks/useAuth';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { user } = useAuth();
  const [userEmail, setUserEmail] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Update user email whenever auth state changes
  useEffect(() => {
    if (user) {
      setUserEmail(user.email);
      setUserProfile(user);
    } else {
      setUserEmail(null);
      setUserProfile(null);
    }
  }, [user]);

  const value = {
    userEmail,
    userProfile,
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
