/**
 * Session Component Utilities
 * 
 * Shared utilities and helpers for session components.
 * Provides common functionality used across the session module.
 * 
 * @version 1.0.0 - Phase 4 Modularity Enhancement
 */

/**
 * Validates session data structure
 * @param {object} session - Session object to validate
 * @returns {boolean} - True if valid
 */
export const isValidSession = (session) => {
  if (!session || typeof session !== 'object') return false;
  
  return !!(
    (session.id || session.sessionId) &&
    session.name &&
    session.creator
  );
};

/**
 * Formats session creation date for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
export const formatSessionDate = (dateString) => {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Unknown';
  }
};

/**
 * Gets display name for participant count
 * @param {number} count - Number of participants
 * @returns {string} - Formatted participant count
 */
export const formatParticipantCount = (count) => {
  if (!count || count === 0) return 'No participants';
  if (count === 1) return '1 participant';
  return `${count} participants`;
};

/**
 * Gets participant count from session data
 * Optimized to use direct count from database when available
 * NOTE: This count includes only active participants (excludes pending invitations)
 * @param {Array|Object} participantsOrSession - Array of participants OR session object with participantCount
 * @returns {number} - Number of active participants
 */
export const getParticipantCount = (participantsOrSession) => {
  // If it's a session object with a direct participantCount field, use that (optimized)
  if (participantsOrSession && typeof participantsOrSession === 'object' && 
      typeof participantsOrSession.participantCount === 'number') {
    return participantsOrSession.participantCount;
  }
  
  // Check for participantCount in activity object (database structure)
  if (participantsOrSession && typeof participantsOrSession === 'object' && 
      participantsOrSession.activity && 
      typeof participantsOrSession.activity.participantCount === 'number') {
    return participantsOrSession.activity.participantCount;
  }
  
  // Fall back to array counting for backward compatibility
  // Filter to only count active participants if participants array includes status
  const participants = Array.isArray(participantsOrSession) 
    ? participantsOrSession 
    : participantsOrSession?.participants;
    
  if (Array.isArray(participants)) {
    // If participants have status field, count only active ones
    const firstParticipant = participants[0];
    if (firstParticipant && typeof firstParticipant.status === 'string') {
      return participants.filter(p => p.status === 'active').length;
    }
    // Otherwise return total length (backward compatibility)
    return participants.length;
  }
  
  return 0;
};

/**
 * Gets total participant count including pending invitations
 * @param {Array|Object} participantsOrSession - Array of participants OR session object
 * @returns {number} - Number of all participants (active + invited)
 */
export const getTotalParticipantCount = (participantsOrSession) => {
  // Fall back to array counting
  const participants = Array.isArray(participantsOrSession) 
    ? participantsOrSession 
    : participantsOrSession?.participants;
    
  return Array.isArray(participants) ? participants.length : 0;
};

/**
 * Checks if user is the creator of the session
 * @param {object} session - Session object
 * @param {string} userEmail - Current user email
 * @returns {boolean} - True if user is creator
 */
export const isUserCreator = (session, userEmail) => {
  if (!session || !userEmail) return false;
  return session.isCreator || session.creator === userEmail;
};

/**
 * Determines if user can perform action on session
 * @param {object} session - Session object
 * @param {string} userEmail - Current user email
 * @param {string} action - Action to check ('edit', 'delete', 'invite')
 * @returns {boolean} - True if action is allowed
 */
export const canUserPerformAction = (session, userEmail, action) => {
  if (!session || !userEmail) return false;

  const isCreator = session.isCreator || session.creator === userEmail;
  const userParticipant = session.participants?.find(p => p.email === userEmail);
  const userRole = userParticipant?.role || session.role;

  switch (action) {
    case 'delete':
      return isCreator;
    case 'edit':
      return isCreator || ['admin', 'editor'].includes(userRole);
    case 'invite':
      return isCreator || ['admin', 'editor'].includes(userRole);
    case 'view':
      return true; // If user has access to session, they can view
    default:
      return false;
  }
};

