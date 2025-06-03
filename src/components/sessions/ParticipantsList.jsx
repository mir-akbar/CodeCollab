import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Eye, Edit2, ShieldAlert, Crown, UserMinus } from "lucide-react";
import { AccessLevelBadge } from "./AccessLevelBadge";
import PropTypes from "prop-types";
import { canManageParticipants, canAssignRole, canTransferOwnership, getAssignableRoles } from '@/utils/permissions';

export const ParticipantsList = ({ 
  participants = [], 
  sessionId = "", 
  currentUserEmail = "",
  currentUserRole = "viewer",
  onUpdateAccess,
  onRemoveParticipant,
  onPromoteToOwner
}) => {
  if (!participants?.length) return null;

  const canManage = canManageParticipants(currentUserRole);
  const assignableRoles = getAssignableRoles(currentUserRole);

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-medium">Participants</h4>
      {participants.map((participant) => {
        const isCurrentUser = participant.email === currentUserEmail;
        const participantRole = participant.role || (participant.access === "edit" ? "editor" : "viewer");
        
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
                onChangeRole={(newRole) => onUpdateAccess(sessionId, participant.email, newRole)}
                onRemove={() => onRemoveParticipant(sessionId, participant.email)}
                onPromoteToOwner={() => onPromoteToOwner(sessionId, participant.email)}
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
  onPromoteToOwner 
}) => {
  const isOwner = currentRole === "owner";
  const canPromoteToOwner = canTransferOwnership(currentUserRole) && !isOwner;
  const canRemove = canAssignRole(currentUserRole, 'viewer'); // Can remove if can assign lowest role

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <AccessLevelBadge role={currentRole} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {!isOwner && assignableRoles.length > 0 && (
          <>
            {assignableRoles.includes('viewer') && (
              <DropdownMenuItem onClick={() => onChangeRole("viewer")}>
                <Eye className="mr-2 h-4 w-4" /> Viewer
              </DropdownMenuItem>
            )}
            {assignableRoles.includes('editor') && (
              <DropdownMenuItem onClick={() => onChangeRole("editor")}>
                <Edit2 className="mr-2 h-4 w-4" /> Editor
              </DropdownMenuItem>
            )}
            {assignableRoles.includes('admin') && (
              <DropdownMenuItem onClick={() => onChangeRole("admin")}>
                <ShieldAlert className="mr-2 h-4 w-4" /> Admin
              </DropdownMenuItem>
            )}
            
            {canPromoteToOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onPromoteToOwner}
                  className="text-purple-600 hover:text-purple-700"
                >
                  <Crown className="mr-2 h-4 w-4" /> Promote to Owner
                </DropdownMenuItem>
              </>
            )}
            
            {canRemove && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onRemove}
                  className="text-red-600 hover:text-red-700"
                >
                  <UserMinus className="mr-2 h-4 w-4" /> Remove from Session
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
  currentUserRole: PropTypes.string,
  onUpdateAccess: PropTypes.func.isRequired,
  onRemoveParticipant: PropTypes.func,
  onPromoteToOwner: PropTypes.func
};

ParticipantManagement.propTypes = {
  currentRole: PropTypes.string.isRequired,
  currentUserRole: PropTypes.string.isRequired,
  assignableRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChangeRole: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onPromoteToOwner: PropTypes.func.isRequired
};