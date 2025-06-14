/**
 * SessionCard Component
 * 
 * Interactive card component for displaying session information with user actions.
 * Provides session management capabilities including join, leave, delete, and favorite.
 * Integrates with enhanced state management and utility functions.
 * 
 * @component
 * @version 4.1.0 - Phase 4 Enhancement with Utilities and Documentation
 * @since 2.0.0
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.session - Session object with normalized structure
 * @param {string} props.userEmail - Current user's email for permissions
 * @param {Function} props.onInvite - Callback for opening invitation dialog
 * @param {Function} [props.onDelete] - Optional callback for handling deletion (opens dialog)
 * 
 * @example
 * ```jsx
 * <SessionCard
 *   session={{
 *     id: "sess_123",
 *     name: "React Workshop",
 *     creator: "instructor@example.com",
 *     participants: [...],
 *     description: "Learning React hooks"
 *   }}
 *   userEmail="user@example.com"
 *   onInvite={handleInviteDialog}
 *   onDelete={handleDeleteDialog}
 * />
 * ```
 */
import { motion } from 'framer-motion';
import { AccessLevelBadge } from '../SessionUI/AccessLevelBadge';
import { Button } from '@/components/ui/button';
import { Star, Trash, LogIn, LogOut, Crown, Settings } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from "@/components/ui/badge";
import { Users, Calendar } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PropTypes from "prop-types";
import { getUserRole, canDeleteSession, canManageParticipants, getRoleDisplayName } from '@/utils/permissions';
import { navigateToSession } from '@/utils/sessionUtils';
import { useDeleteSession, useLeaveSession, useSessionParticipants } from '@/hooks/sessions';
import { useFavorites } from '@/hooks/useFavorites';
import { UserManagementDialog } from '../dialogs';
import { 
  formatSessionDate,
  getParticipantCount,
  isUserCreator
} from '../utils/sessionComponentUtils';
import { toast } from 'sonner';

