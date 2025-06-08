import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const { userEmail } = useUser();
  const searchParams = new URLSearchParams(location.search);
  const session = searchParams.get("session");

  // Placeholder for y-websocket integration
  useEffect(() => {
    if (!session) return;
    
    // TODO: Initialize y-websocket for chat functionality
    console.log("Chat will be integrated with y-websocket for session:", session);
    
    // Placeholder message to indicate pending integration
    setMessages([{
      sender: "System",
      content: "Chat functionality will be available once y-websocket integration is complete.",
      timestamp: new Date(),
    }]);
  }, [session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    // TODO: Implement y-websocket chat sending
    console.log("Message will be sent via y-websocket:", newMessage);
    
    // Placeholder for development - show sent message locally
    const sender = userEmail.replace("@gmail.com", "");
    const message = {
      sender,
      content: newMessage.trim(),
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, message]);
    setNewMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isOwnMessage =
            message.sender.replace("@gmail.com", "") ===
            userEmail.replace("@gmail.com", "");
          const isSystemMessage = message.sender === "System";

          return (
            <div
              key={index}
              className={`flex ${
                isSystemMessage 
                  ? "justify-center" 
                  : isOwnMessage 
                    ? "justify-end" 
                    : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-2 ${
                  isSystemMessage
                    ? "bg-yellow-600 text-white text-center"
                    : isOwnMessage
                      ? "bg-blue-500 text-white"
                      : "bg-gray-700 text-gray-200"
                }`}
              >
                <p className="font-semibold text-sm">
                  {isSystemMessage ? message.sender : isOwnMessage ? "You" : message.sender}
                </p>
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[#444] bg-[#1e1e1e]">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 bg-[#2d2d2d] border-[#444] text-gray-200"
          />
          <Button onClick={handleSendMessage} size="icon">
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
