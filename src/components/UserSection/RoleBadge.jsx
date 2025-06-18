import { Crown, Shield, Edit, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PropTypes from 'prop-types';

export function RoleBadge({ role }) {
  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown size={14} className="text-yellow-500" />;
      case 'admin':
        return <Shield size={14} className="text-orange-500" />;
      case 'editor':
        return <Edit size={14} className="text-blue-500" />;
      case 'viewer':
      default:
        return <Eye size={14} className="text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'admin':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'editor':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'viewer':
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <Badge className={`text-xs ${getRoleBadgeColor(role)}`}>
      <span className="flex items-center gap-1">
        {getRoleIcon(role)}
        {role}
      </span>
    </Badge>
  );
}

RoleBadge.propTypes = {
  role: PropTypes.oneOf(['owner', 'admin', 'editor', 'viewer']).isRequired,
};
