/**
 * Session Components - Modular Export Index
 * 
 * Provides barrel exports for all session-related components.
 * Organized by functionality for better code organization and maintainability.
 * 
 * @version 4.1.0 - Updated to use enhanced SessionManager
 */

// Main Manager (Enhanced version from SessionManager directory)
export { SessionManager } from './SessionManager/SessionManager';

// Display Components
export { 
  SessionList, 
  SessionCard, 
  SessionCardSkeleton 
} from './SessionDisplay';

// Action Components
export { 
  CreateSessionDialog, 
  InvitationDialog 
} from './SessionActions';

// Navigation Components
export { 
  SessionTabs, 
  SessionFilters 
} from './SessionNavigation';

// UI Components
export { 
  AccessLevelBadge, 
  SessionFooter,
  SessionManagerTopNavBar 
} from './SessionUI';
