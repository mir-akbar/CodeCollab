import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing favorite sessions with localStorage persistence
 */
export const useFavorites = () => {
  const [favoriteSessionIds, setFavoriteSessionIds] = useState(() => {
    const stored = localStorage.getItem("favoriteSessionIds");
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("favoriteSessionIds", JSON.stringify(favoriteSessionIds));
  }, [favoriteSessionIds]);

  const toggleFavorite = useCallback((sessionId) => {
    setFavoriteSessionIds((prev) => {
      const newFavorites = prev.includes(sessionId) 
        ? prev.filter((id) => id !== sessionId) 
        : [...prev, sessionId];
      return newFavorites;
    });
  }, []);

  const isFavorite = useCallback((sessionId) => {
    return favoriteSessionIds.includes(sessionId);
  }, [favoriteSessionIds]);

  const addToFavorites = useCallback((sessionId) => {
    setFavoriteSessionIds((prev) => {
      if (!prev.includes(sessionId)) {
        return [...prev, sessionId];
      }
      return prev;
    });
  }, []);

  const removeFromFavorites = useCallback((sessionId) => {
    setFavoriteSessionIds((prev) => prev.filter((id) => id !== sessionId));
  }, []);

  return {
    favoriteSessionIds,
    toggleFavorite,
    isFavorite,
    addToFavorites,
    removeFromFavorites
  };
};
