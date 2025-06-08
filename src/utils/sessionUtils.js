import CryptoJS from 'crypto-js';
import { toast } from 'sonner';

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
 * Navigate to session workspace with encrypted access
 * @param {Object} session - Session object with sessionId and access
 */
export const navigateToSession = (session) => {
    console.log('Navigating to session:', session);
    const workspaceUrl = window.location.origin;
    const sessionUrl = `${workspaceUrl}/workspace?session=${session.sessionId}&access=${encodeURIComponent(encryptData(session.access))}`;
    window.location.href = sessionUrl;
    toast.success("Joining session...");
};