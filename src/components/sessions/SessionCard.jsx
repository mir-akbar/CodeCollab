import { motion } from 'framer-motion';
import { AccessLevelBadge } from './AccessLevelBadge';
import { Button } from '@/components/ui/button';
import { Star, Trash, LogIn, LogOut, Crown, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from "@/components/ui/badge";
import { Users, Calendar } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PropTypes from "prop-types";
import { getUserRole, canDeleteSession, canManageParticipants } from '@/utils/permissions';
import { navigateToSession } from '@/utils/sessionUtils';
import { useDeleteSession, useLeaveSession } from '@/hooks/useSessions';
import { useFavorites } from '@/hooks/useFavorites';
import { toast } from 'sonner';

export const SessionCard = ({ 
  session,
  userEmail,
  onInvite // Keep this for now since it opens a dialog managed by parent
}) => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const deleteSessionMutation = useDeleteSession();
  const leaveSessionMutation = useLeaveSession();
  
  console.log("Session in SessionCard:", session);

  if (!session) {
    console.log("No session object provided to SessionCard");
    return null;
  }

  const participants = session.participants || [];
  const userRole = getUserRole(session, userEmail);
  const isCreator = session.isCreator || session.creator === userEmail;
  const userAccess = session.access;
  const sessionIsFavorite = isFavorite(session.id || session.sessionId);

  // Permission checks using new system
  const permissions = {
    canDelete: canDeleteSession(userRole),
    canInvite: canManageParticipants(userRole),
    canManage: canManageParticipants(userRole)
  };

  // Internal handlers using TanStack Query
  const handleJoin = () => {
    navigateToSession(session);
  };

  const handleDelete = async () => {
    try {
      await deleteSessionMutation.mutateAsync({
        sessionId: session.sessionId || session.id,
        userEmail
      });
      toast.success("Session deleted successfully");
    } catch (error) {
      toast.error(error.message || "Failed to delete session");
    }
  };

  const handleLeave = async () => {
    try {
      await leaveSessionMutation.mutateAsync({
        sessionId: session.sessionId || session.id,
        userEmail
      });
      toast.success("Left session successfully");
    } catch (error) {
      toast.error(error.message || "Failed to leave session");
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite(session.id || session.sessionId);
  };

  return (
    <motion.div 
      className="border rounded-lg p-4 shadow-sm space-y-3 bg-card hover:shadow-md transition-shadow h-[240px] flex flex-col"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Header Section */}
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium truncate">{session.name || "Unnamed Session"}</h3>
            {isCreator && (
              <Badge variant="outline" className="border-purple-500 text-purple-500 shrink-0">
                <Crown className="h-3 w-3 mr-1" />
                Creator
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 h-10">
            {session.description || "No description provided"}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleToggleFavorite}
          className="self-start shrink-0"
        >
          <Star className={`h-5 w-5 ${sessionIsFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
        </Button>
      </div>

      {/* Metadata Section */}
      <div className="flex flex-wrap gap-2">
        <AccessLevelBadge access={userAccess} role={userRole} isCreator={isCreator} />
        <Badge variant="outline" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {participants.length} participant{participants.length !== 1 ? 's' : ''}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {session.createdAt 
            ? new Date(session.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric'
              }) 
            : "Unknown date"}
        </Badge>
      </div>

      {/* Participants Preview */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex -space-x-2">
          {participants.slice(0, 5).map((p, index) => (
            <Tooltip key={p.email || `participant-${index}`}>
              <TooltipTrigger>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {p.name?.[0]?.toUpperCase() || p.email?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{p.name || p.email || "Unknown User"}</p>
                <p className="text-muted-foreground text-xs">{p.access} access</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {participants.length > 5 && (
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs">
              +{participants.length - 5}
            </div>
          )}
        </div>
        {permissions.canInvite && (
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => onInvite(session)}
            className="gap-1"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite</span>
          </Button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-between mt-2">
        <Button
          variant="default"
          onClick={handleJoin}
          className="flex-1 gap-1"
        >
          <LogIn className="h-4 w-4" />
          Join Session
        </Button>
        {permissions.canDelete ? (
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="flex-1 gap-1"
            disabled={deleteSessionMutation.isPending}
          >
            <Trash className="h-4 w-4" />
            {deleteSessionMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleLeave}
            className="flex-1 gap-1 text-destructive hover:text-destructive-foreground hover:bg-destructive"
            disabled={leaveSessionMutation.isPending}
          >
            <LogOut className="h-4 w-4" />
            {leaveSessionMutation.isPending ? "Leaving..." : "Leave"}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

SessionCard.propTypes = {
  session: PropTypes.shape({
    id: PropTypes.string,  // Either id or sessionId should be present
    sessionId: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    creator: PropTypes.string,
    isCreator: PropTypes.bool,
    access: PropTypes.string,
    role: PropTypes.string,
    participants: PropTypes.array,
    createdAt: PropTypes.string
  }).isRequired,
  userEmail: PropTypes.string.isRequired,
  onInvite: PropTypes.func.isRequired // Keep for dialog management
};
