/**
 * Cursor Style Manager
 * Handles dynamic cursor styling for collaborative users
 */

import { injectUserCursorStyles, removeUserCursorStyles, updateCursorElements } from '@/utils/cursorStyles';

export class CursorStyleManager {
  constructor() {
    this.injectedStyles = new Set();
  }

  /**
   * Inject user-specific cursor styles
   */
  injectUserCursorStyle(clientId, userInfo) {
    if (typeof injectUserCursorStyles !== 'undefined') {
      injectUserCursorStyles(clientId, userInfo);
    } else {
      this._injectUserCursorStyleFallback(clientId, userInfo);
    }
    
    this.injectedStyles.add(clientId);
  }

  /**
   * Remove user cursor styles
   */
  removeUserCursorStyle(clientId) {
    if (typeof removeUserCursorStyles !== 'undefined') {
      removeUserCursorStyles(clientId);
    } else {
      this._removeUserCursorStyleFallback(clientId);
    }
    
    this.injectedStyles.delete(clientId);
  }

  /**
   * Update all cursor DOM elements
   */
  updateAllCursorElements(userStates) {
    if (typeof updateCursorElements !== 'undefined') {
      updateCursorElements(userStates);
    } else {
      this._updateCursorElementsFallback(userStates);
    }
  }

  /**
   * Handle awareness changes and update cursor styles
   */
  handleAwarenessChange(changes, userStates) {
    // Inject styles for new/updated users
    changes.added.forEach(clientId => {
      const state = userStates.get(clientId);
      if (state?.user) {
        this.injectUserCursorStyle(clientId, state.user);
      }
    });
    
    changes.updated.forEach(clientId => {
      const state = userStates.get(clientId);
      if (state?.user) {
        this.injectUserCursorStyle(clientId, state.user);
      }
    });
    
    // Remove styles for disconnected users
    changes.removed.forEach(clientId => {
      this.removeUserCursorStyle(clientId);
    });
    
    // Update cursor DOM elements with user names
    requestAnimationFrame(() => {
      this.updateAllCursorElements(userStates);
    });
  }

  /**
   * Inject styles immediately for existing users
   */
  injectStylesForExistingUsers(userStates) {
    userStates.forEach((state, clientId) => {
      if (state?.user) {
        console.log('🎨 Injecting immediate cursor style for client:', clientId, state.user.name);
        this.injectUserCursorStyle(clientId, state.user);
      }
    });

    // Update cursor elements immediately
    requestAnimationFrame(() => {
      this.updateAllCursorElements(userStates);
    });
  }

  /**
   * Cleanup all cursor styles
   */
  cleanupAllStyles() {
    this.injectedStyles.forEach(clientId => {
      this.removeUserCursorStyle(clientId);
    });
    this.injectedStyles.clear();
  }

  /**
   * Fallback cursor style injection
   */
  _injectUserCursorStyleFallback(clientId, userInfo) {
    const styleId = `yjs-cursor-style-${clientId}`;
    
    // Remove existing style
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    if (!userInfo?.color) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    
    const color = userInfo.color;
    const lightColor = userInfo.colorLight || (color + '33');
    const userName = userInfo.name || 'Anonymous';
    
    style.innerHTML = `
      .yRemoteSelection-${clientId} {
        background-color: ${lightColor} !important;
      }
      
      .yRemoteSelectionHead-${clientId} {
        background-color: ${color} !important;
        border-left-color: ${color} !important;
      }
      
      .yRemoteSelectionHead-${clientId}::after {
        content: attr(data-user-name);
        background-color: ${color};
        color: ${this._isLightColor(color) ? '#333' : 'white'};
        position: absolute;
        top: -1.3em;
        left: -2px;
        font-size: 0.7em;
        font-weight: 500;
        padding: 2px 6px;
        border-radius: 3px;
        white-space: nowrap;
        z-index: 1001;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    
    document.head.appendChild(style);
    console.log(`💅 Injected cursor styles for ${userName} (${clientId}):`, color);
  }

  /**
   * Fallback cursor style removal
   */
  _removeUserCursorStyleFallback(clientId) {
    const styleId = `yjs-cursor-style-${clientId}`;
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
      console.log(`🗑️ Removed cursor styles for client ${clientId}`);
    }
  }

  /**
   * Fallback cursor element update
   */
  _updateCursorElementsFallback(userStates) {
    // Find all cursor elements and update their data attributes
    const cursorElements = document.querySelectorAll('.yRemoteSelectionHead');
    
    cursorElements.forEach((element) => {
      const clientId = Array.from(element.classList)
        .find(cls => cls.startsWith('yRemoteSelectionHead-'))
        ?.replace('yRemoteSelectionHead-', '');
      
      if (clientId && userStates.has(parseInt(clientId))) {
        const userState = userStates.get(parseInt(clientId));
        const userName = userState?.user?.name || 'Anonymous';
        
        // Set data attribute for CSS immediately to prevent "User" fallback
        element.setAttribute('data-user-name', userName);
        console.log(`🏷️ Set cursor label for client ${clientId}: ${userName}`);
      }
    });
    
    // Also check for any cursor elements without data-user-name and fix them
    const unlabeledCursors = document.querySelectorAll('.yRemoteSelectionHead:not([data-user-name])');
    if (unlabeledCursors.length > 0) {
      console.log(`🔍 Found ${unlabeledCursors.length} unlabeled cursor elements, setting fallback`);
      unlabeledCursors.forEach(element => {
        element.setAttribute('data-user-name', 'Anonymous');
      });
    }
  }

  /**
   * Check if color is light (for text contrast)
   */
  _isLightColor(color) {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 155;
    }
    return false;
  }
}
