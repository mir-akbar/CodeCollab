import { useState, useEffect } from "react";
import { Users, LogOut, ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/contexts/UserContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { getUserRole, canManageSettings } from "@/utils/permissions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function SessionManagerTopNavBar() {
    const { logout } = useAuth();
    const { userEmail, userProfile } = useUser();
    const [userData, setUserData] = useState({
        name: "",
        email: "",
    });
    const [sessionData, setSessionData] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get("session");

    useEffect(() => {
        // Update user data when auth context changes
        if (userProfile && userEmail) {
            setUserData({
                name: userProfile.name || userProfile.displayName || userEmail.split('@')[0] || "User",
                email: userEmail,
            });
        }
    }, [userProfile, userEmail]);

    useEffect(() => {
        // If we have a session ID, fetch the session data to determine user permissions
        if (sessionId && userEmail) {
            const fetchSessionData = async () => {
                try {
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}`, {
                        credentials: 'include' // Include HTTP-only cookies
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            setSessionData(data.session);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching session data:", error);
                }
            };

            fetchSessionData();
        }
    }, [sessionId, userEmail]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success("You have been successfully logged out");
            navigate("/login");
        } catch (error) {
            console.error("Logout error:", error);
            toast.error("Error logging out");
        }
    };

    // Determine user's role and permissions if in a session
    const userRole = sessionData ? getUserRole(sessionData, userData.email) : null;
    const showAdminSettings = userRole && canManageSettings(userRole);

    return (
        <div className="fixed top-0 left-0 right-0 z-50 h-16 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-8 shadow-md">
            <div className="flex items-center gap-4">
                <Users size={24} className="text-primary" />
                <h1 className="text-xl font-semibold">Session Manager</h1>
                {userRole && (
                    <Badge variant="outline" className="ml-2">
                        Role: {userRole}
                    </Badge>
                )}
            </div>

            <div className="flex items-center gap-2">
                {/* Admin Settings Button - Only shown for owner/admin */}
                {showAdminSettings && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => navigate(`/settings?session=${sessionId}`)}
                            >
                                <Settings className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Session Settings
                        </TooltipContent>
                    </Tooltip>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2 p-2 px-3 h-auto bg-card hover:bg-muted border-border hover:border-primary/30 transition-colors">
                            <Avatar className="h-8 w-8 ring-1 ring-border">
                                <AvatarFallback className="text-sm font-medium bg-muted text-foreground">
                                    {userData.name?.charAt(0)?.toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start text-left min-w-0 max-w-[200px]">
                                <div className="text-sm font-medium truncate text-foreground">
                                    {userData.name || "User"}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {userData.email}
                                </div>
                            </div>
                            <ChevronDown size={16} className="text-muted-foreground ml-1 flex-shrink-0" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 bg-card border-2 border-border shadow-lg">
                        {/* User Profile Section */}
                        <div className="px-3 py-4 bg-muted/30 rounded-t-md">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                                    <AvatarFallback className="text-lg font-medium bg-primary/10 text-primary">
                                        {userData.name?.charAt(0)?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <div className="font-medium text-sm truncate text-foreground">
                                        {userData.name || "User"}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {userData.email}
                                    </div>
                                    {userRole && (
                                        <Badge variant="secondary" className="mt-1 w-fit text-xs bg-primary/10 text-primary border-primary/20">
                                            {userRole}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <DropdownMenuSeparator className="bg-border" />
                        
                        {/* Profile Information */}
                        <DropdownMenuLabel className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/20">
                            Account Information
                        </DropdownMenuLabel>
                        
                        <div className="px-3 py-2 space-y-2 bg-card">
                            <div className="text-xs p-2 rounded bg-muted/30">
                                <span className="text-muted-foreground">Display Name: </span>
                                <span className="font-medium text-foreground">{userData.name || "Not set"}</span>
                            </div>
                            <div className="text-xs p-2 rounded bg-muted/30">
                                <span className="text-muted-foreground">Email: </span>
                                <span className="font-medium text-foreground">{userData.email}</span>
                            </div>
                            {userRole && (
                                <div className="text-xs p-2 rounded bg-muted/30">
                                    <span className="text-muted-foreground">Session Role: </span>
                                    <span className="font-medium capitalize text-foreground">{userRole}</span>
                                </div>
                            )}
                        </div>
                        
                        <DropdownMenuSeparator className="bg-border" />
                        
                        {/* Actions */}
                        <div className="p-1">
                            <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/50 rounded m-1" onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