export const SessionCard = ({ 
  session,
  userEmail,
  onInvite,
  onDelete
}) => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const deleteSessionMutation = useDeleteSession();
  const leaveSessionMutation = useLeaveSession();
  
  // Use normalized session data passed as props
  const activeSession = session;
  
  // Fetch participants data lazily using TanStack Query
  const { data: fetchedParticipants = [], isLoading: participantsLoading } = useSessionParticipants(
    activeSession?.sessionId || activeSession?.id,
    { enabled: activeSession?.participantCount > 0 } // Only fetch if there are participants
  );
  
  if (!activeSession) {
    return null;
  }

  // Enhanced data processing with utilities
  // Use fetched participants if available, otherwise fall back to session.participants
  const participants = fetchedParticipants.length > 0 ? fetchedParticipants : (activeSession.participants || []);
  const userRole = getUserRole(activeSession, userEmail);
  const isCreator = isUserCreator(activeSession, userEmail);
  const userAccess = activeSession.access;
  const sessionIsFavorite = isFavorite(activeSession.id || activeSession.sessionId);
  const participantCount = getParticipantCount(activeSession); // Pass session object for optimized count
  const formattedDate = formatSessionDate(activeSession.createdAt);

  // Permission checks using enhanced system
  const permissions = {
    canDelete: canDeleteSession(userRole),
    canManage: canManageParticipants(userRole)
  };

  /**
   * Handles joining the session by navigating to session page
   * @function
   */
  const handleJoin = () => {
    // Add user email to session object for proper access determination
    const sessionWithUser = {
      ...activeSession,
      userEmail: userEmail
    };
    
    navigateToSession(sessionWithUser);
  };

  /**
   * Handles session deletion with error handling
   * Uses onDelete callback if provided, otherwise performs direct deletion
   * @async
   * @function
   */
  const handleDelete = async () => {
    // If onDelete callback is provided, use it (opens dialog)
    if (onDelete) {
      onDelete(activeSession);
      return;
    }

    // Otherwise, perform direct deletion
    try {
      await deleteSessionMutation.mutateAsync({
        sessionId: activeSession.sessionId || activeSession.id
      });
      toast.success("Session deleted successfully");
    } catch (error) {
      toast.error(error.message || "Failed to delete session");
    }
  };

  /**
   * Handles leaving the session with error handling
   * @async
   * @function
   */
  const handleLeave = async () => {
    try {
      await leaveSessionMutation.mutateAsync({
        sessionId: activeSession.sessionId || activeSession.id
      });
      toast.success("Left session successfully");
    } catch (error) {
      toast.error(error.message || "Failed to leave session");
    }
  };

  /**
   * Toggles favorite status for the session
   * @function
   */
  const handleToggleFavorite = () => {
    toggleFavorite(activeSession.id || activeSession.sessionId);
  };

  return (
    <motion.div 
      className="border rounded-lg p-4 shadow-sm space-y-3 bg-card hover:shadow-md transition-shadow h-[240px] flex flex-col"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Header Section */}
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium truncate">{activeSession.name || "Unnamed Session"}</h3>
            {isCreator && (
              <Badge variant="outline" className="border-purple-500 text-purple-500 shrink-0">
                <Crown className="h-3 w-3 mr-1" />
                Creator
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 h-10">
            {activeSession.description || "No description provided"}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleToggleFavorite}
          className="self-start shrink-0"
        >
          <Star className={`h-5 w-5 ${sessionIsFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
        </Button>
      </div>

      {/* Metadata Section */}
      <div className="flex flex-wrap gap-2">
        <AccessLevelBadge access={userAccess} role={userRole} isCreator={isCreator} />
        <Badge variant="outline" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {participantCount} participant{participantCount !== 1 ? 's' : ''}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formattedDate || "Unknown date"}
        </Badge>
      </div>

      {/* Participants Preview */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex -space-x-2">
          {participantsLoading && participantCount > 0 ? (
            // Loading state - show skeleton avatars
            [...Array(Math.min(participantCount, 5))].map((_, index) => (
              <div key={`skeleton-${index}`} className="h-8 w-8 rounded-full bg-accent animate-pulse border-2 border-background" />
            ))
          ) : (
            // Show actual participant avatars
            participants.slice(0, 5).map((p, index) => (
              <Tooltip key={p.email || `participant-${index}`}>
                <TooltipTrigger>
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {p.name?.[0]?.toUpperCase() || p.email?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{p.name || p.email || "Unknown User"}</p>
                  <p className="text-muted-foreground text-xs">
                    {getRoleDisplayName(p.role || (p.access === "edit" ? "editor" : "viewer"))}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))
          )}
          {participants.length > 5 && (
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs">
              +{participants.length - 5}
            </div>
          )}
        </div>
        {permissions.canManage && (
          <UserManagementDialog 
            session={activeSession} 
            userEmail={userEmail}
            onInvite={onInvite}
          >
            <Button 
              variant="secondary" 
              size="sm"
              className="gap-1"
            >
              <Settings className="h-4 w-4" />
              <span>Manage</span>
            </Button>
          </UserManagementDialog>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-between mt-2">
        <Button
          variant="default"
          onClick={handleJoin}
          className="flex-1 gap-1"
        >
          <LogIn className="h-4 w-4" />
          Join Session
        </Button>
        {/* Show Delete button for session creators/owners, Leave button for other participants */}
        {isCreator || permissions.canDelete ? (
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="flex-1 gap-1"
            disabled={deleteSessionMutation.isPending}
          >
            <Trash className="h-4 w-4" />
            {deleteSessionMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleLeave}
            className="flex-1 gap-1 text-destructive hover:text-destructive-foreground hover:bg-destructive"
            disabled={leaveSessionMutation.isPending}
          >
            <LogOut className="h-4 w-4" />
            {leaveSessionMutation.isPending ? "Leaving..." : "Leave"}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

/**
 * PropTypes validation for SessionCard component
 * 
 * @typedef {Object} SessionCardProps
 * @property {Object} session - Normalized session object
 * @property {string} userEmail - Current user's email
 * @property {Function} onInvite - Invitation dialog callback
 */
SessionCard.propTypes = {
  /** 
   * Session object with normalized structure.
   * Must contain either id or sessionId, name, creator, and other properties.
   * @type {Object}
   * @required
   */
  session: PropTypes.shape({
    /** Session identifier (primary) */
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    /** Session identifier (alternative) */
    sessionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    /** Session name/title */
    name: PropTypes.string.isRequired,
    /** Session description */
    description: PropTypes.string,
    /** Creator's email address */
    creator: PropTypes.string.isRequired,
    /** Whether current user is the creator */
    isCreator: PropTypes.bool,
    /** User's access level in the session */
    access: PropTypes.string,
    /** User's role in the session */
    role: PropTypes.string,
    /** Array of session participants */
    participants: PropTypes.arrayOf(PropTypes.shape({
      email: PropTypes.string,
      name: PropTypes.string,
      role: PropTypes.string,
      access: PropTypes.string
    })),
    /** Session creation timestamp */
    createdAt: PropTypes.string,
    /** Session last update timestamp */
    updatedAt: PropTypes.string,
    /** Session status */
    status: PropTypes.string
  }).isRequired,
  
  /** 
   * Current user's email for permission checks and role determination.
   * @type {string}
   * @required
   */
  userEmail: PropTypes.string.isRequired,
  
  /** 
   * Callback function for opening invitation dialog.
   * Receives session object as parameter.
   * @type {Function}
   * @required
   */
  onInvite: PropTypes.func.isRequired,
  
  /** 
   * Optional callback function for handling session deletion.
   * If provided, opens delete confirmation dialog instead of direct deletion.
   * Receives session object as parameter.
   * @type {Function}
   * @optional
   */
  onDelete: PropTypes.func
};

export default SessionCard;
