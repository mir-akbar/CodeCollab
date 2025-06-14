/**
 * Session Manager - Enhanced with Modular State Management
 * 
 * Features:
 * - Modern session management with classic design
 * - Comprehensive loading states and skeleton UI
 * - Visual feedback for all user actions
 * - Tab-based filtering and search functionality
 * - Modular state management with shared hooks
 * - Performance optimized with lazy loading
 * 
 * @component
 * @version 4.1.0 - Phase 4 Modularity Enhancement
 * @since 1.0.0
 * 
 * @param {Object} props - Component props
 * @param {string} props.userEmail - User's email address for session management
 * 
 * @example
 * ```jsx
 * <SessionManager userEmail="user@example.com" />
 * ```
 */

import { Button } from '@/components/ui/button';
import { SessionTabs, SessionFilters } from '../SessionNavigation';
import { SessionList, SessionCardSkeleton } from '../SessionDisplay';
import { SessionFooter } from '../SessionUI';
import { CreateSessionDialog, InvitationDialog, DeleteSessionDialog } from '../dialogs';
import { PendingInvitations } from '../../PendingInvitations';
import { 
  Plus, 
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  useSessionsWithInvitations
} from '@/hooks/useSessions';
import { useSessionManagerState } from '@/hooks/useSessionState';
import { getFilteredSessions } from '@/utils/sessionUtils';
import PropTypes from 'prop-types';

/**
 * SessionManager Component
 * 
 * Main container component for session management functionality.
 * Handles session display, filtering, creation, and user interactions.
 * 
 * @param {Object} props - Component properties
 * @param {string} props.userEmail - Required user email for session operations
 * @returns {JSX.Element} Rendered SessionManager component
 */
export function SessionManager({ userEmail }) {
  // Enhanced state management using shared hooks
  const {
    // Dialog state
    dialogs,
    openDialog,
    closeDialog,
    // Filter state
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    // Loading state
    loadingStates,
    setLoading
  } = useSessionManagerState({
    initialFilters: { search: "", sort: "recent" },
    initialTab: "all"
  });

  // Coordinated data fetching for better synchronization
  const { sessions: sessionsQuery, invitations: invitationsQuery, refreshBoth } = useSessionsWithInvitations();
  const { data: sessions = [], isLoading, isFetching, error } = sessionsQuery;

  // Filter sessions based on tab and search/sort
  const filteredSessions = getFilteredSessions(sessions, activeTab, filters, userEmail);

    /**
   * Handles session creation dialog opening
   * @function
   */
  const handleCreateSession = () => {
    openDialog('create');
  };

  /**
   * Handles user invitation dialog opening
   * @function
   * @param {Object} session - Session to invite users to
   */
  const handleInviteUser = (session) => {
    openDialog('invite', session);
  };

  /**
   * Handles session deletion dialog opening
   * @function
   * @param {Object} session - Session to delete
   */
  const handleDeleteSession = (session) => {
    openDialog('delete', session);
  };

  /**
   * Handles session refresh with loading state management
   * Uses coordinated refresh to ensure perfect synchronization
   * @async
   * @function
   */
  const handleRefresh = async () => {
    setLoading('refreshing', true);
    try {
      // Use coordinated refresh for perfect synchronization
      await refreshBoth();
      toast.success('Sessions and invitations refreshed successfully');
    } catch (refreshError) {
      console.error('Refresh failed:', refreshError);
      toast.error('Failed to refresh data. Please try again.');
    } finally {
      setLoading('refreshing', false);
    }
  };

  /**
   * Closes the create session dialog
   * @function
   */
  const closeCreateDialog = () => closeDialog('create');

  /**
   * Closes the invitation dialog
   * @function
   */
  const closeInviteDialog = () => closeDialog('invite');

  /**
   * Closes the delete session dialog
   * @function
   */
  const closeDeleteDialog = () => closeDialog('delete');

  // Enhanced loading states for different scenarios  
  const showInitialLoading = isLoading && !sessions.length;
  const showRefreshLoading = (isFetching || loadingStates.refreshing) && sessions.length > 0;

  return (
    <div className="flex flex-col flex-1">
      <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl flex-1">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Session Manager</h1>
            <p className="text-muted-foreground">Manage your coding sessions and collaborations</p>
          </div>
          
          <div className="flex gap-3 flex-shrink-0 w-full lg:w-auto justify-end">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={loadingStates.refreshing || showInitialLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingStates.refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={handleCreateSession}
              disabled={showInitialLoading}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Session
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 mb-6">
            <p className="text-red-300">Failed to load sessions: {error.message}</p>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Pending Invitations Section */}
        {!showInitialLoading && (
          <div className="mb-6">
            <PendingInvitations 
              userEmail={userEmail} 
              showSkeleton={loadingStates.refreshing}
              invitationsQuery={invitationsQuery}
            />
          </div>
        )}

        {/* Initial Loading State */}
        {showInitialLoading ? (
          <div className="space-y-6">
            {/* Skeleton for filters and tabs */}
            <div className="space-y-4">
              <div className="h-16 bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-12 bg-gray-800 rounded-lg animate-pulse" />
            </div>
            
            {/* Skeleton for session cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <SessionCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 mt-8">
            {/* Filters */}
            <SessionFilters 
              filters={filters} 
              onFilterChange={setFilters}
            />

            {/* Tabs */}
            <SessionTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
            />

            {/* Sessions List with refresh loading overlay */}
            <div className="relative">
              {showRefreshLoading && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                  <div className="bg-gray-900 rounded-lg p-4 flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Refreshing sessions...</span>
                  </div>
                </div>
              )}
              
              <SessionList
                sessions={filteredSessions}
                isLoading={showRefreshLoading}
                userEmail={userEmail}
                onInvite={handleInviteUser}
                onDelete={handleDeleteSession}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <SessionFooter />

      {/* Dialogs */}
      <CreateSessionDialog
        open={dialogs.create}
        onClose={closeCreateDialog}
        userEmail={userEmail}
      />
      
      <InvitationDialog
        open={dialogs.invite}
        onClose={closeInviteDialog}
        session={dialogs.activeData}
      />

      <DeleteSessionDialog
        open={dialogs.delete}
        onClose={closeDeleteDialog}
        session={dialogs.activeData}
        userEmail={userEmail}
      />
    </div>
  );
}

/**
 * PropTypes for SessionManager component
 * 
 * @typedef {Object} SessionManagerProps
 * @property {string} userEmail - User's email address (required)
 */
SessionManager.propTypes = {
  /** 
   * User's email address for session management operations.
   * Used for filtering user-specific sessions and permissions.
   * @type {string}
   * @required
   */
  userEmail: PropTypes.string.isRequired
};

export default SessionManager;
