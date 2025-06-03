import React from 'react';
import PropTypes from 'prop-types';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, Edit, Eye } from 'lucide-react';
import { getRoleDisplayName } from '@/utils/permissions';

/**
 * Role badge component for consistent role visualization
 */
export const RoleBadge = ({ role, size = 'default' }) => {
  const getRoleIcon = () => {
    switch (role) {
      case 'owner':
        return <Crown className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />;
      case 'admin':
        return <Shield className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />;
      case 'editor':
        return <Edit className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />;
      case 'viewer':
        return <Eye className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />;
      default:
        return <Eye className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />;
    }
  };

  const getRoleBadgeVariant = () => {
    switch (role) {
      case 'owner':
        return 'yellow';
      case 'admin':
        return 'orange';
      case 'editor':
        return 'blue';
      case 'viewer':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getBadgeClasses = () => {
    const baseClasses = 'inline-flex items-center gap-1';
    const sizeClasses = size === 'sm' ? 'text-xs py-0 px-1.5' : 'text-sm py-1 px-2';
    
    switch (getRoleBadgeVariant()) {
      case 'yellow':
        return `${baseClasses} ${sizeClasses} bg-yellow-500/20 text-yellow-400 border border-yellow-500/30`;
      case 'orange':
        return `${baseClasses} ${sizeClasses} bg-orange-500/20 text-orange-400 border border-orange-500/30`;
      case 'blue':
        return `${baseClasses} ${sizeClasses} bg-blue-500/20 text-blue-400 border border-blue-500/30`;
      case 'gray':
      default:
        return `${baseClasses} ${sizeClasses} bg-gray-500/20 text-gray-400 border border-gray-500/30`;
    }
  };

  return (
    <Badge className={getBadgeClasses()} variant="outline">
      {getRoleIcon()}
      <span>{getRoleDisplayName(role)}</span>
    </Badge>
  );
};

RoleBadge.propTypes = {
  role: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['default', 'sm'])
};
