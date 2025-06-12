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
  const [userProfile, setUserProfile] = useState(null);

  // Update user email whenever auth state changes
  useEffect(() => {
    // console.log('UserContext: Auth state changed:', { user, userEmail: user?.email, isLoading });
    if (user && user.email) {
      // console.log('UserContext: Setting user data:', user.email);
      setUserEmail(user.email);
      setUserProfile(user);
    } else if (!isLoading) {
      // Only clear if not loading (to avoid clearing during auth check)
      console.log('UserContext: Clearing user data');
      setUserEmail(null);
      setUserProfile(null);
    }
  }, [user, isLoading]);

  const value = {
    userEmail,
    userProfile,
  };
  //Debug
  // console.log('UserContext: Providing value:', value);

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
