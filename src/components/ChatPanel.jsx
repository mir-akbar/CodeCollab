import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { API_URL } from "../common/Constant";

const socket = io(`${API_URL}`);

function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const userEmail = localStorage.getItem("email") || "";
  const searchParams = new URLSearchParams(location.search);
  const session = searchParams.get("session");

  // Fetch messages on load
  useEffect(() => {
    if (!session) return;

    fetch(`${API_URL}/chat/messages`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter((msg) => msg.session === session);
        setMessages(filtered);
      })
      .catch((err) => console.error("Failed to fetch messages:", err));
  }, [session]);

  // Register user and socket listener
  useEffect(() => {
    if (!userEmail || !session) return;

    socket.emit("register-user", userEmail);

    const handleReceiveMessage = (message) => {
      // console.log("Received socket message:", message);
      console.log(message.session);
      if (message.session === session) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [userEmail, session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const sender = userEmail.replace("@gmail.com", "");
    const message = {
      sender,
      content: newMessage.trim(),
      sessionId: session,
    };

    socket.emit("sendMessage", message);
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

          return (
            <div
              key={index}
              className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-2 ${
                  isOwnMessage
                    ? "bg-blue-500 text-white"
                    : "bg-gray-700 text-gray-200"
                }`}
              >
                <p className="font-semibold text-sm">
                  {isOwnMessage ? "You" : message.sender}
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
