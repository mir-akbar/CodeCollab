import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * PendingInvitationsSkeleton Component
 * 
 * Loading skeleton for the PendingInvitations component.
 * Shows animated placeholders that match the structure of invitation cards.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} [props.itemCount=2] - Number of skeleton invitation cards to show
 * 
 * @example
 * ```jsx
 * <PendingInvitationsSkeleton itemCount={3} />
 * ```
 */
export function PendingInvitationsSkeleton({ itemCount = 1 }) {
  return (
    <Card className="bg-[#1e1e1e] border-[#444] text-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock size={18} />
          Pending Invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[...Array(itemCount)].map((_, index) => (
          <InvitationCardSkeleton key={`invitation-skeleton-${index}`} />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * InvitationCardSkeleton Component
 * 
 * Individual invitation card skeleton that matches the structure of InvitationCard.
 * Includes placeholders for session name, description, date, role badge, and action buttons.
 */
function InvitationCardSkeleton() {
  return (
    <div className="p-3 rounded-lg bg-[#2d2d2d] border border-[#444]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 space-y-2">
          {/* Session name */}
          <Skeleton className="h-5 w-40" />
          
          {/* Session description and date */}
          <div className="space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        
        {/* Role badge */}
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 flex-1 rounded-md" /> {/* Accept button */}
        <Skeleton className="h-8 flex-1 rounded-md" /> {/* Decline button */}
      </div>
    </div>
  );
}

// PropTypes
PendingInvitationsSkeleton.propTypes = {
  itemCount: PropTypes.number
};

export default PendingInvitationsSkeleton;
