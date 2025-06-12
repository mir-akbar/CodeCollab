import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Users } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useChat } from "@/hooks/chat/useChat";
import { useLocation } from "react-router-dom";

function ChatPanel() {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const { userEmail } = useUser();
  const location = useLocation();
  
  // Get session ID from URL
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get("session");

  // Use chat hook
  const {
    messages,
    onlineUsers,
    isConnected,
    isLoading,
    error,
    sendMessage,
    getUserColor,
    userCount
  } = useChat(sessionId);
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await sendMessage(newMessage);
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!sessionId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-400">
        <p>No session selected</p>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-400">
        <p>Loading chat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-400">
        <p>Error loading chat: {error.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status */}
      <div className="p-2 bg-gray-800 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
            {isConnected ? '🔗 Chat connected' : '⏳ Connecting to chat...'}
          </div>
          {userCount > 0 && (
            <div className="flex items-center text-gray-400">
              <Users className="h-3 w-3 mr-1" />
              {userCount}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isOwnMessage = message.senderEmail === userEmail;
          const isSystemMessage = message.sender === "System" || message.type === "system";

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
                  <div className="text-xs font-medium mb-1" style={{ color: getUserColor(message.senderEmail || message.sender) }}>
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
