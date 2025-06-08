import { useState, useEffect, useCallback } from 'react';

// Key for storing favorites in localStorage
const FAVORITES_KEY = 'session-favorites';

/**
 * Custom hook for managing session favorites
 * Favorites are stored in localStorage as they are user preferences, not sensitive data
 */
const useFavorites = () => {
  const [favorites, setFavorites] = useState(new Set());

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_KEY);
      if (storedFavorites) {
        const favoriteArray = JSON.parse(storedFavorites);
        setFavorites(new Set(favoriteArray));
      }
    } catch (error) {
      console.error('Failed to load favorites from localStorage:', error);
      setFavorites(new Set());
    }
  }, []);

  // Save favorites to localStorage whenever favorites change
  const saveFavorites = useCallback((newFavorites) => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...newFavorites]));
    } catch (error) {
      console.error('Failed to save favorites to localStorage:', error);
    }
  }, []);

  // Check if a session is favorited
  const isFavorite = useCallback((sessionId) => {
    return favorites.has(sessionId);
  }, [favorites]);

  // Toggle favorite status for a session
  const toggleFavorite = useCallback((sessionId) => {
    if (!sessionId) {
      console.warn('toggleFavorite called with invalid sessionId:', sessionId);
      return;
    }

    setFavorites(prevFavorites => {
      const newFavorites = new Set(prevFavorites);
      
      if (newFavorites.has(sessionId)) {
        newFavorites.delete(sessionId);
      } else {
        newFavorites.add(sessionId);
      }
      
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, [saveFavorites]);

  // Add a session to favorites
  const addFavorite = useCallback((sessionId) => {
    if (!sessionId) {
      console.warn('addFavorite called with invalid sessionId:', sessionId);
      return;
    }

    setFavorites(prevFavorites => {
      if (prevFavorites.has(sessionId)) {
        return prevFavorites; // Already favorited
      }
      
      const newFavorites = new Set(prevFavorites);
      newFavorites.add(sessionId);
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, [saveFavorites]);

  // Remove a session from favorites
  const removeFavorite = useCallback((sessionId) => {
    if (!sessionId) {
      console.warn('removeFavorite called with invalid sessionId:', sessionId);
      return;
    }

    setFavorites(prevFavorites => {
      if (!prevFavorites.has(sessionId)) {
        return prevFavorites; // Not favorited
      }
      
      const newFavorites = new Set(prevFavorites);
      newFavorites.delete(sessionId);
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, [saveFavorites]);

  // Get all favorite session IDs
  const getFavorites = useCallback(() => {
    return [...favorites];
  }, [favorites]);

  // Clear all favorites
  const clearFavorites = useCallback(() => {
    setFavorites(new Set());
    try {
      localStorage.removeItem(FAVORITES_KEY);
    } catch (error) {
      console.error('Failed to clear favorites from localStorage:', error);
    }
  }, []);

  return {
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    getFavorites,
    clearFavorites,
    favoritesCount: favorites.size
  };
};

export { useFavorites };
