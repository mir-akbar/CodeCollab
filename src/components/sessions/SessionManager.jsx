/**
 * Clean Session Manager - Core Demo Component
 * 
 * Simplified, focused session management interface:
 * - List sessions
 * - Create sessions
 * - Invite users (core demo feature)
 * - Clean, modern UI
 * 
 * @version 3.0.0 - Fresh start for demo
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Search, 
  Users, 
  Calendar,
  ExternalLink,
  Trash2,
  UserPlus,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { CreateSessionDialog } from './CreateSessionDialog';
import { InvitationDialog } from './InvitationDialog';
import { 
  useSessions, 
  useDeleteSession, 
  useLeaveSession 
} from '../../hooks/useSessions';
import { formatDate } from '../../utils/dateUtils';
import { navigateToSession } from '../../utils/sessionUtils';
import PropTypes from 'prop-types';

export function SessionManager({ userEmail }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [invitationDialog, setInvitationDialog] = useState({
    open: false,
    session: null
  });

  // Hooks
  const { data: sessions = [], isLoading, error, refetch } = useSessions();
  const deleteSession = useDeleteSession();
  const leaveSession = useLeaveSession();

  // Filter sessions based on search
  const filteredSessions = sessions.filter(session =>
    session.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSession = () => {
    setIsCreateDialogOpen(true);
  };

  const handleInviteUser = (session) => {
    setInvitationDialog({
      open: true,
      session: session
    });
  };

  const handleJoinSession = (session) => {
    navigateToSession(session);
  };

  const handleDeleteSession = async (session) => {
    if (!confirm(`Are you sure you want to delete "${session.name}"?`)) {
      return;
    }

    try {
      await deleteSession.mutateAsync(session.sessionId || session.id);
      toast.success('Session deleted successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to delete session');
    }
  };

  const handleLeaveSession = async (session) => {
    if (!confirm(`Are you sure you want to leave "${session.name}"?`)) {
      return;
    }

    try {
      await leaveSession.mutateAsync(session.sessionId || session.id);
      toast.success('Left session successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to leave session');
    }
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Sessions refreshed');
    } catch {
      toast.error('Failed to refresh sessions');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800';
      case 'editor': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium text-destructive mb-2">
          Failed to load sessions
        </p>
        <p className="text-muted-foreground mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Collaboration Sessions</h1>
          <p className="text-muted-foreground">
            Manage your coding sessions and collaborations
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateSession}>
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sessions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchTerm ? 'No sessions found' : 'No sessions yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Create your first session to start collaborating'
            }
          </p>
          {!searchTerm && (
            <Button onClick={handleCreateSession}>
              <Plus className="h-4 w-4 mr-2" />
              Create Session
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => {
            const isOwner = session.isCreator || session.creator === userEmail;
            const userRole = session.userRole || (isOwner ? 'owner' : 'viewer');
            
            return (
              <Card key={session.id || session.sessionId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">
                        {session.name || 'Untitled Session'}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={getRoleColor(userRole)}>
                          {userRole}
                        </Badge>
                        {isOwner && (
                          <Badge variant="outline">
                            Creator
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {session.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {session.description}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {/* Session Info */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{session.participants?.length || 0} participants</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(session.createdAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleJoinSession(session)}
                        className="flex-1"
                        size="sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Join
                      </Button>
                      
                      <Button
                        onClick={() => handleInviteUser(session)}
                        variant="outline"
                        size="sm"
                        title="Invite Users"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>

                      {isOwner ? (
                        <Button
                          onClick={() => handleDeleteSession(session)}
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          title="Delete Session"
                          disabled={deleteSession.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleLeaveSession(session)}
                          variant="outline"
                          size="sm"
                          className="text-orange-600 hover:bg-orange-50"
                          title="Leave Session"
                          disabled={leaveSession.isPending}
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateSessionDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        userEmail={userEmail}
      />
      
      <InvitationDialog
        open={invitationDialog.open}
        onClose={() => setInvitationDialog({ open: false, session: null })}
        session={invitationDialog.session}
      />
    </div>
  );
}

SessionManager.propTypes = {
  userEmail: PropTypes.string.isRequired
};
