import apiClient from "../utils/api";

export class SessionActions {
    constructor(toast, fetchUserSessions) {
        this.toast = toast;
        this.fetchUserSessions = fetchUserSessions;
    }

    async createSession(sessionData, email) {
        try {
            const response = await apiClient.post('/sessions', {
                name: sessionData.name,
                description: sessionData.description,
                creator: email,
                participants: [{ email, access: 'edit' }]
            });
            
            if (response.data.success) {
                this.toast({ 
                    title: "Session Created", 
                    description: "Your new session has been created" 
                });
                await this.fetchUserSessions();
                return { success: true };
            } else {
                throw new Error(response.data.error || 'Failed to create session');
            }
            
        } catch (error) {
            console.error("Session creation failed:", error);
            this.toast({ 
                title: "Creation Failed", 
                description: error.response?.data?.error || error.message,
                variant: "destructive" 
            });
            throw error;
        }
    }

    async deleteSession(sessionId, email, sessions, setSessions, favoriteSessionIds, toggleFavorite) {
        if (!sessionId) return;
        
        try {
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
                
                this.toast({ 
                    title: "Session Deleted", 
                    description: "The session has been deleted successfully" 
                });
                
                await this.fetchUserSessions();
            } else {
                throw new Error(response.data.error || 'Failed to delete session');
            }
            
        } catch (error) {
            console.error("Session deletion failed:", error);
            this.toast({ 
                title: "Deletion Failed", 
                description: error.response?.data?.error || error.message,
                variant: "destructive" 
            });
        }
    }

    async inviteUser(sessionId, inviteeEmail, role, email) {
        try {
            console.log('Sending invitation:', { sessionId, inviteeEmail, role, inviterEmail: email });
            
            const response = await apiClient.post(`/sessions/${sessionId}/invite`, {
                email: email,
                inviteeEmail: inviteeEmail,
                role: role,
                access: role === "editor" ? "edit" : "view",
                inviterEmail: email
            });
            
            if (response.data.success) {
                await this.fetchUserSessions();
                this.toast({ 
                    title: "Invite Sent", 
                    description: `Invitation sent to ${inviteeEmail}` 
                });
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
            
            this.toast({ 
                title: "Invitation Failed", 
                description: errorMessage,
                variant: "destructive" 
            });
        }
    }

    async removeParticipant(sessionId, participantEmail, email) {
        try {
            const response = await apiClient.post(`/sessions/${sessionId}/remove-participant`, {
                email: email,
                participantEmail: participantEmail,
                removerEmail: email
            });
            
            if (response.data.success) {
                await this.fetchUserSessions();
                this.toast({ 
                    title: "Participant Removed", 
                    description: `${participantEmail} has been removed from the session` 
                });
            } else {
                throw new Error(response.data.error || 'Failed to remove participant');
            }
            
        } catch (error) {
            console.error("Remove participant failed:", error);
            this.toast({ 
                title: "Failed to Remove Participant", 
                description: error.response?.data?.error || error.message,
                variant: "destructive" 
            });
        }
    }

    async promoteToOwner(sessionId, participantEmail, email) {
        try {
            const response = await apiClient.post(`/sessions/${sessionId}/transfer-ownership`, {
                email: email,
                newOwnerEmail: participantEmail,
                currentOwnerEmail: email
            });
            
            if (response.data.success) {
                await this.fetchUserSessions();
                this.toast({ 
                    title: "Ownership Transferred", 
                    description: `${participantEmail} is now the owner of this session` 
                });
            } else {
                throw new Error(response.data.error || 'Failed to transfer ownership');
            }
            
        } catch (error) {
            console.error("Transfer ownership failed:", error);
            this.toast({ 
                title: "Failed to Transfer Ownership", 
                description: error.response?.data?.error || error.message,
                variant: "destructive" 
            });
        }
    }

    async updateRole(sessionId, participantEmail, newRole, email) {
        try {
            const response = await apiClient.post(`/sessions/${sessionId}/update-role`, {
                email: email,
                participantEmail: participantEmail,
                newRole: newRole,
                updaterEmail: email
            });
            
            if (response.data.success) {
                await this.fetchUserSessions();
                this.toast({ 
                    title: "Role Updated", 
                    description: `${participantEmail}'s role has been updated to ${newRole}` 
                });
            } else {
                throw new Error(response.data.error || 'Failed to update role');
            }
            
        } catch (error) {
            console.error("Update role failed:", error);
            this.toast({ 
                title: "Failed to Update Role", 
                description: error.response?.data?.error || error.message,
                variant: "destructive" 
            });
        }
    }

    async leaveSession(sessionId, email) {
        try {
            const response = await apiClient.post(`/sessions/${sessionId}/leave`, {
                email: email
            });
            
            if (response.data.success) {
                await this.fetchUserSessions();
                this.toast({ 
                    title: "Left Session", 
                    description: "You have left the session" 
                });
            } else {
                throw new Error(response.data.error || 'Failed to leave session');
            }
            
        } catch (error) {
            console.error("Leave session failed:", error);
            this.toast({ 
                title: "Failed to leave session", 
                description: error.response?.data?.error || error.message,
                variant: "destructive" 
            });
        }
    }
}
