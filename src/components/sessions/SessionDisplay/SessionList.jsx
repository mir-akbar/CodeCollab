/**
 * SessionList Component
 * 
 * Displays a grid of session cards with loading states and empty state handling.
 * Provides normalized session data and unique key generation.
 * 
 * @component
 * @version 4.1.0 - Phase 4 Enhancement with Utilities
 * @since 3.0.0
 * 
 * @param {Object} props - Component properties
 * @param {Array<Object>} props.sessions - Array of session objects
 * @param {boolean} [props.isLoading=false] - Loading state for skeleton display
 * @param {string} props.userEmail - Current user's email for permissions
 * @param {Function} props.onInvite - Callback when invite button is clicked
 * @param {Function} [props.onDelete] - Optional callback when delete button is clicked
 * 
 * @example
 * ```jsx
 * <SessionList
 *   sessions={sessionData}
 *   isLoading={false}
 *   userEmail="user@example.com"
 *   onInvite={handleInvite}
 *   onDelete={handleDelete}
 * />
 * ```
 */
import { SessionCard } from './SessionCard';
import { SessionCardSkeleton } from './SessionCardSkeleton';
import { 
  generateSessionKey,
  logDebugInfo
} from '../utils/sessionComponentUtils';
import PropTypes from 'prop-types';

export const SessionList = ({ 
  sessions, 
  isLoading = false, 
  userEmail, 
  onInvite,
  onDelete
}) => {
  // Filter out null/undefined sessions (backend now provides consistent data structure)
  // No need for normalization since backend transformSessionForResponse ensures consistency
  const validSessions = sessions.filter(Boolean);

  // Debug logging in development
  if (import.meta.env.DEV) {
    logDebugInfo('SessionList rendered with sessions:', validSessions);
  }

  /**
   * Render loading skeleton grid
   * @returns {JSX.Element} Loading skeleton
   */
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label="Loading sessions">
        {[...Array(6)].map((_, i) => (
          <SessionCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  /**
   * Render empty state when no sessions available
   * @returns {JSX.Element} Empty state component
   */
  if (!validSessions || validSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-muted-foreground text-lg">No sessions found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or create a new session</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {validSessions.map((session, index) => {
        // Generate unique key using utility function
        const uniqueKey = generateSessionKey(session, index);
        
        return (
          <SessionCard
            key={uniqueKey}
            session={session}
            userEmail={userEmail}
            onInvite={() => onInvite(session)}
            onDelete={onDelete ? () => onDelete(session) : undefined}
          />
        );
      })}
    </div>
  );
};

/**
 * PropTypes validation for SessionList component
 * 
 * @typedef {Object} SessionListProps
 * @property {Array<Object>} sessions - Array of session objects
 * @property {boolean} [isLoading] - Loading state flag
 * @property {string} userEmail - User's email address
 * @property {Function} onInvite - Invite callback function
 */
SessionList.propTypes = {
  /** 
   * Array of session objects to display.
   * Each session should have id, name, creator, and other properties.
   * @type {Array<Object>}
   * @required
   */
  sessions: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    sessionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    creator: PropTypes.string,
    description: PropTypes.string,
    status: PropTypes.string,
    createdAt: PropTypes.string,
    participants: PropTypes.array,
    isFavorite: PropTypes.bool
  })).isRequired,
  
  /** 
   * Loading state to show skeleton UI.
   * @type {boolean}
   * @default false
   */
  isLoading: PropTypes.bool,
  
  /** 
   * Current user's email for permission checks.
   * @type {string}
   * @required
   */
  userEmail: PropTypes.string.isRequired,
  
  /** 
   * Callback function when invite button is clicked.
   * Receives session object as parameter.
   * @type {Function}
   * @required
   */
  onInvite: PropTypes.func.isRequired,
  
  /** 
   * Optional callback function when delete button is clicked.
   * Receives session object as parameter.
   * @type {Function}
   * @optional
   */
  onDelete: PropTypes.func
};