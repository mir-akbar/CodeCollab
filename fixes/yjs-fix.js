// In CodeEditorPanel.jsx, replace the content initialization useEffect with this:

useEffect(() => {
  if (!isYjsReady || !yjsDocRef.current || hasInitializedContent) return;
  
  const ytext = yjsDocRef.current.getText('monaco');
  
  // Check if YJS document already has content (from other users or previous sessions)
  if (ytext.length > 0) {
    console.log('📄 YJS document already has content, skipping initialization for:', currentFile);
    setHasInitializedContent(true);
    return;
  }
  
  // Only initialize if we're the first user AND have content to insert
  // Add an additional check to ensure we don't double-initialize
  if (content && content.trim().length > 0) {
    // Add a small delay and double-check that the document is still empty
    const initTimer = setTimeout(() => {
      const currentYtext = yjsDocRef.current?.getText('monaco');
      if (currentYtext && currentYtext.length === 0) {
        console.log('📝 First user - initializing YJS document for:', currentFile);
        currentYtext.insert(0, content);
        setHasInitializedContent(true);
      } else {
        console.log('📄 Document was initialized by another user, skipping for:', currentFile);
        setHasInitializedContent(true);
      }
    }, 200); // Increased delay to ensure sync is complete
    
    return () => clearTimeout(initTimer);
  } else {
    // Mark as initialized even if no content to prevent future attempts
    setHasInitializedContent(true);
  }
}, [content, isYjsReady, currentFile, hasInitializedContent]);

// Also, improve the YJS sync handling in the main useEffect:
useEffect(() => {
  if (!sessionId || !currentFile) return;

  // ... existing cleanup code ...

  // Initialize new YJS document for this file
  const doc = new Y.Doc();
  yjsDocRef.current = doc;

  // Create provider for this specific file
  const roomName = `${sessionId}-${currentFile}`;
  const provider = new SocketIOProvider(roomName, socket, doc);
  providerRef.current = provider;

  // Set up awareness
  if (provider.awareness && provider.awareness.setLocalStateField) {
    try {
      provider.awareness.setLocalStateField('user', {
        name: email,
        color: stringToColor(email),
        colorLight: stringToColor(email) + '33',
      });
      console.log('✅ Awareness initialized for user:', email);
    } catch (error) {
      console.error('Error setting awareness:', error);
    }
  }

  // Wait for sync before setting up binding
  const handleSynced = () => {
    console.log('🔄 YJS provider synced for:', currentFile);
    const ytext = yjsDocRef.current.getText('monaco');
    console.log(`📏 YJS document length after sync: ${ytext.length}`);
    
    // Important: Set YJS ready state AFTER sync is complete
    setIsYjsReady(true);
    
    if (editorRef.current) {
      setupYjsBinding();
    }
  };

  // Always wait for sync, even if provider claims to be synced
  provider.on('synced', handleSynced);
  
  // If already synced, still wait a bit to ensure all updates are processed
  if (provider.synced) {
    setTimeout(handleSynced, 100);
  }

  return () => {
    console.log('🧹 Cleaning up YJS resources for:', currentFile);
    
    // ... existing cleanup code ...
    
    setIsYjsReady(false);
    setHasInitializedContent(false);
  };
}, [sessionId, currentFile, email, setupYjsBinding]);