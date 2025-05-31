import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Eye, Edit2, ShieldAlert } from "lucide-react";
import { AccessLevelBadge } from "./AccessLevelBadge";
import PropTypes from "prop-types";

export const ParticipantsList = ({ 
  participants = [], 
  sessionId = "", 
  onUpdateAccess 
}) => {
  if (!participants?.length) return null;

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-medium">Participants</h4>
      {participants.map((participant) => (
        <div key={participant.email} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback>{participant.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{participant.name || participant.email}</span>
          </div>
          <AccessDropdown
            currentAccess={participant.access}
            onSelect={(newAccess) => 
              onUpdateAccess(sessionId, participant.email, newAccess)
            }
          />
        </div>
      ))}
    </div>
  );
};

const AccessDropdown = ({ currentAccess = "view", onSelect }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm">
        <AccessLevelBadge access={currentAccess} />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => onSelect("view")}>
        <Eye className="mr-2 h-4 w-4" /> View
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onSelect("edit")}>
        <Edit2 className="mr-2 h-4 w-4" /> Edit
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onSelect("admin")}>
        <ShieldAlert className="mr-2 h-4 w-4" /> Admin
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

ParticipantsList.propTypes = {
  participants: PropTypes.arrayOf(
    PropTypes.shape({
      email: PropTypes.string.isRequired,
      name: PropTypes.string,
      access: PropTypes.string
    })
  ),
  sessionId: PropTypes.string,
  onUpdateAccess: PropTypes.func.isRequired
};

AccessDropdown.propTypes = {
  currentAccess: PropTypes.string,
  onSelect: PropTypes.func.isRequired
};