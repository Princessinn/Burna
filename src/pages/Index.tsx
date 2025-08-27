import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, KeyRound, Flame, Ghost } from "lucide-react";
import { useTranslation } from "react-i18next";
import ChatCreation from "@/components/ChatCreation";
import ChatRoom from "@/components/ChatRoom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import doodle1 from "@/assets/doodle-1.png";
import doodle2 from "@/assets/doodle-2.png";
import doodle3 from "@/assets/doodle-3.png";

const Index = () => {
  const [view, setView] = useState<'home' | 'create' | 'chat'>('home');
  const [chatLink, setChatLink] = useState<string>('');
  const { t } = useTranslation();

  const handleChatCreated = (link: string) => {
    setChatLink(link);
    setView('chat');
  };

  const handleJoinChat = () => {
    // In a real app, this would parse the URL
    setView('chat');
  };

  if (view === 'create') {
    return <ChatCreation onChatCreated={handleChatCreated} onBack={() => setView('home')} />;
  }

  if (view === 'chat') {
    return <ChatRoom onLeave={() => setView('home')} chatLink={chatLink} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 relative overflow-hidden">
      {/* Background Doodles */}
      <div className="absolute inset-0 pointer-events-none">
        <img 
          src={doodle1} 
          alt="" 
          className="absolute top-20 left-10 w-32 h-32 opacity-10 rotate-12"
        />
        <img 
          src={doodle2} 
          alt="" 
          className="absolute top-1/3 right-16 w-28 h-28 opacity-15 -rotate-6"
        />
        <img 
          src={doodle3} 
          alt="" 
          className="absolute bottom-32 left-1/4 w-24 h-24 opacity-10 rotate-45"
        />
        <img 
          src={doodle1} 
          alt="" 
          className="absolute bottom-20 right-20 w-36 h-36 opacity-8 -rotate-12"
        />
        <img 
          src={doodle2} 
          alt="" 
          className="absolute top-1/2 left-2 w-20 h-20 opacity-12 rotate-90"
        />
        <img 
          src={doodle3} 
          alt="" 
          className="absolute top-10 right-1/3 w-22 h-22 opacity-10 -rotate-30"
        />
      </div>

      {/* Header with controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <ThemeToggle />
        <LanguageToggle />
      </div>
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary rounded-full p-4 mr-4">
              <MessageCircle className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-5xl font-bold text-primary">{t('app.title')}</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('app.subtitle')}
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6 bg-card rounded-lg border">
            <KeyRound className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('home.features.encrypted.title')}</h3>
            <p className="text-muted-foreground">{t('home.features.encrypted.description')}</p>
          </div>
          <div className="text-center p-6 bg-card rounded-lg border">
            <Flame className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('home.features.selfDestructing.title')}</h3>
            <p className="text-muted-foreground">{t('home.features.selfDestructing.description')}</p>
          </div>
          <div className="text-center p-6 bg-card rounded-lg border">
            <Ghost className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('home.features.anonymous.title')}</h3>  
            <p className="text-muted-foreground">{t('home.features.anonymous.description')}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 bg-primary hover:bg-primary-dark"
            onClick={() => setView('create')}
          >
            {t('home.createChat')}
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            {t('home.noAccount')} • {t('home.messagesDisappear')} • {t('home.shareViaLink')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;