import { useState, useEffect, useCallback } from "react";
import apiClient from "../../utils/api";
import { useToast } from "../../hooks/use-toast";
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
import CryptoJS from 'crypto-js';
import { getUserRole } from "@/utils/permissions";

const SECRET_KEY = "f9a8b7c6d5e4f3a2b1c0d9e8f7g6h5i4j3k2l1m0n9o8p7q6";

export const SessionManager = ({ userEmail }) => {
    const { toast } = useToast();
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [filters, setFilters] = useState({ search: "", sort: "recent" });
    
    const email = userEmail || localStorage.getItem("email") || "";
    
    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    
    // Favorites
    const [favoriteSessionIds, setFavoriteSessionIds] = useState([]);
    
    // Fetch sessions from the backend
    const fetchUserSessions = useCallback(async () => {
        setIsLoading(true);
        
        try {
            // Use the new sessions API endpoint
            const response = await apiClient.get('/sessions');

            const sessionsData = response.data.sessions || [];
            
            // Process sessions to match the expected format
            const processedSessions = sessionsData.map((session) => {
                // Use the permission utility to get user role
                const userRole = getUserRole(session, email);
                
                // Convert role to legacy access for backward compatibility
                const userAccess = ['owner', 'admin', 'editor'].includes(userRole) ? 'edit' : 'view';
                
                return {
                    id: session._id || session.id,
                    sessionId: session.sessionId,
                    name: session.name,
                    description: session.description,
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt,
                    isCreator: session.creator === email,
                    status: session.status || "active",
                    type: session.creator === email ? "mySessions" : "sharedFromOthers",
                    access: userAccess, // Legacy compatibility
                    role: userRole, // New 4-role system
                    participants: session.participants || [],
                    creator: session.creator
                };
            });
            
            setSessions(processedSessions);
            setIsLoading(false);
            
        } catch (error) {
            console.error("Failed to fetch sessions:", error);
            toast({
                title: "Error",
                description: "Failed to fetch sessions",
                variant: "destructive"
            });
            setIsLoading(false);
        }
    }, [email, toast]);
    
    // Load favorite sessions from localStorage and fetch sessions
    useEffect(() => {
        const storedFavorites = localStorage.getItem("favoriteSessionIds");
        if (storedFavorites) {
            try {
                setFavoriteSessionIds(JSON.parse(storedFavorites));
            } catch (error) {
                console.error("Error parsing favorites from localStorage:", error);
            }
        }
        
        fetchUserSessions();
    }, [fetchUserSessions]);
    
    // Helper function to ensure only one dialog is open at a time
    const openDialog = (dialogType, session = null) => {
        setIsCreateDialogOpen(false);
        setIsInviteDialogOpen(false);
        setIsDeleteDialogOpen(false);
        
        setSelectedSession(session);
        
        // Open the requested dialog after a small delay to ensure clean transition
        setTimeout(() => {
            switch (dialogType) {
                case 'create':
                    setIsCreateDialogOpen(true);
                    break;
                case 'invite':
                    setIsInviteDialogOpen(true);
                    break;
                case 'delete':
                    setIsDeleteDialogOpen(true);
                    break;
                default:
                    break;
            }
        }, 50);
    };
    
    // Reset UI state when dialogs close
    const resetUIState = () => {
        setSelectedSession(null);
        
        // Force blur any active element to prevent selection issues
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };
    
    // Close dialog handlers with proper cleanup
    const closeCreateDialog = () => {
        setIsCreateDialogOpen(false);
        setTimeout(resetUIState, 100);
    };
    
    const closeInviteDialog = () => {
        setIsInviteDialogOpen(false);
        setTimeout(resetUIState, 100);
    };
    
    const closeDeleteDialog = () => {
        setIsDeleteDialogOpen(false);
        setTimeout(resetUIState, 100);
    };

    const handleCreateSession = async (sessionData) => {
        try {
            // Use the new sessions API endpoint for creating sessions
            const response = await apiClient.post('/sessions', {
                name: sessionData.name,
                description: sessionData.description,
                creator: email,
                participants: [{ email, access: 'edit' }]
            });
            
            if (response.data.success) {
                toast({ 
                    title: "Session Created", 
                    description: "Your new session has been created" 
                });
                await fetchUserSessions();
                closeCreateDialog();
                return { success: true };
            } else {
                throw new Error(response.data.error || 'Failed to create session');
            }
            
        } catch (error) {
            console.error("Session creation failed:", error);
            toast({ 
                title: "Creation Failed", 
                description: error.response?.data?.error || error.message,
                variant: "destructive" 
            });
            throw error;
        }
    };

    const handleDelete = async (sessionId) => {
        if (!sessionId) return;
        
        try {
            // Use the new sessions API endpoint for deleting sessions
            const response = await apiClient.delete(`/sessions/${sessionId}`, {
                data: { email }
            });
            
            if (response.data.success) {
                // Remove from local state
                setSessions(sessions.filter(session => session.id !== sessionId && session.sessionId !== sessionId));
                
                // Remove from favorites if present
                if (favoriteSessionIds.includes(sessionId)) {
                    toggleFavorite(sessionId);
                }
                
                toast({ 
                    title: "Session Deleted", 
                    description: "The session has been deleted successfully" 
                });
                
                // Close dialog and refresh sessions
                closeDeleteDialog();
                await fetchUserSessions();
            } else {
                throw new Error(response.data.error || 'Failed to delete session');
            }
            
        } catch (error) {
            console.error("Session deletion failed:", error);
            toast({ 
                title: "Deletion Failed", 
                description: error.response?.data?.error || error.message,
                variant: "destructive" 
            });
        }
    };

    const handleInvite = async (sessionId, inviteeEmail, role) => {
        try {
            console.log('Sending invitation:', { sessionId, inviteeEmail, role, inviterEmail: email });
            
            // Use the new sessions API endpoint for inviting users
            const response = await apiClient.post(`/sessions/${sessionId}/invite`, {
                email: email, // For middleware authentication (current user)
                inviteeEmail: inviteeEmail, // The user being invited
                role: role, // Use role instead of access for new system
                access: role === "editor" ? "edit" : "view", // Backward compatibility
                inviterEmail: email
            });
            
            if (response.data.success) {
                await fetchUserSessions();
                toast({ 
                    title: "Invite Sent", 
                    description: `Invitation sent to ${inviteeEmail}` 
                });
                closeInviteDialog();
            } else {
                throw new Error(response.data.error || 'Failed to send invitation');
            }
            
        } catch (error) {
            console.error("Invitation failed:", error);
            
            let errorMessage = "Failed to send invitation";
            
            if (error.response?.status === 403) {
                errorMessage = "You don't have permission to invite users to this session";
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast({ 
                title: "Invitation Failed", 
                description: errorMessage,
                variant: "destructive" 
            });
        }
    };

    const handleRemoveParticipant = async (sessionId, participantEmail) => {
        try {
            const response = await apiClient.post(`/sessions/${sessionId}/remove-participant`, {
                email: email, // For middleware authentication
                participantEmail: participantEmail,
                removerEmail: email
            });
            
            if (response.data.success) {
                await fetchUserSessions();
                toast({ 
                    title: "Participant Removed", 
                    description: `${participantEmail} has been removed from the session` 
                });
            } else {
                throw new Error(response.data.error || 'Failed to remove participant');
            }
            
        } catch (error) {
            console.error("Remove participant failed:", error);
            toast({ 
                title: "Failed to Remove Participant", 
                description: error.response?.data?.error || error.message,
                variant: "destructive" 
            });
        }
    };

    const handlePromoteToOwner = async (sessionId, participantEmail) => {
        try {
            const response = await apiClient.post(`/sessions/${sessionId}/transfer-ownership`, {
                email: email, // For middleware authentication
                newOwnerEmail: participantEmail,
                currentOwnerEmail: email
            });
            
            if (response.data.success) {
                await fetchUserSessions();
                toast({ 
                    title: "Ownership Transferred", 
                    description: `${participantEmail} is now the owner of this session` 
                });
            } else {
                throw new Error(response.data.error || 'Failed to transfer ownership');
            }
            
        } catch (error) {
            console.error("Transfer ownership failed:", error);
            toast({ 
                title: "Failed to Transfer Ownership", 
                description: error.response?.data?.error || error.message,
                variant: "destructive" 
            });
        }
    };

    const handleUpdateRole = async (sessionId, participantEmail, newRole) => {
        try {
            const response = await apiClient.post(`/sessions/${sessionId}/update-role`, {
                email: email, // For middleware authentication
                participantEmail: participantEmail,
                newRole: newRole,
                updaterEmail: email
            });
            
            if (response.data.success) {
                await fetchUserSessions();
                toast({ 
                    title: "Role Updated", 
                    description: `${participantEmail}'s role has been updated to ${newRole}` 
                });
            } else {
                throw new Error(response.data.error || 'Failed to update role');
            }
            
        } catch (error) {
            console.error("Update role failed:", error);
            toast({ 
                title: "Failed to Update Role", 
                description: error.response?.data?.error || error.message,
                variant: "destructive" 
            });
        }
    };

    const handleLeaveSession = async (sessionId) => {
        try {
            // Use the new sessions API endpoint for leaving sessions
            const response = await apiClient.post(`/sessions/${sessionId}/leave`, {
                email: email // Required for middleware authentication
            });
            
            if (response.data.success) {
                await fetchUserSessions();
                toast({ 
                    title: "Left Session", 
                    description: "You have left the session" 
                });
            } else {
                throw new Error(response.data.error || 'Failed to leave session');
            }
            
        } catch (error) {
            console.error("Leave session failed:", error);
            toast({ 
                title: "Failed to leave session", 
                description: error.response?.data?.error || error.message,
                variant: "destructive" 
            });
        }
    };
    
    // Toggle favorite status
    const toggleFavorite = (sessionId) => {
        setFavoriteSessionIds((prev) => {
            const newFavorites = prev.includes(sessionId) 
                ? prev.filter((id) => id !== sessionId) 
                : [...prev, sessionId];

            // Save to localStorage
            localStorage.setItem("favoriteSessionIds", JSON.stringify(newFavorites));
            return newFavorites;
        });
    };

    function encryptData(text) {
        return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
      }
    
    // Navigate to session
    const navigateToSession = (session) => {
        console.log(session);
        const workspaceUrl = window.location.origin;
        const sessionUrl = `${workspaceUrl}/workspace?session=${session.sessionId}&access=${encodeURIComponent(encryptData(session.access))}`;
        window.location.href = sessionUrl;
        toast({ 
            title: "Joining Session", 
            description: `You would navigate to session` 
        });
        
        
    };

    // Filter sessions based on tab and other criteria
    const filteredSessions = sessions.filter(session => {
        // Filter by tab
        if (activeTab === "created" && !session.isCreator) return false;
        if (activeTab === "invited" && session.isCreator) return false;
        if (activeTab === "favorites" && !favoriteSessionIds.includes(session.id) && !favoriteSessionIds.includes(session.sessionId)) return false;
        
        // Filter by search term
        if (filters.search && !session.name?.toLowerCase().includes(filters.search.toLowerCase())) {
            return false;
        }
        
        return true;
    });

    return (
        <div className="flex flex-col min-h-screen">
            <div className="container mx-auto py-8 px-4 max-w-7xl flex-1 mt-16">
                <div className="flex flex-col space-y-6">
                    {/* Header Section */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Collaboration Hub</h1>
                            <p className="text-muted-foreground">Manage your coding sessions</p>
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
                            onJoin={(session) => navigateToSession(session)}
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