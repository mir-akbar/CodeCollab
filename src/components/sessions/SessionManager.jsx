import { useState } from "react";
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

// Custom Hooks
import useSessionManager from "../../hooks/useSessionManager";
import { useDialogState } from "../../hooks/useDialogState";

// Services and Utilities
import { SessionActions } from "../../services/sessionActions";
import { navigateToSession, getFilteredSessions } from "../../utils/sessionUtils";
import { useToast } from "../../hooks/use-toast";

const SessionManager = ({ userEmail }) => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("all");
    const [filters, setFilters] = useState({ search: "", sort: "recent" });
    
    // Custom hooks for state management
    const { 
        sessions, 
        setSessions, 
        isLoading, 
        favoriteSessionIds, 
        toggleFavorite, 
        fetchUserSessions, 
        email,
        systemInfo // Add systemInfo from useSessionManager
    } = useSessionManager(userEmail);
    
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
    
    // Initialize session actions service
    const sessionActions = new SessionActions(toast, fetchUserSessions);
    
    // Action handlers using the session actions service
    const handleCreateSession = async (sessionData) => {
        const result = await sessionActions.createSession(sessionData, email);
        if (result.success) {
            closeCreateDialog();
        }
        return result;
    };

    const handleDelete = async (sessionId) => {
        await sessionActions.deleteSession(sessionId, email, sessions, setSessions, favoriteSessionIds, toggleFavorite);
        closeDeleteDialog();
    };

    const handleInvite = async (sessionId, inviteeEmail, role) => {
        await sessionActions.inviteUser(sessionId, inviteeEmail, role, email);
        closeInviteDialog();
    };

    const handleRemoveParticipant = async (sessionId, participantEmail) => {
        await sessionActions.removeParticipant(sessionId, participantEmail, email);
    };

    const handlePromoteToOwner = async (sessionId, participantEmail) => {
        await sessionActions.promoteToOwner(sessionId, participantEmail, email);
    };

    const handleUpdateRole = async (sessionId, participantEmail, newRole) => {
        await sessionActions.updateRole(sessionId, participantEmail, newRole, email);
    };

    const handleLeaveSession = async (sessionId) => {
        await sessionActions.leaveSession(sessionId, email);
    };

    // Navigation helper
    const handleJoinSession = (session) => {
        navigateToSession(session, toast);
    };

    // Get filtered sessions
    const filteredSessions = getFilteredSessions(sessions, filters, activeTab, favoriteSessionIds);

    return (
        <div className="flex flex-col min-h-screen">
            <div className="container mx-auto py-8 px-4 max-w-7xl flex-1 mt-16">
                <div className="flex flex-col space-y-6">
                    {/* Header Section */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Collaboration Hub</h1>
                            <p className="text-muted-foreground">Manage your coding sessions</p>
                            {/* Temporary debug info */}
                            {systemInfo && (
                                <p className="text-xs mt-1 text-blue-400">
                                    System: {systemInfo.usingNewSystem ? 'NEW' : 'LEGACY'} | Status: {systemInfo.status || 'Unknown'}
                                </p>
                            )}
                        </div>
                        <div className="flex space-x-2">
                            <Button
                                onClick={fetchUserSessions}
                                variant="outline"
                                size="icon"
                                className="bg-black"
                            >
                                <RefreshCw className="h-4 w-4" />
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
                            userEmail={email}
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
                        currentUserEmail={email}
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
