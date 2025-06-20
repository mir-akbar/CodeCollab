import { ParticipantAvatar } from './ParticipantAvatar';
import { RoleBadge } from './RoleBadge';
import { UserPlus, Mail, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { InvitationDialog } from '@/components/sessions/dialogs/InvitationDialog';
import { UserManagementDialog } from '@/components/sessions/dialogs/UserManagementDialog';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { useDialogStore } from '@/stores';
import { useUser } from '@/contexts/UserContext';
import { useSessionActions } from '@/hooks/sessions';
import { getUserRole, canManageParticipants } from '@/utils/permissions';

export function CollaborationContent({ sessionData, participants, sessionId, onRefresh, onlineUserCount }) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const { 
    pendingInvitations: { processingInvitation: acceptingInvitation },
    setProcessingInvitation
  } = useDialogStore();
  const { userEmail } = useUser();
  const { joinSession } = useSessionActions();

  if (!sessionData) {
    return (
      <div className="text-center text-gray-400">
        <div>Loading session data...</div>
        {onlineUserCount > 0 && (
          <div className="text-sm mt-2">
            {onlineUserCount} user{onlineUserCount !== 1 ? 's' : ''} currently active
          </div>
        )}
      </div>
    );
  }

  // Use permission utility functions instead of hardcoded role checks
  const currentUserRole = getUserRole(sessionData, userEmail);
  const canInvite = canManageParticipants(currentUserRole);

  const handleAcceptInvitation = async (participantSessionId) => {
    setProcessingInvitation(participantSessionId);
    try {
      const result = await joinSession(participantSessionId);
      if (result.success) {
        alert('✅ Successfully joined the session!');
        onRefresh();
      } else {
        alert(`❌ Failed to join session: ${result.error}`);
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      alert('❌ Failed to accept invitation. Please try again.');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'invited':
        return 'bg-yellow-500';
      case 'left':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const activeParticipants = participants.filter(p => p.status === 'active');
  const invitedParticipants = participants.filter(p => p.status === 'invited');

  return (
    <div className="space-y-4">
      {/* Session Info */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Session: {sessionData.name}</h3>
        <p className="text-xs text-gray-400">
          Created by {sessionData.creator ? (sessionData.creator === userEmail ? 'you' : (sessionData.creatorName || sessionData.creator)) : 'Unknown'}
        </p>
        <p className="text-xs text-gray-400">
          Your role: {currentUserRole}
        </p>
        {onlineUserCount > 0 && (
          <p className="text-xs text-green-400">
            👥 {onlineUserCount} user{onlineUserCount !== 1 ? 's' : ''} currently active
          </p>
        )}
      </div>

      <Separator className="bg-[#444]" />

      {/* Active Participants */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            Active Participants ({activeParticipants.length})
          </h3>
          {canInvite && activeParticipants.length > 0 && (
            <UserManagementDialog 
              session={sessionData} 
              userEmail={userEmail}
              onInvite={() => setIsInviteDialogOpen(true)}
            >
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </UserManagementDialog>
          )}
        </div>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {activeParticipants.length > 0 ? (
            activeParticipants.map((participant, index) => (
              <div key={participant.email || participant.userEmail || `active-${index}`} className="flex items-center gap-3 p-2 rounded bg-[#2d2d2d]">
                <div className="relative">
                  <ParticipantAvatar participant={participant} />
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#2d2d2d] ${getStatusColor(participant.status)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {participant.name || participant.displayName || participant.userName || (participant.email || participant.userEmail ? (participant.email || participant.userEmail).split('@')[0] : 'Unknown')}
                    {(participant.email || participant.userEmail) === userEmail && ' (you)'}
                    {participant.profile && participant.profile.bio && (
                      <span className="block text-xs text-gray-400 truncate">{participant.profile.bio}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{participant.email || participant.userEmail || 'No email'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={participant.role} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm">
              {onlineUserCount > 0 
                ? `${onlineUserCount} user${onlineUserCount !== 1 ? 's' : ''} online but not in participant list`
                : 'No active participants'
              }
            </p>
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitedParticipants.length > 0 && (
        <>
          <Separator className="bg-[#444]" />
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              Pending Invitations ({invitedParticipants.length})
            </h3>
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {invitedParticipants.map((participant, index) => (
                <div key={participant.email || participant.userEmail || `invited-${index}`} className="flex items-center gap-3 p-2 rounded bg-[#2d2d2d] opacity-75">
                  <div className="relative">
                    <ParticipantAvatar participant={participant} />
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#2d2d2d] ${getStatusColor(participant.status)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">
                      {participant.name || participant.userName || (participant.email || participant.userEmail ? (participant.email || participant.userEmail).split('@')[0] : 'Pending user')}
                    </div>
                    <div className="text-xs text-gray-400">{participant.email || participant.userEmail}</div>
                    <div className="text-xs text-gray-400">Invitation pending</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={participant.role} />
                    {(participant.email || participant.userEmail) === userEmail && (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptInvitation(participant.sessionId || sessionId)}
                        disabled={acceptingInvitation === (participant.sessionId || sessionId)}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1"
                      >
                        {acceptingInvitation === (participant.sessionId || sessionId) ? 'Joining...' : 'Accept'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Invite New User */}
      {canInvite && (
        <>
          <Separator className="bg-[#444]" />
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <UserPlus size={16} />
              Invite Collaborator
            </h3>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsInviteDialogOpen(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Mail size={16} className="mr-2" />
                Send Invitation
              </Button>
              <UserManagementDialog 
                session={sessionData} 
                userEmail={userEmail}
                onInvite={() => setIsInviteDialogOpen(true)}
              >
                <Button 
                  variant="outline" 
                  className="px-3 border-[#555] hover:bg-[#3a3a3a]"
                >
                  <Settings size={16} />
                </Button>
              </UserManagementDialog>
            </div>
          </div>
        </>
      )}

      {/* Invitation Dialog */}
      <InvitationDialog
        open={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        onSuccess={() => {
          setIsInviteDialogOpen(false);
          onRefresh();
        }}
        session={sessionData}
      />
    </div>
  );
}

CollaborationContent.propTypes = {
  sessionData: PropTypes.object,
  participants: PropTypes.array,
  sessionId: PropTypes.string,
  onRefresh: PropTypes.func,
  onlineUserCount: PropTypes.number
};
