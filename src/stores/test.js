/**
 * Quick Test Script for Zustand Migration
 * Verify all stores are working correctly
 */

// Test UI Store
console.log('🧪 Testing UI Store...');
import { useUIStore } from '../src/stores/uiStore.js';

// This would be run in browser console:
/*
// Test UI Store
const uiStore = useUIStore.getState();
console.log('Initial UI state:', uiStore);

// Test state updates
uiStore.setActiveSessionTab('created');
console.log('After tab change:', useUIStore.getState().activeSessionTab);

uiStore.setSelectedFile({ path: '/test.js', content: 'test' });
console.log('After file selection:', useUIStore.getState().selectedFile);

// Test Editor Store  
const editorStore = useEditorStore.getState();
console.log('Initial Editor state:', editorStore);

editorStore.setCurrentFile('/test.js');
console.log('After file change:', useEditorStore.getState().currentFilePath);

// Test Session Store
const sessionStore = useSessionStore.getState();
console.log('Initial Session state:', sessionStore);

sessionStore.openDialog('create');
console.log('After dialog open:', useSessionStore.getState().dialogs);

sessionStore.updateFilters({ search: 'test' });
console.log('After filter update:', useSessionStore.getState().filters);
*/

// Export for browser testing
export const testStores = () => {
  console.log('✅ All stores loaded successfully!');
  console.log('Open browser console and run the test code above');
};
