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

// TanStack Query Hooks
import { 
  useSessions 
} from "../../hooks/useSessions";
import { useDialogState } from "../../hooks/useDialogState";

// Services and Utilities
import { getFilteredSessions } from "../../utils/sessionUtils";
import { toast } from "sonner";
import { getUserRole } from "@/utils/permissions";

const SessionManager = ({ userEmail }) => {
    const [activeTab, setActiveTab] = useState("all");
    const [filters, setFilters] = useState({ search: "", sort: "recent" });
    
    // TanStack Query hooks for session management
    const { 
        data: sessions = [], 
        isLoading, 
        isFetching, 
        error, 
        refetch 
    } = useSessions(userEmail);
    
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

        
    // Handle refresh
    const handleRefresh = async () => {
        let loadingToast;
        try {
            loadingToast = toast.loading("Updating session list...");
            await refetch();
            toast.dismiss(loadingToast);
            toast.success("Session list refreshed successfully");
        } catch (error) {
            console.error('Refresh error:', error);
            if (loadingToast) toast.dismiss(loadingToast);
            toast.error("Failed to refresh sessions");
        }
    };

    // Get filtered sessions (favorites now handled by SessionCard internally)
    const filteredSessions = getFilteredSessions(sessions, filters, activeTab, []);

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
                                System: TanStack Query | Status: {isFetching ? 'Refreshing...' : 'Ready'}
                            </p>
                        </div>
                        <div className="flex space-x-2">
                            <Button
                                onClick={handleRefresh}
                                variant="outline"
                                size="icon"
                                className="bg-black"
                                disabled={isFetching}
                            >
                                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
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
                            isLoading={isLoading || isFetching}
                            userEmail={userEmail}
                            onInvite={(session) => {
                                console.log("SessionManager onInvite called:", {
                                    session,
                                    userRole: getUserRole(session, userEmail),
                                    userEmail
                                });
                                openDialog('invite', session);
                            }}
                        />
                    </div>

                    {/* Dialogs */}
                    <CreateSessionDialog
                        open={isCreateDialogOpen}
                        onClose={closeCreateDialog}
                        userEmail={userEmail}
                    />
                    
                    <InviteDialog
                        open={isInviteDialogOpen}
                        session={selectedSession}
                        currentUserEmail={userEmail}
                        currentUserRole={selectedSession ? getUserRole(selectedSession, userEmail) : "viewer"}
                        userEmail={userEmail}
                        onClose={closeInviteDialog}
                    />

                    <DeleteDialog
                        open={isDeleteDialogOpen}
                        session={selectedSession}
                        onClose={closeDeleteDialog}
                        userEmail={userEmail}
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
