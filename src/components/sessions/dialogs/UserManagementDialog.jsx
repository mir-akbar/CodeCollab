/**
 * UserManagementDialog Component
 * 
 * Dialog component for managing session participants including viewing participants,
 * updating roles, removing participants, and inviting new users.
 * 
 * @component
 * @version 1.0.0 - Initial implementation with comprehensive user management
 * @since 4.1.0
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.session - Session object with participant data
 * @param {string} props.userEmail - Current user's email for permission checks
 * @param {React.ReactNode} props.children - Trigger element (typically a button)
 * @param {Function} [props.onInvite] - Optional callback for invite functionality
 * 
 * @example
 * ```jsx
 * <UserManagementDialog 
 *   session={session} 
 *   userEmail="user@example.com"
 *   onInvite={handleInvite}
 * >
 *   <Button>Manage</Button>
 * </UserManagementDialog>
 * ```
 */
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Crown, Shield, Edit, Eye, Trash2, MoreVertical, UserPlus } from 'lucide-react';
import { useSessionParticipants, useUpdateRole, useRemoveParticipant } from '@/hooks/useSessions';
import { getUserRole, canManageParticipants, getRoleDisplayName } from '@/utils/permissions';
import { toast } from 'sonner';
import PropTypes from 'prop-types';

/**
 * Role configuration with display properties
 */
const roleConfig = {
  owner: { label: 'Owner', icon: Crown, color: 'text-yellow-500' },
  admin: { label: 'Admin', icon: Shield, color: 'text-red-500' },
  editor: { label: 'Editor', icon: Edit, color: 'text-blue-500' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-muted-foreground' },
};

export const UserManagementDialog = ({ 
  session, 
  userEmail, 
  children, 
  onInvite 
}) => {
  const [userToRemove, setUserToRemove] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const sessionId = session?.sessionId || session?.id;
  const currentUserRole = getUserRole(session, userEmail);
  const canManage = canManageParticipants(currentUserRole);
  
  // Fetch participants data
  const { data: participants = [], isLoading: participantsLoading, refetch } = useSessionParticipants(
    sessionId,
    { enabled: !!sessionId && isOpen }
  );
  
  // Mutations for participant management
  const updateRoleMutation = useUpdateRole();
  const removeParticipantMutation = useRemoveParticipant();

  /**
   * Handles role change for a participant
   * @param {string} participantEmail - Email of participant to update
   * @param {string} newRole - New role to assign
   */
  const handleRoleChange = async (participantEmail, newRole) => {
    if (!canManage) {
      toast.error('You do not have permission to manage participants');
      return;
    }

    try {
      await updateRoleMutation.mutateAsync({
        sessionId,
        participantEmail,
        newRole,
        userEmail
      });
      toast.success(`Role updated to ${getRoleDisplayName(newRole)}`);
      refetch();
    } catch (error) {
      toast.error(error.message || 'Failed to update role');
    }
  };

  /**
   * Handles participant removal
   * @param {string} participantEmail - Email of participant to remove
   */
  const handleRemoveParticipant = async (participantEmail) => {
    if (!canManage) {
      toast.error('You do not have permission to remove participants');
      return;
    }

    try {
      await removeParticipantMutation.mutateAsync({
        sessionId,
        participantEmail,
        userEmail
      });
      toast.success('Participant removed successfully');
      setUserToRemove(null);
      refetch();
    } catch (error) {
      toast.error(error.message || 'Failed to remove participant');
    }
  };

  /**
   * Handles invite functionality
   */
  const handleInvite = () => {
    if (onInvite) {
      onInvite(session);
    } else {
      toast.info('Invite functionality not implemented');
    }
  };

  /**
   * Gets user initials for avatar fallback
   * @param {string} name - User's name
   * @returns {string} Initials
   */
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  /**
   * Determines if a participant is the session owner
   * @param {Object} participant - Participant object
   * @returns {boolean} True if participant is owner
   */
  const isOwner = (participant) => {
    return participant.email === session?.creator || participant.role === 'owner';
  };

  /**
   * Determines if current user can manage a specific participant
   * @param {Object} participant - Participant object
   * @returns {boolean} True if participant can be managed
   */
  const canManageParticipant = (participant) => {
    if (!canManage) return false;
    if (participant.email === userEmail) return false; // Can't manage self
    if (isOwner(participant)) return false; // Can't manage owner
    return true;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-base font-medium">
              {session?.name || 'Session'} - Participants
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Manage participants, update roles, and invite new members to this session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1 max-h-[320px] overflow-y-auto">
            {participantsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading participants...</div>
              </div>
            ) : participants.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">No participants found</div>
              </div>
            ) : (
              participants.map((participant) => {
                const participantRole = participant.role || (participant.access === 'edit' ? 'editor' : 'viewer');
                const RoleIcon = roleConfig[participantRole]?.icon || Eye;
                const canManageThisParticipant = canManageParticipant(participant);

                return (
                  <div 
                    key={participant.email} 
                    className="flex items-center gap-3 py-2 px-1 hover:bg-accent/50 rounded"
                  >
                    <div className="relative">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={participant.avatar} alt={participant.name || participant.email} />
                        <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                          {getInitials(participant.name || participant.email)}
                        </AvatarFallback>
                      </Avatar>
                      {participant.isOnline && (
                        <div className="absolute -bottom-0 -right-0 w-2 h-2 bg-green-500 rounded-full border border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {participant.name || participant.email}
                        {participant.email === userEmail && (
                          <span className="text-xs text-muted-foreground ml-1">(You)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {participant.email}
                      </div>
                    </div>

                    <RoleIcon 
                      className={`h-4 w-4 ${roleConfig[participantRole]?.color || 'text-muted-foreground'}`} 
                    />

                    {canManageThisParticipant && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(participant.email, 'viewer')}
                            className="text-xs cursor-pointer hover:bg-accent focus:bg-accent"
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            Viewer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(participant.email, 'editor')}
                            className="text-xs cursor-pointer hover:bg-accent focus:bg-accent"
                          >
                            <Edit className="h-3 w-3 mr-2" />
                            Editor
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(participant.email, 'admin')}
                            className="text-xs cursor-pointer hover:bg-accent focus:bg-accent"
                          >
                            <Shield className="h-3 w-3 mr-2" />
                            Admin
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setUserToRemove(participant)}
                            className="text-xs text-destructive focus:text-destructive cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-xs text-muted-foreground">
              {participants.length} member{participants.length !== 1 ? 's' : ''}
            </span>
            {canManage && (
              <Button 
                size="sm" 
                className="h-7 text-xs" 
                onClick={handleInvite}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Invite
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Remove {userToRemove?.name || userToRemove?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              They will lose access to this session immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToRemove && handleRemoveParticipant(userToRemove.email)}
              className="bg-destructive hover:bg-destructive/90 h-8 text-xs"
              disabled={removeParticipantMutation.isPending}
            >
              {removeParticipantMutation.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/**
 * PropTypes validation for UserManagementDialog component
 */
UserManagementDialog.propTypes = {
  /** Session object with participant data */
  session: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    sessionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string.isRequired,
    creator: PropTypes.string.isRequired,
    participants: PropTypes.arrayOf(PropTypes.object)
  }).isRequired,
  
  /** Current user's email for permission checks */
  userEmail: PropTypes.string.isRequired,
  
  /** Trigger element (typically a button) */
  children: PropTypes.node.isRequired,
  
  /** Optional callback for invite functionality */
  onInvite: PropTypes.func
};

export default UserManagementDialog;
