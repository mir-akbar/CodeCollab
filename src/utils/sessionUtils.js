import CryptoJS from 'crypto-js';

const SECRET_KEY = "f9a8b7c6d5e4f3a2b1c0d9e8f7g6h5i4j3k2l1m0n9o8p7q6";

// Encryption function for session access
export const encryptData = (text) => {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

// Navigate to session workspace
export const navigateToSession = (session, toast) => {
    console.log(session);
    const workspaceUrl = window.location.origin;
    const sessionUrl = `${workspaceUrl}/workspace?session=${session.sessionId}&access=${encodeURIComponent(encryptData(session.access))}`;
    window.location.href = sessionUrl;
    toast({ 
        title: "Joining Session", 
        description: `You would navigate to session` 
    });
};

export const processSessions = (data, userEmail) => {
    console.log("Processing raw session data:", data);
    
    // Check if data has the expected structure
    if (!data || !data.sessions || !Array.isArray(data.sessions)) {
      console.error("Invalid data format received:", data);
      return [];
    }
    
    // Process all sessions - new API should already provide clean data
    const processedSessions = data.sessions.map(session => {
      // Handle possible different id formats (id vs sessionId)
      const id = session._id || session.id || session.sessionId;
      
      // Log individual session processing
      console.log("Processing session:", session);
      
      // Create a standardized session object
      return {
        id: id,
        sessionId: session.sessionId || id, // Include both for compatibility
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
    
    console.log(`Processed ${processedSessions.length} session(s)`);
    return processedSessions;
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

// Filter sessions based on tab and search criteria
export const getFilteredSessions = (sessions, filters, activeTab, favoriteSessionIds) => {
    return sessions.filter(session => {
        // Filter by tab
        if (activeTab === "created" && !session.isCreator) return false;
        if (activeTab === "invited" && session.isCreator) return false;
        if (activeTab === "favorites" && !favoriteSessionIds.includes(session.id) && !favoriteSessionIds.includes(session.sessionId)) return false;
        
        // Filter by search term
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const matchesName = session.name?.toLowerCase().includes(searchTerm);
            const matchesDescription = session.description?.toLowerCase().includes(searchTerm);
            if (!matchesName && !matchesDescription) return false;
        }
        
        return true;
    }).sort((a, b) => {
        // Sort sessions
        if (filters.sort === "recent") {
            return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        } else if (filters.sort === "alphabetical") {
            return (a.name || "").localeCompare(b.name || "");
        }
        return 0;
    });
};