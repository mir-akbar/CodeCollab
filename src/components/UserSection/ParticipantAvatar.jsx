import PropTypes from 'prop-types';

export function ParticipantAvatar({ participant }) {
  const getGravatarUrl = (email) => {
    return `https://www.gravatar.com/avatar/${btoa((email || '').toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)}?d=identicon`;
  };

  const getInitial = () => {
    return ((participant.name || 
            participant.userName || 
            participant.email || 
            participant.userEmail || 
            'U').charAt(0)).toUpperCase();
  };

  if (participant.profile?.avatar?.url) {
    return (
      <img 
        src={participant.profile.avatar.url} 
        alt={participant.name || participant.userName || ""} 
        className="w-full h-full object-cover"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = getGravatarUrl(participant.email || participant.userEmail);
        }}
      />
    );
  }

  return (
    <span>{getInitial()}</span>
  );
}

ParticipantAvatar.propTypes = {
  participant: PropTypes.shape({
    profile: PropTypes.shape({
      avatar: PropTypes.shape({
        url: PropTypes.string
      })
    }),
    name: PropTypes.string,
    userName: PropTypes.string,
    email: PropTypes.string,
    userEmail: PropTypes.string
  }).isRequired
};
