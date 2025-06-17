/**
 * Monaco Binding Manager
 * Handles Monaco editor bindings and content synchronization with YJS error protection
 */

import { MonacoBinding } from 'y-monaco';
import { safeGetYjsContent, safeSetYjsContent } from '@/utils/yjsErrorHandler';

export class MonacoBindingManager {
  constructor() {
    this.bindings = new Map(); // sessionId-filePath -> binding
    this.contentObservers = new Map();
  }

  /**
   * Create Monaco binding for collaborative editing
   */
  createBinding(connection, editor, onContentChange) {
    if (!connection || !editor) {
      console.warn('Cannot create Monaco binding: missing connection or editor');
      return null;
    }

    const connectionKey = `${connection.sessionId}-${connection.filePath}`;

    // Clean up existing binding
    this._cleanupExistingBinding(connectionKey, connection);

    try {
      // Synchronize content between editor and Y.js document
      this._synchronizeContent(connection, editor);

      // Create new Monaco binding
      const binding = new MonacoBinding(
        connection.ytext,
        editor.getModel(),
        new Set([editor]),
        connection.awareness
      );

      if (!binding) {
        throw new Error('Monaco binding creation failed');
      }

      this.bindings.set(connectionKey, binding);

      // Set up content change observer
      if (onContentChange) {
        this._setupContentObserver(connection, binding, onContentChange);
      }

      console.log('✅ Monaco binding created for:', connection.filePath);
      return binding;
    } catch (error) {
      console.error('❌ Error creating Monaco binding:', error);
      return null;
    }
  }

  /**
   * Synchronize content between editor and Y.js document
   */
  _synchronizeContent(connection, editor) {
    let editorContent = '';
    let yjsContent = '';
    
    try {
      editorContent = editor.getModel().getValue();
      yjsContent = connection.ytext.toString();
    } catch (error) {
      console.error('❌ Error reading content during binding creation:', error);
      throw error;
    }
    
    console.log(`🔄 Creating Monaco binding - Content check:`, {
      filePath: connection.filePath,
      editorContentLength: editorContent.length,
      yjsContentLength: yjsContent.length,
      contentsMatch: editorContent === yjsContent
    });
    
    // Prevent content duplication by ensuring only one source of truth
    if (editorContent.length > 0 && yjsContent.length > 0 && editorContent !== yjsContent) {
      console.warn(`⚠️  Content mismatch detected! Editor and Y.js have different content for: ${connection.filePath}`);
      console.warn(`Editor content preview: "${editorContent.substring(0, 100)}..."`);
      console.warn(`Y.js content preview: "${yjsContent.substring(0, 100)}..."`);
      
      // Use Y.js content as the source of truth
      console.log('🔄 Using Y.js content as source of truth to prevent duplication');
      editor.getModel().setValue(yjsContent);
    } else if (editorContent.length > 0 && yjsContent.length === 0) {
      // Editor has content but Y.js is empty - initialize Y.js with editor content
      console.log('📝 Initializing Y.js document with editor content');
      connection.ytext.insert(0, editorContent);
    } else if (yjsContent.length > 0 && editorContent.length === 0) {
      // Y.js has content but editor is empty - set editor content
      console.log('📝 Setting editor content from Y.js document');
      editor.getModel().setValue(yjsContent);
    }
  }

  /**
   * Setup content change observer
   */
  _setupContentObserver(connection, binding, onContentChange) {
    const contentObserver = (event, transaction) => {
      if (transaction.local) {
        const newContent = connection.ytext.toString();
        onContentChange(newContent);
      }
    };

    connection.ytext.observe(contentObserver);
    
    // Store observer for cleanup
    binding._contentObserver = contentObserver;
    
    const connectionKey = `${connection.sessionId}-${connection.filePath}`;
    this.contentObservers.set(connectionKey, contentObserver);
  }

