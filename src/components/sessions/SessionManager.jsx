import { useState, useEffect } from "react";
import { SessionTabs } from "@/components/sessions/SessionTabs";
import { SessionFilters } from "@/components/sessions/SessionFilters";
import { SessionList } from "@/components/sessions/SessionList";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { InviteDialog } from "@/components/sessions/InviteDialog";
import { DeleteDialog } from "@/components/sessions/DeleteDialog";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/common/Constant";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import PropTypes from "prop-types";
import { SessionFooter } from "@/components/sessions/SessionFooter";
import CryptoJS from 'crypto-js';

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

    const [selectedSessionId, setSelectedSessionId] = useState(null);
    
    // Favorites
    const [favoriteSessionIds, setFavoriteSessionIds] = useState([]);
    
    // Load favorite sessions from localStorage
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
    }, [email]);
    
    // Fetch sessions from the backend
    const fetchUserSessions = async () => {
        setIsLoading(true);
        
        try {
            const mySessionsRes = await axios.get(`${API_URL}/manage_session/get-my-sessions`, {
                params: { email: email },
            });

            const sharedSessionsRes = await axios.get(`${API_URL}/manage_session/get-shared-sessions`, {
                params: { email: email },
            });

            const mySessions = mySessionsRes.data.map((item, index) => ({
                id: item.id,
                sessionId: item.sessionId,
                name: item.name,
                createdAt: item.createdAt,
                isCreator: true,
                status: "active",
                type: "mySessions",
                access: item.access,
                description: item.description,
                participants: item.participants
            }));

            const sharedSessions = sharedSessionsRes.data.map((item, index) => ({
                id: item.id,
                sessionId: item.sessionId,
                name: item.name,
                createdAt: item.createdAt,
                isCreator: false,
                status: "active",
                type: "sharedFromOthers",
                access: item.access,
                description: item.description,
                participants: item.participants
            }));
            setSessions([...mySessions, ...sharedSessions]);
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
    };
    
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

    const handleCreateSession = async () => {
        try {
            // For demo purposes, add a new dummy session
            const newSession = {
                id: `session-${sessions.length + 1}`,
                sessionId: `s-000${sessions.length + 1}`,
                name: `New Session ${sessions.length + 1}`,
                createdAt: new Date().toISOString(),
                isCreator: true,
                status: "active",
                type: "mySessions",
                access: "edit",
                description: "Newly created session",
                participants: [
                    { email: email, name: "Me", access: "edit" }
                ],
                creator: email
            };
            
            setSessions([newSession, ...sessions]);
            
            toast({ 
                title: "Session Created", 
                description: "Your new session has been created" 
            });
            await fetchUserSessions();
            closeCreateDialog();
        
            
            return { success: true };
        } catch (error) {
            toast({ 
                title: "Creation Failed", 
                description: error.message,
                variant: "destructive" 
            });
            throw error;
        }
    };

    const handleDelete = async (sessionId) => {
        if (!sessionId) return;
        
        try {
            // For demo purposes, filter out the deleted session
            setSessions(sessions.filter(session => session.id !== sessionId && session.sessionId !== sessionId));
            
            // Remove from favorites if present
            if (favoriteSessionIds.includes(sessionId)) {
                toggleFavorite(sessionId);
            }

            await axios.post(`${API_URL}/manage_session/delete-session`, {
                sessionId: sessionId,
            });
            await fetchUserSessions();
            
            toast({ 
                title: "Session Deleted", 
                description: "The session has been deleted successfully" 
            });
            
            // Close dialog
            closeDeleteDialog();
            
            
            // Real implementation
           
        
        } catch (error) {
            toast({ 
                title: "Deletion Failed", 
                description: error.message,
                variant: "destructive" 
            });
        }
    };

    const handleInvite = async (sessionId, inviteeEmail, access) => {
        try {
            // Real implementation
            await axios.post(`${API_URL}/manage_session/invite-session`, {
                id: selectedSession.id,
                sessionId: sessionId,
                email: inviteeEmail,
                access:access
            });
            await fetchUserSessions();
            toast({ 
                title: "Invite Sent", 
                description: `Invitation sent to ${inviteeEmail}` 
            });
            
            closeInviteDialog();
            
            
        } catch (error) {
            toast({ 
                title: "Invite Failed", 
                description: error.message,
                variant: "destructive" 
            });
            console.error("Invite failed:", error);
            throw error;
        }
    };

    const handleLeaveSession = async (id) => {
        
        try {
            if (id) {
                await axios.post(`${API_URL}/manage_session/leave-session`, {
                    id: id,
                });
                await fetchUserSessions();
                toast({ 
                    title: "Left Session", 
                    description: `You have left session"` 
                });
            } else {
                toast({ 
                    title: "Cannot Leave", 
                    description: "You cannot leave sessions you created. Delete them instead." 
                });
            }
            
        } catch (error) {
            toast({ 
                title: "Failed to leave session", 
                description: error.message,
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
                            onLeave={(session) => handleLeaveSession(session.id)}
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
                        onClose={closeInviteDialog}
                        onInviteSent={handleInvite}
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