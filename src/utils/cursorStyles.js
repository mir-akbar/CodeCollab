// Dynamic CSS injection for YJS user-specific cursor styles
const injectedStyles = new Map(); // Track what we've already injected
const logThrottle = new Map(); // Throttle console logs

function shouldLogStyleInjection(clientId) {
  const now = Date.now();
  const lastLogged = logThrottle.get(clientId);
  
  // Only log cursor style injection once every 2 seconds per client
  if (!lastLogged || (now - lastLogged) > 2000) {
    logThrottle.set(clientId, now);
    return true;
  }
  return false;
}

export function injectUserCursorStyles(clientId, userInfo) {
  const styleId = `yjs-cursor-style-${clientId}`;
  
  if (!userInfo || !userInfo.color) return;
  
  // Check if we've already injected identical styles for this user
  const cacheKey = `${clientId}-${userInfo.color}-${userInfo.name}`;
  if (injectedStyles.has(cacheKey)) {
    // Styles already exist and are identical, skip injection
    return;
  }
  
  // Also check if styles exist in DOM for this client (belt and suspenders approach)
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    // Only log if we're actually changing something
    const needsUpdate = !injectedStyles.has(cacheKey);
    if (!needsUpdate) return;
    
    existingStyle.remove();
  }
  
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
      /* Let CSS attr() handle the content - this prevents flickering */
      background-color: ${color};
      color: ${isLightColor(color) ? '#333' : 'white'};
    }
    
    /* Additional styling for better visibility */
    .yRemoteSelectionHead-${clientId}::after {
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
  
  // Cache that we've injected these styles
  injectedStyles.set(cacheKey, true);
  
  // Throttled logging to reduce console spam
  if (shouldLogStyleInjection(clientId)) {
    console.log(`💅 Injected cursor styles for ${userName} (${clientId}):`, color);
  }
}

export function removeUserCursorStyles(clientId) {
  const styleId = `yjs-cursor-style-${clientId}`;
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
    
    // Remove from cache
    for (const [cacheKey] of injectedStyles.entries()) {
      if (cacheKey.startsWith(`${clientId}-`)) {
        injectedStyles.delete(cacheKey);
      }
    }
    
    console.log(`🗑️ Removed cursor styles for client ${clientId}`);
  }
}

function isLightColor(color) {
  // Simple check to determine if a color is light (for text contrast)
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

export function cleanupAllCursorStyles() {
  const cursorStyles = document.querySelectorAll('[id^="yjs-cursor-style-"]');
  cursorStyles.forEach(style => style.remove());
  console.log('🧹 Cleaned up all YJS cursor styles');
}

/**
 * Update cursor DOM elements with user names manually
 * This is a fallback for when y-monaco doesn't set data attributes
 */
export function updateCursorElements(userStates) {
  // Find all cursor elements in the Monaco editor
  const cursorElements = document.querySelectorAll('.yRemoteSelectionHead');
  
  cursorElements.forEach((element) => {
    const clientId = Array.from(element.classList)
      .find(cls => cls.startsWith('yRemoteSelectionHead-'))
      ?.replace('yRemoteSelectionHead-', '');
    
    if (clientId && userStates.has(parseInt(clientId))) {
      const userState = userStates.get(parseInt(clientId));
      const userName = userState?.user?.name || 'Anonymous';
      
      // Set data attribute for CSS to use
      element.setAttribute('data-user-name', userName);
      
      // Also inject specific styles for this client if not already done
      if (userState?.user) {
        injectUserCursorStyles(clientId, userState.user);
      }
    }
  });
}
