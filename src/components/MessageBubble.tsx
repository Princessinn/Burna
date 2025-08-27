import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isSent: boolean;
  image?: string;
  expiresAt: Date;
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const updateTimeLeft = () => {
      const remaining = Math.max(0, message.expiresAt.getTime() - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [message.expiresAt]);

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn(
      "flex w-full",
      message.isSent ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm",
        message.isSent 
          ? "bg-chat-message-sent text-chat-message-text-sent rounded-br-sm" 
          : "bg-chat-message-received text-chat-message-text-received rounded-bl-sm"
      )}>
        {message.image && (
          <img 
            src={message.image} 
            alt="Shared image" 
            className="rounded-lg mb-2 max-w-full h-auto"
          />
        )}
        
        {message.text && (
          <p className="text-sm break-words">{message.text}</p>
        )}
        
        <div className={cn(
          "flex items-center justify-between mt-1 text-xs",
          message.isSent ? "text-chat-message-text-sent/70" : "text-chat-message-text-received/50"
        )}>
          <span>{formatTime(message.timestamp)}</span>
          {timeLeft > 0 && (
            <span className={cn(
              "ml-2 px-1 py-0.5 rounded text-xs font-mono",
              timeLeft <= 10 
                ? "bg-red-500/20 text-red-600" 
                : "bg-muted/50 text-muted-foreground"
            )}>
              {timeLeft}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;