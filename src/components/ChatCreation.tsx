import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Copy, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { chatService } from "@/services/chatService";

interface ChatCreationProps {
  onChatCreated: (link: string) => void;
  onBack: () => void;
}

const ChatCreation = ({ onChatCreated, onBack }: ChatCreationProps) => {
  const [maxUsers, setMaxUsers] = useState<string>("2");
  const [messageLifespan, setMessageLifespan] = useState<string>("60");
  const [showLink, setShowLink] = useState(false);
  const [chatLink, setChatLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const generateChatLink = async () => {
    setIsCreating(true);
    try {
      const chatId = await chatService.createChat(
        parseInt(maxUsers),
        parseInt(messageLifespan)
      );
      const link = `${window.location.origin}/chat/${chatId}`;
      setChatLink(link);
      setShowLink(true);
      
      toast({
        title: t('chat.creation.chatCreated'),
        description: t('chat.creation.shareLink'),
      });
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast({
        title: "Error",
        description: "Failed to create chat. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(chatLink);
      setLinkCopied(true);
      toast({
        title: t('common.copied'),
        description: t('common.shareLink'),
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast({
        title: t('common.copyFailed'), 
        description: t('common.copyManually'),
        variant: "destructive"
      });
    }
  };

  const joinChat = () => {
    onChatCreated(chatLink);
  };

  if (showLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-primary">{t('chat.creation.chatCreated')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium">{t('chat.creation.chatLink')}</Label>
              <div className="flex mt-2">
                <Input value={chatLink} readOnly className="rounded-r-none" />
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-l-none border-l-0"
                  onClick={copyLink}
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div className="bg-secondary/50 p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">{t('chat.creation.chatSettings')}</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• {t('chat.creation.maxUsersLabel')} {maxUsers}</li>
                <li>• {t('chat.creation.messagesDeleteAfter')} {messageLifespan} {t('chat.creation.seconds')}</li>
                <li>• {t('chat.creation.encrypted')}</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onBack} className="flex-1">
                {t('chat.creation.createAnother')}
              </Button>
              <Button onClick={joinChat} className="flex-1 bg-primary hover:bg-primary-dark">
                {t('chat.creation.joinChat')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="text-primary">{t('chat.creation.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="maxUsers">{t('chat.creation.maxUsers')}</Label>
            <Select value={maxUsers} onValueChange={setMaxUsers}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">{t('chat.creation.users.2')}</SelectItem>
                <SelectItem value="3">{t('chat.creation.users.3')}</SelectItem>
                <SelectItem value="5">{t('chat.creation.users.5')}</SelectItem>
                <SelectItem value="10">{t('chat.creation.users.10')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lifespan">{t('chat.creation.messageLifespan')}</Label>
            <Select value={messageLifespan} onValueChange={setMessageLifespan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">{t('chat.creation.lifespan.30')}</SelectItem>
                <SelectItem value="60">{t('chat.creation.lifespan.60')}</SelectItem>
                <SelectItem value="300">{t('chat.creation.lifespan.300')}</SelectItem>
                <SelectItem value="600">{t('chat.creation.lifespan.600')}</SelectItem>
                <SelectItem value="1800">{t('chat.creation.lifespan.1800')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-secondary/50 p-4 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">{t('chat.creation.privacyFeatures')}</p>
            <ul className="space-y-1">
              <li>✓ {t('chat.creation.features.0')}</li>
              <li>✓ {t('chat.creation.features.1')}</li>
              <li>✓ {t('chat.creation.features.2')}</li>
              <li>✓ {t('chat.creation.features.3')}</li>
            </ul>
          </div>

          <Button 
            onClick={generateChatLink} 
            className="w-full bg-primary hover:bg-primary-dark"
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('chat.creation.creating')}
              </>
            ) : (
              t('chat.creation.generateLink')
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatCreation;