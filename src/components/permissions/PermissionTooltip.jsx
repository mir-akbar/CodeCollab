// Permission tooltip for a better UX with the role permission system

import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';
import { hasPermission } from '@/utils/permissions';

/**
 * Permission-aware tooltip component
 * Wraps UI elements that might be permission-restricted and shows helpful tooltips
 */
export const PermissionTooltip = ({
  children,
  userRole,
  requiredAction,
  tooltipContent,
  showIcon = true,
  side = 'bottom',
  className = '',
}) => {
  const hasRequiredPermission = hasPermission(userRole, requiredAction);
  
  // If user has required permission, just render the children
  if (hasRequiredPermission) {
    return children;
  }
  
  // If no permission, show tooltip with permission message
  const message = tooltipContent || 
    `This action requires ${requiredAction} permission. Your role (${userRole}) does not have this permission.`;
    
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className={`relative ${className} cursor-not-allowed opacity-70`}>
            {children}
            {showIcon && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                <Lock className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side={side} className="bg-black border-gray-700 text-white z-50 max-w-xs">
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

PermissionTooltip.propTypes = {
  children: PropTypes.node.isRequired,
  userRole: PropTypes.string.isRequired,
  requiredAction: PropTypes.string.isRequired,
  tooltipContent: PropTypes.string,
  showIcon: PropTypes.bool,
  side: PropTypes.string,
  className: PropTypes.string
};
