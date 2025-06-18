import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from "../config/environment";
import axios from "axios";
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/contexts/UserContext';
import { useSessionAwareness } from '@/hooks/useSessionAwareness';
// Import components from the UserSection folder directly
import { AuthButton } from './UserSection/AuthButton';
import { CollaborationDialog } from './UserSection/CollaborationDialog';

// Helper function to get display name with intelligent fallback
const getDisplayName = (participant) => {
  if (!participant) return 'Unknown User';
  
  // Use the enhanced name resolution logic matching backend
  return participant.name || 
         participant.displayName || 
         (participant.given_name && participant.family_name ? 
           `${participant.given_name} ${participant.family_name}` : 
           participant.given_name) ||
         (participant.email || participant.userEmail || '').split('@')[0] ||
         'Unknown User';
};

// Helper function to get user initials for avatars
const getUserInitials = (participant) => {
  const displayName = getDisplayName(participant);
  return displayName.split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function UserSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get("session");
  const [sessionData, setSessionData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const { logout } = useAuth();
  const { userEmail } = useUser();
  
  // Get real-time awareness data for active users
  const { onlineUsers, userCount, isOnline } = useSessionAwareness(sessionId);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Fetch session details and participants
  useEffect(() => {
    if (!sessionId || !userEmail) return;

    const fetchSessionData = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/sessions/${sessionId}`, {
          withCredentials: true
        });
        if (response.data.success) {
          console.log('📊 Session data fetched:', response.data.session);
          setSessionData(response.data.session);
          setParticipants(response.data.session.participants || []);
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
        // Fallback to active users endpoint for backward compatibility
        try {
          const fallbackResponse = await axios.post(`${API_URL}/api/sessions/active-users`, {
            session_id: sessionId
          }, {
            withCredentials: true
          });
          const emails = fallbackResponse.data.map(user => user.email);
          setParticipants(emails.map(email => ({
            userEmail: email,
            email: email,
            name: email.split('@')[0],
            role: 'editor',
            status: 'active'
          })));
        } catch (fallbackError) {
          console.error("Error fetching active users:", fallbackError);
        }
      }
    };

    fetchSessionData();
    const interval = setInterval(fetchSessionData, 30000); // Refresh every 30 seconds (less frequent since we have real-time awareness)
    return () => clearInterval(interval);
  }, [sessionId, userEmail]);

  // Combine database participants with real-time awareness for active status
  const getActiveParticipants = () => {
    return participants.filter(p => 
      onlineUsers.includes(p.userEmail || p.email) || 
      (userEmail === (p.userEmail || p.email) && isOnline)
    );
  };

  const activeParticipants = getActiveParticipants();

  // Show empty state if there's no session 
  if (!sessionId) {
    return (
      <div className="flex justify-between items-center gap-2">
        <AuthButton handleLogout={handleLogout} navigate={navigate} />
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center gap-2">
      <CollaborationDialog
        sessionData={sessionData}
        participants={participants}
        activeParticipants={activeParticipants}
        sessionId={sessionId}
        onlineUserCount={userCount}
      />
      <AuthButton handleLogout={handleLogout} navigate={navigate} />
    </div>
  );
}