/**
 * Gets appropriate action button variant based on session state
 * @param {object} session - Session object
 * @param {string} userEmail - Current user email
 * @returns {object} - Button configuration
 */
export const getSessionActionConfig = (session, userEmail) => {
  const isCreator = session?.isCreator || session?.creator === userEmail;
  const canEdit = canUserPerformAction(session, userEmail, 'edit');

  if (isCreator) {
    return {
      primary: { text: 'Open', variant: 'default', action: 'open' },
      secondary: { text: 'Invite', variant: 'outline', action: 'invite' }
    };
  }

  if (canEdit) {
    return {
      primary: { text: 'Open', variant: 'default', action: 'open' },
      secondary: { text: 'Edit', variant: 'outline', action: 'edit' }
    };
  }

  return {
    primary: { text: 'Join', variant: 'default', action: 'join' },
    secondary: { text: 'View', variant: 'outline', action: 'view' }
  };
};

/**
 * Generates unique key for session components
 * @param {object} session - Session object
 * @param {number} index - Optional index for additional uniqueness
 * @returns {string} - Unique key
 */
export const generateSessionKey = (session, index = null) => {
  const id = session?.id || session?.sessionId || 'unknown';
  const timestamp = session?.createdAt ? new Date(session.createdAt).getTime() : Date.now();
  const suffix = index !== null ? `-${index}` : '';
  
  return `session-${id}-${timestamp}${suffix}`;
};

/**
 * Filters sessions by search term across multiple fields
 * @param {Array} sessions - Array of sessions
 * @param {string} searchTerm - Search query
 * @returns {Array} - Filtered sessions
 */
export const searchSessions = (sessions, searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) return sessions;
  
  const term = searchTerm.toLowerCase().trim();
  
  return sessions.filter(session => {
    const searchableFields = [
      session.name,
      session.description,
      session.creator,
      ...(session.participants?.map(p => p.name || p.email) || [])
    ];
    
    return searchableFields.some(field => 
      field && field.toLowerCase().includes(term)
    );
  });
};

/**
 * Sorts sessions by various criteria
 * @param {Array} sessions - Array of sessions
 * @param {string} sortBy - Sort criteria
 * @returns {Array} - Sorted sessions
 */
export const sortSessions = (sessions, sortBy) => {
  const sorted = [...sessions];
  
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    case 'created':
      return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'updated':
      return sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    case 'participants':
      return sorted.sort((a, b) => (b.participants?.length || 0) - (a.participants?.length || 0));
    case 'favorites':
      return sorted.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    case 'recent':
    default:
      return sorted.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }
};

/**
 * Debug helper to log session component state
 * @param {string} componentName - Name of the component
 * @param {object} state - Component state to log
 * @param {boolean} enabled - Whether debugging is enabled
 */
export const debugSessionComponent = (componentName, state, enabled = false) => {
  if (!enabled || !import.meta.env.DEV) return;
  
  console.group(`🔧 Session Debug: ${componentName}`);
  console.log('State:', state);
  console.log('Timestamp:', new Date().toISOString());
  console.groupEnd();
};

/**
 * Error boundary helper for session components
 * @param {Error} error - The error that occurred
 * @param {string} componentName - Name of the component where error occurred
 * @returns {object} - Error information for display
 */
export const handleSessionError = (error, componentName) => {
  const errorInfo = {
    message: error.message || 'An unexpected error occurred',
    component: componentName,
    timestamp: new Date().toISOString(),
    isRecoverable: !error.message?.includes('Network') && !error.message?.includes('fetch')
  };

  if (import.meta.env.DEV) {
    console.error(`Session Error in ${componentName}:`, error);
  }

  return errorInfo;
};

/**
 * Debug logging helper for development
 * @param {string} message - Debug message
 * @param {any} data - Data to log
 */
export const logDebugInfo = (message, data) => {
  if (import.meta.env.DEV) {
    console.log(`🎯 Session Debug: ${message}`, data);
  }
};
