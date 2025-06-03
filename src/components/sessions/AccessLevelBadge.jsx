import { Badge } from "@/components/ui/badge";
import { Crown, Eye, Edit2, ShieldAlert } from "lucide-react";
import PropTypes from "prop-types";

export const AccessLevelBadge = ({ access = "viewer", role = null, isCreator = false }) => {
  // Priority: role > isCreator > access
  const displayRole = role || (isCreator ? "owner" : null);
  const displayAccess = displayRole || access;

  switch (displayAccess) {
    case "owner":
      return (
        <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">
          <Crown className="h-3 w-3 mr-1" />
          Owner
        </Badge>
      );
    case "admin":
      return (
        <Badge variant="default" className="bg-red-600 hover:bg-red-700">
          <ShieldAlert className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    case "editor":
    case "edit": // Backward compatibility
      return (
        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
          <Edit2 className="h-3 w-3 mr-1" />
          Editor
        </Badge>
      );
    case "viewer":
    case "view": // Backward compatibility
    default:
      return (
        <Badge variant="outline" className="border-gray-500 bg-transparent text-gray-300 hover:bg-gray-800">
          <Eye className="h-3 w-3 mr-1" />
          Viewer
        </Badge>
      );
  }
};

AccessLevelBadge.propTypes = {
  access: PropTypes.string,
  role: PropTypes.string,
  isCreator: PropTypes.bool
};