/**
 * Auth Hook - Separate file for Fast Refresh compatibility
 */

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

// Auth Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
