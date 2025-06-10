import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { io } from "socket.io-client";
import * as Y from 'yjs';
import { SocketIOProvider } from './yjs/SocketIOProvider';
import { API_URL } from "../common/Constant";

const socket = io(`${API_URL}`, { transports: ["websocket", "polling"] });

function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const yjsDocRef = useRef(null);
  const providerRef = useRef(null);
  const messagesArrayRef = useRef(null);
  const { userEmail } = useUser();
  const searchParams = new URLSearchParams(location.search);
  const session = searchParams.get("session");

  // Initialize YJS for chat
  useEffect(() => {
    if (!session || !userEmail) return;
    
    console.log("🔗 Initializing YJS chat for session:", session);
    
    // Create YJS document for chat
    const doc = new Y.Doc();
    yjsDocRef.current = doc;
    
    // Create provider for chat
    const roomName = `chat-${session}`;
    const provider = new SocketIOProvider(roomName, socket, doc);
    providerRef.current = provider;
    
    // Get shared messages array
    const messagesArray = doc.getArray('messages');
    messagesArrayRef.current = messagesArray;
    
    // Set up user awareness for chat
    if (provider.awareness && provider.awareness.setLocalStateField) {
      try {
        provider.awareness.setLocalStateField('user', {
          name: userEmail.split('@')[0],
          email: userEmail,
          color: stringToColor(userEmail),
          isInChat: true,
        });
      } catch (error) {
        console.error('Error setting chat awareness:', error);
      }
    }
    
    // Listen for provider sync
    const handleSynced = () => {
      console.log('💬 Chat synchronized');
      setIsConnected(true);
      
      // Load existing messages
      const existingMessages = messagesArray.toArray();
      setMessages(existingMessages);
    };
    
    // Listen for message changes
    const handleMessagesChange = () => {
      const allMessages = messagesArray.toArray();
      setMessages([...allMessages]);
    };
    
    if (provider.synced) {
      handleSynced();
    } else {
      provider.on('synced', handleSynced);
    }
    
    messagesArray.observe(handleMessagesChange);
    
    return () => {
      console.log('🧹 Cleaning up chat YJS resources');
      if (messagesArray) {
        messagesArray.unobserve(handleMessagesChange);
      }
      if (providerRef.current) {
        try {
          providerRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying chat provider:', error);
        }
      }
      if (yjsDocRef.current) {
        try {
          yjsDocRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying chat document:', error);
        }
      }
      setIsConnected(false);
    };
  }, [session, userEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !messagesArrayRef.current || !isConnected) return;

    const message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender: userEmail.split('@')[0],
      senderEmail: userEmail,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    
    try {
      // Add message to YJS array
      messagesArrayRef.current.push([message]);
      setNewMessage("");
      console.log('💬 Message sent via YJS:', message.content);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Helper function to generate color from string
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = "#";
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += ("00" + value.toString(16)).slice(-2);
    }
    return color;
  };
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-400">
        <p>No session selected</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full">
      {/* Connection Status */}
      <div className="p-2 bg-gray-800 text-xs">
        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
        {isConnected ? '🔗 Chat connected' : '⏳ Connecting to chat...'}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isOwnMessage = message.senderEmail === userEmail;
          const isSystemMessage = message.sender === "System";

          return (
            <div
              key={message.id || index}
              className={`flex ${
                isOwnMessage && !isSystemMessage ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isSystemMessage
                    ? "bg-yellow-600 text-yellow-100"
                    : isOwnMessage
                    ? "bg-blue-600 text-white"
                    : "bg-[#2d2d2d] text-gray-200"
                }`}
              >
                {!isOwnMessage && !isSystemMessage && (
                  <div className="text-xs font-medium mb-1" style={{ color: stringToColor(message.senderEmail || message.sender) }}>
                    {message.sender}
                  </div>
                )}
                <div className="text-sm">{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[#444]">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={!isConnected}
            className="flex-1 bg-[#2d2d2d] border-[#444] text-gray-200"
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon"
            disabled={!isConnected || !newMessage.trim()}
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
