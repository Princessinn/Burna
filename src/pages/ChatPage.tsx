import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import ChatRoom from "@/components/ChatRoom";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const ChatPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (chatId) {
      // Simple validation - in real app this would check if chat exists
      setTimeout(() => {
        setIsValid(!!chatId);
        setIsValidating(false);
      }, 1000);
    } else {
      setIsValidating(false);
    }
  }, [chatId]);

  const handleLeave = () => {
    window.location.href = '/';
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-chat-bg flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold mb-2">{t('chat.room.validating')}</h2>
          <p className="text-muted-foreground">{t('chat.room.pleaseWait')}</p>
        </Card>
      </div>
    );
  }

  if (!isValid || !chatId) {
    return (
      <div className="min-h-screen bg-chat-bg flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('chat.room.invalidLink')}</h2>
          <p className="text-muted-foreground mb-4">{t('chat.room.linkExpiredOrInvalid')}</p>
          <Button onClick={handleLeave}>{t('common.goHome')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <ChatRoom 
      onLeave={handleLeave} 
      chatLink={`${window.location.origin}/chat/${chatId}`} 
    />
  );
};

export default ChatPage;