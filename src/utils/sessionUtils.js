import CryptoJS from 'crypto-js';
import { toast } from 'sonner';
import { roleToAccess } from './permissions';

const SECRET_KEY = "f9a8b7c6d5e4f3a2b1c0d9e8f7g6h5i4j3k2l1m0n9o8p7q6";

/**
 * Encryption function for session access tokens
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text
 */
export const encryptData = (text) => {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

/**
 * Decryption function for session access tokens
 * @param {string} cipherText - Encrypted text to decrypt
 * @returns {string} - Decrypted text
 */
export const decryptSessionAccess = (cipherText) => {
    try {
        console.log('Decrypting session access:', { cipherText, type: typeof cipherText, length: cipherText?.length });
        
        if (!cipherText) {
            console.log('No cipher text provided');
            return "";
        }

        const decodedCipherText = decodeURIComponent(cipherText);
        console.log('Decoded cipher text:', { decodedCipherText, length: decodedCipherText.length });
        
        const bytes = CryptoJS.AES.decrypt(decodedCipherText, SECRET_KEY);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        
        console.log('Decryption result:', { decryptedText, length: decryptedText.length });

        if (!decryptedText) {
            console.error("Decryption returned empty string");
            throw new Error("Decryption returned empty string");
        }

        return decryptedText;
    } catch (error) {
        console.error("Decryption error:", error.message, { cipherText });
        throw new Error("Invalid access token");
    }
};

/**
 * Navigate to session workspace with encrypted access
 * @param {Object} session - Session object with sessionId and userRole
 */
export const navigateToSession = (session) => {
    console.log('Navigating to session:', session);
    
    const sessionId = session.sessionId || session.id;
    
    // Determine access based on user's role in the session
    let access = 'view'; // Default to view access
    
    if (session.userRole) {
        // Use the roleToAccess utility function for consistency
        access = roleToAccess(session.userRole);
    } else if (session.isCreator || session.creator === session.userEmail) {
        // Fallback: If user is the creator, they should have edit access
        access = 'edit';
    }
    
    console.log('Session navigation details:', {
        sessionId,
        userRole: session.userRole,
        isCreator: session.isCreator,
        creator: session.creator,
        userEmail: session.userEmail,
        determinedAccess: access
    });
    
    if (!sessionId) {
        toast.error("Invalid session ID");
        return;
    }
    
    const workspaceUrl = window.location.origin;
    const encryptedAccess = encryptData(access);
    const sessionUrl = `${workspaceUrl}/workspace?session=${sessionId}&access=${encodeURIComponent(encryptedAccess)}`;
    
    console.log('Generated session URL:', sessionUrl);
    console.log('Access value being encrypted:', access);
    console.log('Encrypted access:', encryptedAccess);
    
    window.location.href = sessionUrl;
    toast.success("Joining session...");
};

/**
 * Filter sessions based on active tab and filters
 * @param {Array} sessions - Array of session objects
 * @param {string} activeTab - Active tab ('all', 'created', 'invited', 'favorites')
 * @param {Object} filters - Filter object with search and sort
 * @param {string} userEmail - Current user's email
 * @returns {Array} - Filtered and sorted sessions
 */
export const getFilteredSessions = (sessions, activeTab, filters, userEmail) => {
    if (!sessions || !Array.isArray(sessions)) {
        return [];
    }

    let filtered = [...sessions];

    // Filter by tab
    switch (activeTab) {
        case 'created':
            filtered = filtered.filter(session => 
                session.isCreator || session.creator === userEmail
            );
            break;
        case 'invited':
            filtered = filtered.filter(session => 
                !(session.isCreator || session.creator === userEmail)
            );
            break;
        case 'favorites':
            filtered = filtered.filter(session => session.isFavorite);
            break;
        case 'all':
        default:
            // No additional filtering for 'all'
            break;
    }

    // Filter by search term
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(session =>
            session.name?.toLowerCase().includes(searchLower) ||
            session.description?.toLowerCase().includes(searchLower) ||
            session.creator?.toLowerCase().includes(searchLower)
        );
    }

    // Sort sessions
    switch (filters.sort) {
        case 'name':
            filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'favorites':
            filtered.sort((a, b) => {
                if (a.isFavorite && !b.isFavorite) return -1;
                if (!a.isFavorite && b.isFavorite) return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            break;
        case 'recent':
        default:
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
    }

    return filtered;
};