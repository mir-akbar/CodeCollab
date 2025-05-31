import { Badge } from "@/components/ui/badge";
import { Crown, Eye, Edit2, ShieldAlert } from "lucide-react";
import PropTypes from "prop-types";

export const AccessLevelBadge = ({ access = "view", isCreator = false }) => {
  if (isCreator) {
    return (
      <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">
        <Crown className="h-3 w-3 mr-1" />
        Creator
      </Badge>
    );
  }

  switch (access) {
    case "admin":
      return (
        <Badge variant="default" className="bg-red-600 hover:bg-red-700">
          <ShieldAlert className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    case "edit":
      return (
        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
          <Edit2 className="h-3 w-3 mr-1" />
          Edit
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-gray-500 bg-transparent text-gray-300 hover:bg-gray-800">
          <Eye className="h-3 w-3 mr-1" />
          View
        </Badge>
      );
  }
};

AccessLevelBadge.propTypes = {
  access: PropTypes.string,
  isCreator: PropTypes.bool
};