/**
 * Session Components - Modular Export Index
 * 
 * Provides barrel exports for all session-related components.
 * Organized by functionality for better code organization and maintainability.
 * 
 * @version 4.0.0 - Modular restructuring
 */

// Main Manager
export { SessionManager } from './SessionManager';

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
  SessionFooter 
} from './SessionUI';

// Debug Components (development only)
export { 
  SessionDebugPanel, 
  SessionStateViewer 
} from './debug';
