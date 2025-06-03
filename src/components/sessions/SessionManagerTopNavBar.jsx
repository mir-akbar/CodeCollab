import { useState, useEffect } from "react";
import { Users, LogOut, ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { userPool, logout } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
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
    const [userData, setUserData] = useState({
        name: "",
        email: "",
    });
    const [sessionData, setSessionData] = useState(null);
    const { toast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get("session");

    useEffect(() => {
        // Get current user from Cognito user pool
        const cognitoUser = userPool.getCurrentUser();
        
        if (cognitoUser) {
            cognitoUser.getSession((err) => {
                if (err) {
                    console.error("Error getting session:", err);
                    return;
                }
                
                // Session is valid, get user attributes
                cognitoUser.getUserAttributes((err, attributes) => {
                    if (err) {
                        console.error("Error getting user attributes:", err);
                        return;
                    }
                    
                    // Process the attributes
                    const userInfo = {};
                    attributes.forEach(attr => {
                        userInfo[attr.getName()] = attr.getValue();
                    });
                    
                    setUserData({
                        name: userInfo.name || userInfo.email?.split('@')[0] || "User",
                        email: userInfo.email || "",
                    });
                });
            });
        } else {
            // No authenticated user found, try to get from localStorage
            const email = localStorage.getItem("email");
            if (email) {
                setUserData({
                    name: email.split('@')[0] || "User",
                    email: email,
                });
            }
        }

        // If we have a session ID, fetch the session data to determine user permissions
        if (sessionId) {
            const fetchSessionData = async () => {
                try {
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/sessions/${sessionId}?email=${userData.email}`);
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
    }, [sessionId, userData.email]);

    const handleLogout = () => {
        logout();
        toast({
            title: "Logged out",
            description: "You have been successfully logged out",
        });
        navigate("/login");
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
                        <Button variant="outline" className="gap-2 p-1 px-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{userData.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start text-sm md:block">
                                <span className="text-xs text-muted-foreground">{userData.email}</span>
                            </div>
                            <ChevronDown size={16} className="text-muted-foreground hidden md:block" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        {userRole && (
                            <>
                                <DropdownMenuLabel>Role: {userRole}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem className="text-red-500" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
