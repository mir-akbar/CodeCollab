import { useState } from 'react';
import { Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import PropTypes from 'prop-types';
import { CollaborationContent } from './CollaborationContent';
import { ParticipantAvatar } from './ParticipantAvatar';

export function CollaborationDialog({ sessionData, participants, activeParticipants, sessionId, onlineUserCount }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    // Force a page refresh to update session data
    window.location.reload();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-[#333] p-2 rounded-md">
          <Users size={18} className="text-gray-400" />
          <div className="flex -space-x-2">
            {activeParticipants && activeParticipants.length > 0 ? (
              activeParticipants.slice(0, 3).map((participant, index) => (
                <div 
                  key={participant.email || participant.userEmail || index} 
                  className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm border-2 border-[#1e1e1e] overflow-hidden"
                  title={participant.name || participant.userName || participant.email || participant.userEmail}
                >
                  <ParticipantAvatar participant={participant} />
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm">
                {onlineUserCount > 0 ? `${onlineUserCount} active` : 'No active users'}
              </div>
            )}
            {activeParticipants && activeParticipants.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-sm border-2 border-[#1e1e1e]">
                +{activeParticipants.length - 3}
              </div>
            )}
          </div>
        </div>
      </DialogTrigger>
      <DialogContent 
        className="bg-[#1e1e1e] text-gray-300 border-[#444] max-w-md"
        aria-describedby="collaboration-dialog-description"
      >
        <DialogHeader>
          <DialogTitle>Session Collaboration</DialogTitle>
          <DialogDescription id="collaboration-dialog-description">
            Manage participants and collaboration settings for this session.
          </DialogDescription>
        </DialogHeader>
        <CollaborationContent 
          sessionData={sessionData}
          participants={participants}
          sessionId={sessionId}
          onRefresh={handleRefresh}
          onlineUserCount={onlineUserCount}
        />
      </DialogContent>
    </Dialog>
  );
}

CollaborationDialog.propTypes = {
  sessionData: PropTypes.object,
  participants: PropTypes.array,
  activeParticipants: PropTypes.array,
  sessionId: PropTypes.string,
  onlineUserCount: PropTypes.number
};
