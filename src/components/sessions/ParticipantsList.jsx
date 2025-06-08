import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Eye, Edit2, ShieldAlert, Crown, UserMinus } from "lucide-react";
import { AccessLevelBadge } from "./AccessLevelBadge";
import PropTypes from "prop-types";
import { canManageParticipants, canAssignRole, canTransferOwnership, getAssignableRoles } from '@/utils/permissions';
import { useRemoveParticipant, usePromoteToOwner, useUpdateRole } from '@/hooks/useSessions';
import { toast } from 'sonner';

export const ParticipantsList = ({ 
  participants = [], 
  sessionId = "", 
  currentUserEmail = "",
  currentUserRole = "viewer"
}) => {
  
  // TanStack Query mutations for participant management
  const removeParticipantMutation = useRemoveParticipant();
  const promoteToOwnerMutation = usePromoteToOwner();
  const updateRoleMutation = useUpdateRole();
  
  if (!participants?.length) return null;

  const canManage = canManageParticipants(currentUserRole);
  const assignableRoles = getAssignableRoles(currentUserRole);

  // Internal handlers using TanStack Query
  const handleUpdateAccess = async (participantEmail, newRole) => {
    try {
      await updateRoleMutation.mutateAsync({
        sessionId,
        participantEmail,
        newRole
      });
      toast.success(`Updated participant role to ${newRole}`);
    } catch (error) {
      toast.error(error.message || "Failed to update participant role");
    }
  };

  const handleRemoveParticipant = async (participantEmail) => {
    try {
      await removeParticipantMutation.mutateAsync({
        sessionId,
        participantEmail
      });
      toast.success("Participant removed successfully");
    } catch (error) {
      toast.error(error.message || "Failed to remove participant");
    }
  };

  const handlePromoteToOwner = async (participantEmail) => {
    try {
      await promoteToOwnerMutation.mutateAsync({
        sessionId,
        participantEmail
      });
      toast.success("Participant promoted to owner successfully");
    } catch (error) {
      toast.error(error.message || "Failed to promote participant");
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-medium">Participants</h4>
      {participants.map((participant) => {
        const isCurrentUser = participant.email === currentUserEmail;
        const participantRole = participant.role || "viewer";
        
        return (
          <div key={participant.email} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback>{participant.name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{participant.name || participant.email}</span>
              {isCurrentUser && <span className="text-xs text-gray-500">(You)</span>}
            </div>
            
            {canManage && !isCurrentUser ? (
              <ParticipantManagement
                currentRole={participantRole}
                currentUserRole={currentUserRole}
                assignableRoles={assignableRoles}
                onChangeRole={(newRole) => handleUpdateAccess(participant.email, newRole)}
                onRemove={() => handleRemoveParticipant(participant.email)}
                onPromoteToOwner={() => handlePromoteToOwner(participant.email)}
                isLoading={{
                  updating: updateRoleMutation.isPending,
                  removing: removeParticipantMutation.isPending,
                  promoting: promoteToOwnerMutation.isPending
                }}
              />
            ) : (
              <AccessLevelBadge 
                role={participantRole}
                access={participant.access} 
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const ParticipantManagement = ({ 
  currentRole, 
  currentUserRole,
  assignableRoles,
  onChangeRole, 
  onRemove, 
  onPromoteToOwner,
  isLoading = {}
}) => {
  const isOwner = currentRole === "owner";
  const canPromoteToOwner = canTransferOwnership(currentUserRole) && !isOwner;
  const canRemove = canAssignRole(currentUserRole, 'viewer'); // Can remove if can assign lowest role

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isLoading.updating || isLoading.removing || isLoading.promoting}>
          <AccessLevelBadge role={currentRole} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {!isOwner && assignableRoles.length > 0 && (
          <>
            {assignableRoles.includes('viewer') && (
              <DropdownMenuItem 
                onClick={() => onChangeRole("viewer")}
                disabled={isLoading.updating}
              >
                <Eye className="mr-2 h-4 w-4" /> {isLoading.updating ? "Updating..." : "Viewer"}
              </DropdownMenuItem>
            )}
            {assignableRoles.includes('editor') && (
              <DropdownMenuItem 
                onClick={() => onChangeRole("editor")}
                disabled={isLoading.updating}
              >
                <Edit2 className="mr-2 h-4 w-4" /> {isLoading.updating ? "Updating..." : "Editor"}
              </DropdownMenuItem>
            )}
            {assignableRoles.includes('admin') && (
              <DropdownMenuItem 
                onClick={() => onChangeRole("admin")}
                disabled={isLoading.updating}
              >
                <ShieldAlert className="mr-2 h-4 w-4" /> {isLoading.updating ? "Updating..." : "Admin"}
              </DropdownMenuItem>
            )}
            
            {canPromoteToOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onPromoteToOwner}
                  className="text-purple-600 hover:text-purple-700"
                  disabled={isLoading.promoting}
                >
                  <Crown className="mr-2 h-4 w-4" /> {isLoading.promoting ? "Promoting..." : "Promote to Owner"}
                </DropdownMenuItem>
              </>
            )}
            
            {canRemove && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onRemove}
                  className="text-red-600 hover:text-red-700"
                  disabled={isLoading.removing}
                >
                  <UserMinus className="mr-2 h-4 w-4" /> {isLoading.removing ? "Removing..." : "Remove from Session"}
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
        
        {isOwner && currentUserRole === "owner" && (
          <DropdownMenuItem disabled>
            <Crown className="mr-2 h-4 w-4" /> Owner (Cannot be changed)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

ParticipantsList.propTypes = {
  participants: PropTypes.arrayOf(
    PropTypes.shape({
      email: PropTypes.string.isRequired,
      name: PropTypes.string,
      access: PropTypes.string,
      role: PropTypes.string
    })
  ),
  sessionId: PropTypes.string,
  currentUserEmail: PropTypes.string,
  currentUserRole: PropTypes.string
};

ParticipantManagement.propTypes = {
  currentRole: PropTypes.string.isRequired,
  currentUserRole: PropTypes.string.isRequired,
  assignableRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChangeRole: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onPromoteToOwner: PropTypes.func.isRequired,
  isLoading: PropTypes.shape({
    updating: PropTypes.bool,
    removing: PropTypes.bool,
    promoting: PropTypes.bool
  })
};