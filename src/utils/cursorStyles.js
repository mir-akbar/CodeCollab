// Dynamic CSS injection for YJS user-specific cursor styles
export function injectUserCursorStyles(clientId, userInfo) {
  const styleId = `yjs-cursor-style-${clientId}`;
  
  // Remove existing style for this client
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }
  
  if (!userInfo || !userInfo.color) return;
  
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
    
    .yRemoteSelectionHead-${clientId}::before {
      content: "${userName}";
      background-color: ${color};
      color: ${isLightColor(color) ? '#333' : 'white'};
    }
  `;
  
  document.head.appendChild(style);
  console.log(`💅 Injected cursor styles for ${userName} (${clientId}):`, color);
}

export function removeUserCursorStyles(clientId) {
  const styleId = `yjs-cursor-style-${clientId}`;
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
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
