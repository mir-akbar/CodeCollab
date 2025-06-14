import { useState } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/contexts/UserContext';
import { usePendingInvitations, useSessionActions } from '@/hooks/sessions';
import { toast } from 'sonner';
import PropTypes from 'prop-types';
import { PendingInvitationsSkeleton } from './PendingInvitationsSkeleton';

/**
 * PendingInvitations Component
 * 
 * Displays user's pending session invitations with accept/reject functionality
 * @param {Object} props - Component props
 * @param {string} [props.userEmail] - User email, will use UserContext if not provided
 * @param {boolean} [props.showSkeleton] - Force skeleton display for loading states
 * @param {Object} [props.invitationsQuery] - Pre-fetched invitations query result (for coordinated loading)
 */
export function PendingInvitations({ userEmail: propUserEmail, showSkeleton = false, invitationsQuery }) {
  const { userEmail: contextUserEmail } = useUser();
  const userEmail = propUserEmail || contextUserEmail;
  
  // Use provided query if available (coordinated mode), otherwise fetch independently
  const independentQuery = usePendingInvitations(userEmail);
  const query = invitationsQuery || independentQuery;
  
  const { data: invitations, isLoading, isFetching, error, refetch } = query;
  const { joinSession, rejectInvitation } = useSessionActions();
  const [processingInvitation, setProcessingInvitation] = useState(null);

  const handleAcceptInvitation = async (invitation) => {
    setProcessingInvitation(invitation.sessionId);
    try {
      const result = await joinSession(invitation.sessionId);
      if (result.success) {
        toast.success(`Successfully joined "${invitation.session?.name || 'session'}"!`);
        refetch(); // Refresh invitations list
      } else {
        toast.error(`Failed to join session: ${result.error}`);
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast.error('Failed to accept invitation. Please try again.');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejectInvitation = async (invitation) => {
    setProcessingInvitation(invitation.sessionId);
    try {
      const result = await rejectInvitation(invitation.sessionId);
      if (result.success) {
        toast.success(`Declined invitation to "${invitation.session?.name || 'session'}"`);
        refetch(); // Refresh invitations list
      } else {
        toast.error(`Failed to decline invitation: ${result.error}`);
      }
    } catch (error) {
      console.error("Error rejecting invitation:", error);
      toast.error('Failed to decline invitation. Please try again.');
    } finally {
      setProcessingInvitation(null);
    }
  };

  // Show skeleton during different loading states:
  // - showSkeleton: Manual refresh from SessionManager 
  // - isLoading: Initial load or hard refresh
  // - isFetching: Auto-refresh (background refetch every 30 seconds)
  if (showSkeleton || isLoading || isFetching) {
    return <PendingInvitationsSkeleton itemCount={showSkeleton ? 1 : 1} />;
  }

  if (error) {
    return (
      <Card className="bg-[#1e1e1e] border-[#444] text-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={18} />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-400">
            Failed to load invitations: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <Card className="bg-[#1e1e1e] border-[#444] text-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={18} />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400">
            No pending invitations
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1e1e1e] border-[#444] text-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock size={18} />
          Pending Invitations ({invitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((invitation) => (
          <InvitationCard
            key={`${invitation.sessionId}-${invitation.cognitoId}`}
            invitation={invitation}
            onAccept={() => handleAcceptInvitation(invitation)}
            onReject={() => handleRejectInvitation(invitation)}
            isProcessing={processingInvitation === invitation.sessionId}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Individual invitation card component
 */
function InvitationCard({ invitation, onAccept, onReject, isProcessing }) {
  const getRoleColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'admin':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'editor':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'viewer':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className="p-3 rounded-lg bg-[#2d2d2d] border border-[#444]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-white mb-1">
            {invitation.session?.name || 'Untitled Session'}
          </h4>
          <div className="text-sm text-gray-400 space-y-1">
            {invitation.session?.description && (
              <p className="truncate">{invitation.session.description}</p>
            )}
            <p>Invited on {formatDate(invitation.createdAt)}</p>
          </div>
        </div>
        <Badge className={`text-xs ${getRoleColor(invitation.role)}`}>
          {invitation.role}
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onAccept}
          disabled={isProcessing}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          <Check size={14} className="mr-1" />
          {isProcessing ? 'Joining...' : 'Accept'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={isProcessing}
          className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
        >
          <X size={14} className="mr-1" />
          Decline
        </Button>
      </div>
    </div>
  );
}

// PropTypes
PendingInvitations.propTypes = {
  userEmail: PropTypes.string,
  showSkeleton: PropTypes.bool,
  invitationsQuery: PropTypes.object // Optional pre-fetched query result for coordinated loading
};

InvitationCard.propTypes = {
  invitation: PropTypes.shape({
    sessionId: PropTypes.string.isRequired,
    cognitoId: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    createdAt: PropTypes.string,
    session: PropTypes.shape({
      name: PropTypes.string,
      description: PropTypes.string,
      sessionId: PropTypes.string
    })
  }).isRequired,
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  isProcessing: PropTypes.bool.isRequired
};
