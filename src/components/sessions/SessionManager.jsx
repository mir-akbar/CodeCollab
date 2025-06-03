import { useState, useCallback } from "react";
import { SessionTabs } from "@/components/sessions/SessionTabs";
import { SessionFilters } from "@/components/sessions/SessionFilters";
import { SessionList } from "@/components/sessions/SessionList";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { InviteDialog } from "@/components/sessions/InviteDialog";
import { DeleteDialog } from "@/components/sessions/DeleteDialog";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import PropTypes from "prop-types";
import { SessionFooter } from "@/components/sessions/SessionFooter";

// TanStack Query Hooks
import { 
  useSessions, 
  useCreateSession, 
  useDeleteSession, 
  useInviteUser, 
  useLeaveSession,
  useSessionActions 
} from "../../hooks/useSessions";
import { useDialogState } from "../../hooks/useDialogState";

// Services and Utilities
import { navigateToSession, getFilteredSessions } from "../../utils/sessionUtils";
import { useToast } from "../../hooks/use-toast";

const SessionManager = ({ userEmail }) => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("all");
    const [filters, setFilters] = useState({ search: "", sort: "recent" });
    const [favoriteSessionIds, setFavoriteSessionIds] = useState(() => {
        const stored = localStorage.getItem("favoriteSessionIds");
        try {
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });
    
    // TanStack Query hooks for session management
    const { data: sessions = [], isLoading, error, refetch } = useSessions(userEmail);
    const createSessionMutation = useCreateSession();
    const deleteSessionMutation = useDeleteSession();
    const inviteUserMutation = useInviteUser();
    const leaveSessionMutation = useLeaveSession();
    const sessionActions = useSessionActions(userEmail);
    
    const {
        isCreateDialogOpen,
        isInviteDialogOpen,
        isDeleteDialogOpen,
        selectedSession,
        openDialog,
        closeCreateDialog,
        closeInviteDialog,
        closeDeleteDialog
    } = useDialogState();

    // Toggle favorite functionality
    const toggleFavorite = useCallback((sessionId) => {
        setFavoriteSessionIds((prev) => {
            const newFavorites = prev.includes(sessionId) 
                ? prev.filter((id) => id !== sessionId) 
                : [...prev, sessionId];

            localStorage.setItem("favoriteSessionIds", JSON.stringify(newFavorites));
            return newFavorites;
        });
    }, []);

    // Action handlers using TanStack Query mutations
    const handleCreateSession = async (sessionData) => {
        try {
            await createSessionMutation.mutateAsync({
                ...sessionData,
                creator: userEmail
            });
            closeCreateDialog();
            toast({
                title: "Success",
                description: "Session created successfully",
            });
            return { success: true };
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to create session",
                variant: "destructive",
            });
            return { success: false, error: error.message };
        }
    };

    const handleDelete = async (sessionId) => {
        try {
            await deleteSessionMutation.mutateAsync({
                sessionId,
                userEmail
            });
            closeDeleteDialog();
            toast({
                title: "Success",
                description: "Session deleted successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete session",
                variant: "destructive",
            });
        }
    };

    const handleInvite = async (sessionId, inviteeEmail, role) => {
        try {
            await inviteUserMutation.mutateAsync({
                sessionId,
                email: inviteeEmail,
                inviterEmail: userEmail,
                access: role === 'editor' ? 'edit' : 'view'
            });
            closeInviteDialog();
            toast({
                title: "Success",
                description: "User invited successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to invite user",
                variant: "destructive",
            });
        }
    };

    const handleRemoveParticipant = async (sessionId, participantEmail) => {
        try {
            await sessionActions.removeParticipant.mutateAsync({
                sessionId,
                participantEmail,
                userEmail
            });
            toast({
                title: "Success",
                description: "Participant removed successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to remove participant",
                variant: "destructive",
            });
        }
    };

    const handlePromoteToOwner = async (sessionId, participantEmail) => {
        try {
            await sessionActions.promoteToOwner.mutateAsync({
                sessionId,
                participantEmail,
                userEmail
            });
            toast({
                title: "Success",
                description: "User promoted to owner successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to promote user",
                variant: "destructive",
            });
        }
    };

    const handleUpdateRole = async (sessionId, participantEmail, newRole) => {
        try {
            await sessionActions.updateRole.mutateAsync({
                sessionId,
                participantEmail,
                newRole,
                userEmail
            });
            toast({
                title: "Success",
                description: "Role updated successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to update role",
                variant: "destructive",
            });
        }
    };

    const handleLeaveSession = async (sessionId) => {
        try {
            await leaveSessionMutation.mutateAsync({
                sessionId,
                userEmail
            });
            toast({
                title: "Success",
                description: "Left session successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to leave session",
                variant: "destructive",
            });
        }
    };

    // Navigation helper
    const handleJoinSession = (session) => {
        navigateToSession(session, toast);
    };

    // Handle refresh
    const handleRefresh = () => {
        refetch();
        toast({
            title: "Refreshing",
            description: "Updating session list...",
        });
    };

    // Get filtered sessions
    const filteredSessions = getFilteredSessions(sessions, filters, activeTab, favoriteSessionIds);

    // Show error state if there's an error
    if (error) {
        console.error('Sessions error:', error);
    }

    return (
        <div className="flex flex-col min-h-screen">
            <div className="container mx-auto py-8 px-4 max-w-7xl flex-1 mt-16">
                <div className="flex flex-col space-y-6">
                    {/* Header Section */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Collaboration Hub</h1>
                            <p className="text-muted-foreground">Manage your coding sessions</p>
                            {/* TanStack Query Status */}
                            <p className="text-xs mt-1 text-green-400">
                                System: TanStack Query | Status: {isLoading ? 'Loading...' : 'Ready'}
                            </p>
                        </div>
                        <div className="flex space-x-2">
                            <Button
                                onClick={handleRefresh}
                                variant="outline"
                                size="icon"
                                className="bg-black"
                                disabled={isLoading}
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => openDialog('create')}
                                className="gap-2 bg-black"
                            >
                                <Plus className="h-4 w-4" />
                                New Session
                            </Button>
                        </div>
                    </div>
                    
                    {/* Filters Section */}
                    <SessionFilters
                        filters={filters}
                        onFilterChange={setFilters}
                    />

                    {/* Tabs Section */}
                    <SessionTabs activeTab={activeTab} onTabChange={setActiveTab} />

                    {/* Sessions List */}
                    <div className="flex-1 min-h-[300px]">
                        <SessionList
                            sessions={filteredSessions}
                            isLoading={isLoading}
                            userEmail={userEmail}
                            onJoin={handleJoinSession}
                            onDelete={(session) => openDialog('delete', session)}
                            onInvite={(session) => openDialog('invite', session)}
                            onLeave={(session) => handleLeaveSession(session.sessionId)}
                            onToggleFavorite={(session) => toggleFavorite(session.id)}
                            favoriteSessionIds={favoriteSessionIds}
                        />
                    </div>

                    {/* Dialogs */}
                    <CreateSessionDialog
                        open={isCreateDialogOpen}
                        onClose={closeCreateDialog}
                        onCreate={handleCreateSession}
                    />
                    
                    <InviteDialog
                        open={isInviteDialogOpen}
                        session={selectedSession}
                        currentUserEmail={userEmail}
                        currentUserRole={selectedSession?.isCreator ? "owner" : selectedSession?.access === "admin" ? "admin" : selectedSession?.access === "edit" ? "editor" : "viewer"}
                        onClose={closeInviteDialog}
                        onInviteSent={handleInvite}
                        onRemoveParticipant={handleRemoveParticipant}
                        onPromoteToOwner={handlePromoteToOwner}
                        onUpdateRole={handleUpdateRole}
                    />

                    <DeleteDialog
                        open={isDeleteDialogOpen}
                        session={selectedSession}
                        onClose={closeDeleteDialog}
                        onConfirm={() => handleDelete(selectedSession?.sessionId || selectedSession?.id)}
                    />
                </div>
            </div>
            
            {/* Footer */}
            <SessionFooter />
        </div>
    );
};

SessionManager.propTypes = {
  userEmail: PropTypes.string
};

export default SessionManager;
