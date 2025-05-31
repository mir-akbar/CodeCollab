import { SessionCard } from './SessionCard';
import { SessionCardSkeleton } from './SessionCardSkeleton';
import PropTypes from 'prop-types';

export const SessionList = ({ 
  sessions, 
  isLoading = false, 
  userEmail, 
  onJoin, 
  onDelete, 
  onInvite, 
  onLeave,
  onToggleFavorite,
  favoriteSessionIds = []
}) => {
  // Add debugging to see what's in the sessions array
  // console.log("Sessions in SessionList:", sessions);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <SessionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-muted-foreground text-lg">No sessions found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or create a new session</p>
      </div>
    );
  }

  // Find duplicate session IDs and log them for debugging
  const sessionIds = sessions.map(s => s.id || s.sessionId);
  const duplicateIds = sessionIds.filter((id, index) => sessionIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    console.warn("Found duplicate session IDs:", duplicateIds);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sessions.map((session, index) => {
        // Create a truly unique key by combining the session ID with the index
        const uniqueKey = `${session.id || session.sessionId || 'unknown'}-${index}`;
        
        return (
          <SessionCard
            key={uniqueKey}
            session={session}
            userEmail={userEmail}
            onJoin={onJoin}
            onDelete={() => onDelete(session)}
            onInvite={() => onInvite(session)}
            onLeave={() => onLeave(session)}
            isFavorite={favoriteSessionIds.includes(session.id) || favoriteSessionIds.includes(session.sessionId)}
            onToggleFavorite={() => onToggleFavorite(session)}
          />
        );
      })}
    </div>
  );
};

SessionList.propTypes = {
  sessions: PropTypes.array.isRequired,
  isLoading: PropTypes.bool,
  userEmail: PropTypes.string.isRequired,
  onJoin: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onInvite: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired,
  onToggleFavorite: PropTypes.func.isRequired,
  favoriteSessionIds: PropTypes.array
};