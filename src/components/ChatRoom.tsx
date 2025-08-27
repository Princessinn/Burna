import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Image, X, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import MessageBubble from "./MessageBubble";
import { chatService, DecryptedMessage } from "@/services/chatService";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isSent: boolean;
  image?: string;
  expiresAt: Date;
}

interface ChatRoomProps {
  onLeave: () => void;
  chatLink: string;
}

const ChatRoom = ({ onLeave, chatLink }: ChatRoomProps) => {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [connectedUsers, setConnectedUsers] = useState(1);
  const [isTerminating, setIsTerminating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatId, setChatId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Extract chat ID from link
  useEffect(() => {
    const url = new URL(chatLink);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    setChatId(id);
  }, [chatLink]);

  // Initialize chat and load messages
  useEffect(() => {
    if (!chatId) return;

    const initializeChat = async () => {
      setIsJoining(true);
      try {
        await chatService.joinChat(chatId);
        const existingMessages = await chatService.getMessages(chatId);
        setMessages(existingMessages);
        
        // Update participant count
        const count = await chatService.getParticipantCount(chatId);
        setConnectedUsers(count);

        // Subscribe to real-time messages
        const channel = chatService.subscribeToMessages(chatId, (newMessage) => {
          setMessages(prev => [...prev, newMessage]);
        });
        channelRef.current = channel;

      } catch (error) {
        console.error('Failed to join chat:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to join chat",
          variant: "destructive"
        });
        onLeave();
      } finally {
        setIsJoining(false);
        setIsLoading(false);
      }
    };

    initializeChat();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [chatId, onLeave, toast]);

  // Auto-delete expired messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(prev => prev.filter(msg => new Date() < msg.expiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || isSending) return;

    setIsSending(true);
    try {
      await chatService.sendMessage(chatId, newMessage, 'text');
      setNewMessage("");
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !chatId) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Only images are allowed.",
        variant: "destructive"
      });
      return;
    }

    // Reduce size limit to 1MB for better reliability
    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 1MB.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        console.log('Starting image upload...');
        const imageData = e.target?.result as string;
        console.log('Image data length:', imageData.length);
        
        // Compress large images by reducing quality
        if (imageData.length > 100000) { // If base64 is over 100KB
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = document.createElement('img') as HTMLImageElement;
          
          img.onload = async () => {
            // Calculate new dimensions (max 800x600)
            let { width, height } = img;
            const maxWidth = 800;
            const maxHeight = 600;
            
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            
            const compressedData = canvas.toDataURL('image/jpeg', 0.7);
            console.log('Compressed image data length:', compressedData.length);
            
            try {
              await chatService.sendMessage(chatId, compressedData, 'image');
              console.log('Image sent successfully');
            } catch (error) {
              console.error('Failed to send compressed image:', error);
              toast({
                title: "Error",
                description: "Failed to send image. Please try again.",
                variant: "destructive"
              });
            } finally {
              setIsSending(false);
            }
          };
          
          img.src = imageData;
        } else {
          // Send original if small enough
          await chatService.sendMessage(chatId, imageData, 'image');
          console.log('Image sent successfully');
          setIsSending(false);
        }
        
      } catch (error) {
        console.error('Failed to send image:', error);
        toast({
          title: "Error",
          description: "Failed to send image. Please try again.",
          variant: "destructive"
        });
        setIsSending(false);
      }
    };
    
    reader.onerror = () => {
      console.error('Failed to read file');
      toast({
        title: "Error",
        description: "Failed to read image file.",
        variant: "destructive"
      });
      setIsSending(false);
    };
    
    reader.readAsDataURL(file);
  };

  const terminateChat = async () => {
    if (!chatId) return;
    
    setIsTerminating(true);
    try {
      await chatService.terminateChat(chatId);
      toast({
        title: t('chat.room.terminating'),
        description: t('chat.room.allDeleted'),
      });
      
      setTimeout(() => {
        setMessages([]);
        onLeave();
      }, 2000);
    } catch (error) {
      console.error('Failed to terminate chat:', error);
      toast({
        title: "Error",
        description: "Failed to terminate chat.",
        variant: "destructive"
      });
      setIsTerminating(false);
    }
  };

  if (isLoading || isJoining) {
    return (
      <div className="min-h-screen bg-chat-bg flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold mb-2">
            {isJoining ? t('chat.room.joining') : t('chat.room.loading')}
          </h2>
          <p className="text-muted-foreground">
            {t('chat.room.pleaseWait')}
          </p>
        </Card>
      </div>
    );
  }

  if (isTerminating) {
    return (
      <div className="min-h-screen bg-chat-bg flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('chat.room.chatTerminated')}</h2>
          <p className="text-muted-foreground">{t('chat.room.allMessagesDeleted')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chat-bg flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{t('chat.room.title')}</h2>
          <p className="text-sm opacity-90">{connectedUsers} {t('chat.room.usersConnected')}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={terminateChat}
            className="bg-red-600 hover:bg-red-700"
          >
            {t('chat.room.terminateChat')}
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onLeave}
            className="text-primary-foreground hover:bg-primary-light"  
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-background border-t">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="w-4 h-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t('chat.room.typePlaceholder')}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            className="flex-1"
            disabled={isSending}
          />
          <Button 
            onClick={sendMessage} 
            className="bg-primary hover:bg-primary-dark"
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;