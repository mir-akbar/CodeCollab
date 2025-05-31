export const processSessions = (data, userEmail) => {
    console.log("Processing raw session data:", data);
    
    // Check if data has the expected structure
    if (!data || !data.sessions || !Array.isArray(data.sessions)) {
      console.error("Invalid data format received:", data);
      return [];
    }
    
    // First, process all sessions
    const processedSessions = data.sessions.map(session => {
      // Handle possible different id formats (id vs sessionId)
      const id = session.id || session.sessionId;
      
      // Log individual session processing
      console.log("Processing session:", session);
      
      // Create a standardized session object
      return {
        id: id,
        sessionId: id, // Include both for compatibility
        name: session.name || "Unnamed Session",
        description: session.description || "",
        creator: session.creator || "",
        participants: session.participants || [],
        status: session.status || "active",
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isCreator: session.creator === userEmail,
        lastActive: session.updatedAt || session.createdAt,
        access: session.participants?.find(p => p.email === userEmail)?.access || 'view'
      };
    });
    
    // Then, remove duplicates by ID
    const sessionMap = new Map();
    
    // For each session, keep only the most recently updated one if duplicates exist
    processedSessions.forEach(session => {
      const existingSession = sessionMap.get(session.id);
      
      // If this session doesn't exist in our map yet, or it's newer than the existing one, update the map
      if (!existingSession || 
          (new Date(session.lastActive) > new Date(existingSession.lastActive))) {
        sessionMap.set(session.id, session);
      }
    });
    
    // Convert map values back to array
    const uniqueSessions = Array.from(sessionMap.values());
    
    // Log how many duplicates were removed
    if (uniqueSessions.length < processedSessions.length) {
      console.warn(`Removed ${processedSessions.length - uniqueSessions.length} duplicate session(s)`);
    }
    
    return uniqueSessions;
  };
  
  export const filterSessions = (sessions, { search, status, sort }, activeTab) => {
    let filtered = sessions.filter(session => {
      const matchesTab = activeTab === 'all' || 
        (activeTab === 'created' && session.isCreator) ||
        (activeTab === 'invited' && !session.isCreator);
      
      const matchesStatus = status === 'all' || session.status === status;
      const matchesSearch = !search || session.name?.toLowerCase().includes(search.toLowerCase()) || 
                         session.description?.toLowerCase().includes(search.toLowerCase());
      
      return matchesTab && matchesStatus && matchesSearch;
    });
  
    return filtered.sort((a, b) => sort === 'recent' 
      ? new Date(b.lastActive || Date.now()) - new Date(a.lastActive || Date.now())
      : (a.name || "").localeCompare(b.name || ""));
  };