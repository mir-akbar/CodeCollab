import React, { useState, useEffect } from "react";
import { useToast } from "../../hooks/use-toast";
import { encryptData } from "../../utils/encryption";
import { workspaceUrl } from "../../config/api";
import useSessionManager from "../../hooks/useSessionManager";

// Import existing components
import SessionList from "./SessionList";
import SessionFooter from "./SessionFooter";
import CreateSessionDialog from "./CreateSessionDialog";
import InviteUserDialog from "./InviteUserDialog";
import DeleteDialog from "./DeleteDialog";

const SessionManager = ({ userEmail: email }) => {
    const { toast } = useToast();
    
    // Use the new session manager hook
    const {
        sessions,
        isLoading,
        error: sessionError,
        systemInfo,
        createSession,
        inviteUser,
        deleteSession,
        refreshSessions,
        getMigrationStatus,
        isUsingNewSystem
    } = useSessionManager(email);

    // Local state for UI
    const [activeTab, setActiveTab] = useState("all");
    const [favoriteSessionIds, setFavoriteSessionIds] = useState([]);
    const [filters, setFilters] = useState({ search: "", status: "all", sort: "recent" });
    
    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    
    // Migration status (only relevant for new system)
    const [migrationStatus, setMigrationStatus] = useState(null);

    // Load favorites from localStorage
    useEffect(() => {
        const storedFavorites = localStorage.getItem("favoriteSessionIds");
        if (storedFavorites) {
            try {
                setFavoriteSessionIds(JSON.parse(storedFavorites));
            } catch (error) {
                console.error("Error parsing favorites from localStorage:", error);
            }
        }
    }, []);

    // Load migration status if using new system
    useEffect(() => {
        const loadMigrationStatus = async () => {
            if (isUsingNewSystem) {
                try {
                    const status = await getMigrationStatus();
                    setMigrationStatus(status);
                } catch (error) {
                    console.error("Failed to load migration status:", error);
                }
            }
        };

        loadMigrationStatus();
    }, [isUsingNewSystem, getMigrationStatus]);

    // Save favorites to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("favoriteSessionIds", JSON.stringify(favoriteSessionIds));
    }, [favoriteSessionIds]);

    // Show error toast if there's a session error
    useEffect(() => {
        if (sessionError) {
            toast({
                title: "Error",
                description: sessionError,
                variant: "destructive"
            });
        }
    }, [sessionError, toast]);

    // Dialog management functions
    const openDialog = (dialogType, session = null) => {
        // Close all dialogs first
        setIsCreateDialogOpen(false);
        setIsInviteDialogOpen(false);
        setIsDeleteDialogOpen(false);
        
        // Set selected session
        setSelectedSession(session);
        
        // Open specific dialog
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
    };

    const closeCreateDialog = () => {
        setIsCreateDialogOpen(false);
        setSelectedSession(null);
    };

    const closeInviteDialog = () => {
        setIsInviteDialogOpen(false);
        setSelectedSession(null);
    };

    const closeDeleteDialog = () => {
        setIsDeleteDialogOpen(false);
        setSelectedSession(null);
    };

    // Session action handlers
    const handleCreateSession = async (sessionData) => {
        try {
            await createSession(sessionData);
            
            toast({ 
                title: "Session Created", 
                description: "Your new session has been created successfully" 
            });
            
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

    const handleInvite = async (sessionId, inviteeEmail, role = 'editor') => {
        try {
            await inviteUser(sessionId, inviteeEmail, role);
            
            toast({ 
                title: "User Invited", 
                description: `Successfully invited ${inviteeEmail} to the session` 
            });
            
            closeInviteDialog();
            return { success: true };
        } catch (error) {
            toast({ 
                title: "Invitation Failed", 
                description: error.message,
                variant: "destructive" 
            });
            throw error;
        }
    };

    const handleDelete = async (sessionId) => {
        if (!sessionId) return;
        
        try {
            await deleteSession(sessionId);
            
            // Remove from favorites if present
            const sessionKey = sessionId;
            if (favoriteSessionIds.includes(sessionKey)) {
                setFavoriteSessionIds(prev => prev.filter(id => id !== sessionKey));
            }
            
            toast({ 
                title: "Session Deleted", 
                description: "The session has been deleted successfully" 
            });
            
            closeDeleteDialog();
        } catch (error) {
            toast({ 
                title: "Deletion Failed", 
                description: error.message,
                variant: "destructive" 
            });
        }
    };

    const handleJoin = (session) => {
        // Use the consistent sessionId field
        const sessionUrl = `${workspaceUrl}/workspace?session=${session.sessionId}&access=${encodeURIComponent(encryptData(session.userAccess || session.access || 'view'))}`;
        window.location.href = sessionUrl;
        
        toast({ 
            title: "Joining Session", 
            description: `Navigating to ${session.name}` 
        });
    };

    // Favorite management
    const toggleFavorite = (sessionId) => {
        setFavoriteSessionIds(prev => {
            const isCurrentlyFavorite = prev.includes(sessionId);
            if (isCurrentlyFavorite) {
                return prev.filter(id => id !== sessionId);
            } else {
                return [...prev, sessionId];
            }
        });
    };

    // Filter sessions based on active tab and filters
    const filteredSessions = sessions.filter(session => {
        // Filter by tab
        if (activeTab === "created" && !session.isCreator) return false;
        if (activeTab === "invited" && session.isCreator) return false;
        if (activeTab === "favorites" && !favoriteSessionIds.includes(session.sessionId)) return false;
        
        // Filter by search term
        if (filters.search && !session.name?.toLowerCase().includes(filters.search.toLowerCase())) {
            return false;
        }
        
        // Filter by status
        if (filters.status !== "all" && session.status !== filters.status) {
            return false;
        }
        
        return true;
    });

    // Sort sessions
    const sortedSessions = [...filteredSessions].sort((a, b) => {
        if (filters.sort === "recent") {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        } else if (filters.sort === "name") {
            return (a.name || "").localeCompare(b.name || "");
        }
        return 0;
    });

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
                            <p className="text-sm text-gray-600">
                                Manage your coding sessions • {sessions.length} total sessions
                                {isUsingNewSystem && (
                                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                        New System
                                    </span>
                                )}
                            </p>
                        </div>
                        <button
                            onClick={() => openDialog('create')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Create Session
                        </button>
                    </div>
                    
                    {/* Migration Status (if applicable) */}
                    {migrationStatus && migrationStatus.available && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-blue-900">Migration Status</h3>
                                    <p className="text-xs text-blue-700">
                                        {migrationStatus.migrationComplete 
                                            ? `✅ Migration complete: ${migrationStatus.migratedSessions}/${migrationStatus.totalLegacySessions} sessions`
                                            : `🔄 Migration progress: ${migrationStatus.migrationProgress}%`
                                        }
                                    </p>
                                </div>
                                <button
                                    onClick={refreshSessions}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
                {/* Tabs and Filters */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    {/* Tabs */}
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        {[
                            { key: "all", label: "All Sessions" },
                            { key: "created", label: "Created by Me" },
                            { key: "invited", label: "Shared with Me" },
                            { key: "favorites", label: "Favorites" }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                    activeTab === tab.key
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search and Filters */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={filters.sort}
                            onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="recent">Recent</option>
                            <option value="name">Name</option>
                        </select>
                    </div>
                </div>

                {/* Session List */}
                <SessionList
                    sessions={sortedSessions}
                    userEmail={email}
                    isLoading={isLoading}
                    favoriteSessionIds={favoriteSessionIds}
                    onJoin={handleJoin}
                    onDelete={(session) => openDialog('delete', session)}
                    onInvite={(session) => openDialog('invite', session)}
                    onToggleFavorite={toggleFavorite}
                />

                {/* Dialogs */}
                <CreateSessionDialog
                    open={isCreateDialogOpen}
                    onClose={closeCreateDialog}
                    onConfirm={handleCreateSession}
                />

                <InviteUserDialog
                    open={isInviteDialogOpen}
                    session={selectedSession}
                    onClose={closeInviteDialog}
                    onConfirm={(inviteeEmail, role) => 
                        handleInvite(selectedSession?.sessionId, inviteeEmail, role)
                    }
                />

                <DeleteDialog
                    open={isDeleteDialogOpen}
                    session={selectedSession}
                    onClose={closeDeleteDialog}
                    onConfirm={() => 
                        handleDelete(selectedSession?.sessionId || selectedSession?.id)
                    }
                />
            </div>
            
            {/* Footer */}
            <SessionFooter />
        </div>
    );
};

export default SessionManager;