  /**
   * Initialize content in Y.js document (production-safe)
   */
  async initializeContent(connection, content) {
    if (!connection || !content?.trim()) {
      console.log('No content to initialize for:', connection?.filePath);
      return false;
    }

    // Get current Y.js document content safely
    const currentContent = safeGetYjsContent(connection.ytext, '');
    
    // Enhanced content checking to prevent duplication
    if (currentContent === content) {
      console.log(`📄 Document already has identical content for: ${connection.filePath}, skipping initialization`);
      return false;
    }
    
    // Check if document has any content at all
    if (currentContent.length > 0) {
      console.log(`🚫 PRODUCTION FIX: Document already has content (${currentContent.length} chars), preventing duplication for: ${connection.filePath}`);
      // Additional check: if the current content length is roughly double the expected content, 
      // this indicates duplication has already occurred
      if (currentContent.length >= content.length * 1.5) {
        console.warn(`⚠️ DUPLICATION DETECTED: Current content (${currentContent.length}) is significantly larger than expected (${content.length}). This suggests content duplication.`);
      }
      return false;
    }

    // Prevent race conditions with enhanced timing checks
    if (connection._initializing) {
      console.log('Content initialization already in progress for:', connection.filePath);
      return false;
    }
    
    // Check if another client has recently initialized this document
    const now = Date.now();
    if (connection._lastInitialization && (now - connection._lastInitialization) < 5000) {
      console.log(`🕒 Recent initialization detected for ${connection.filePath}, waiting for sync`);
      return false;
    }
    
    if (connection._initializationAttempts && connection._initializationAttempts >= 3) {
      console.log('🚫 Too many initialization attempts, preventing potential duplication for:', connection.filePath);
      return false;
    }
    
    connection._initializing = true;
    connection._initializationAttempts = (connection._initializationAttempts || 0) + 1;
    connection._lastInitialization = Date.now();
    
    try {
      console.log(`📝 [PRODUCTION] Initializing document content for: ${connection.filePath} (${content.length} chars) - Attempt ${connection._initializationAttempts}`);
      
      // Add a small delay to allow WebSocket sync and other clients to populate the document
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Final check after delay - in production this prevents race conditions
      const finalCheck = safeGetYjsContent(connection.ytext, '');
      console.log(`🔍 Final content check after delay: ${finalCheck.length} chars for ${connection.filePath}`);
      
      if (finalCheck.length === 0) {
        // Document is still empty, safe to initialize
        const success = safeSetYjsContent(connection.ytext, content, 'insert');
        if (success) {
          console.log(`✅ [PRODUCTION] Successfully initialized content for: ${connection.filePath}`);
          return true;
        } else {
          console.error(`❌ [PRODUCTION] Failed to set YJS content for: ${connection.filePath}`);
          return false;
        }
      } else if (finalCheck.length === content.length && finalCheck === content) {
        // Document has identical content, which is fine
        console.log(`✅ [PRODUCTION] Document already has identical content for: ${connection.filePath}`);
        return true;
      } else {
        // Document has different or additional content - another client initialized it
        console.log(`⚠️  [PRODUCTION] Document was populated by another client: ${connection.filePath} (${finalCheck.length} chars)`);
        
        // Check for potential duplication
        if (finalCheck.length > content.length * 1.5) {
          console.warn(`🚨 POTENTIAL DUPLICATION: Document content (${finalCheck.length}) is much larger than expected (${content.length})`);
        }
        
        return false;
      }
    } catch (error) {
      console.error('Error initializing content:', error);
      return false;
    } finally {
      setTimeout(() => {
        connection._initializing = false;
      }, 3000);
    }
  }

  /**
   * Get current document content safely
   */
  getContent(connection) {
    if (!connection) return '';
    return safeGetYjsContent(connection.ytext, '');
  }

  /**
   * Clean up existing binding
   */
  _cleanupExistingBinding(connectionKey, connection) {
    if (this.bindings.has(connectionKey)) {
      const existingBinding = this.bindings.get(connectionKey);
      try {
        // Remove content observer if it exists
        if (existingBinding._contentObserver && connection.ytext) {
          connection.ytext.unobserve(existingBinding._contentObserver);
          delete existingBinding._contentObserver;
        }
        existingBinding.destroy();
      } catch (error) {
        console.warn('Error cleaning up existing binding:', error);
      }
      this.bindings.delete(connectionKey);
    }

    // Clean up content observer
    if (this.contentObservers.has(connectionKey)) {
      this.contentObservers.delete(connectionKey);
    }
  }

  /**
   * Destroy binding
   */
  destroyBinding(sessionId, filePath, connection) {
    const connectionKey = `${sessionId}-${filePath}`;
    
    if (this.bindings.has(connectionKey)) {
      const binding = this.bindings.get(connectionKey);
      
      try {
        // Clean up content observer
        if (binding._contentObserver && connection?.ytext) {
          connection.ytext.unobserve(binding._contentObserver);
          delete binding._contentObserver;
        }
        
        binding.destroy();
      } catch (error) {
        console.warn('Error destroying Monaco binding:', error);
      }
      
      this.bindings.delete(connectionKey);
    }

    // Clean up content observer
    if (this.contentObservers.has(connectionKey)) {
      this.contentObservers.delete(connectionKey);
    }
  }

  /**
   * Destroy all bindings
   */
  destroyAll() {
    for (const binding of this.bindings.values()) {
      try {
        binding.destroy();
      } catch (error) {
        console.warn('Error destroying binding:', error);
      }
    }
    this.bindings.clear();
    this.contentObservers.clear();
  }

  /**
   * Get binding
   */
  getBinding(sessionId, filePath) {
    const connectionKey = `${sessionId}-${filePath}`;
    return this.bindings.get(connectionKey);
  }
}
