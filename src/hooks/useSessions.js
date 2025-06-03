import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../common/Constant';
import { processSessions } from '../utils/sessionUtils';

export const useSessions = (userEmail) => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("Fetching sessions for user:", userEmail);
      const response = await fetch(`${API_URL}/sessions?email=${userEmail}`);
      const data = await response.json();
      console.log("Raw API response:", data);
      
      const processedData = processSessions(data, userEmail);
      console.log("Processed sessions:", processedData);
      
      setSessions(processedData);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) fetchUserSessions();
  }, [userEmail, fetchUserSessions]);

  return { sessions, isLoading, fetchUserSessions, setSessions };
};