import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, Info } from "lucide-react";
import PropTypes from "prop-types";

export const SessionStatusBadge = ({ status = "unknown" }) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    case "inactive":
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Inactive
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <Info className="h-3 w-3 mr-1" />
          Unknown
        </Badge>
      );
  }
};

SessionStatusBadge.propTypes = {
  status: PropTypes.string
};