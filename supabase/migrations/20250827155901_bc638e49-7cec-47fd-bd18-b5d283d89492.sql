-- Create chats table for anonymous chat rooms
CREATE TABLE public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  max_users INTEGER NOT NULL DEFAULT 2,
  message_lifespan_seconds INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  is_terminated BOOLEAN NOT NULL DEFAULT false
);

-- Create messages table for encrypted messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image')),
  sender_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create chat_participants table for tracking anonymous users
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  anonymous_id TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, anonymous_id)
);

-- Enable Row Level Security (public access since no auth)
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "Allow public access to chats" ON public.chats FOR ALL USING (true);
CREATE POLICY "Allow public access to messages" ON public.messages FOR ALL USING (true);
CREATE POLICY "Allow public access to participants" ON public.chat_participants FOR ALL USING (true);

-- Enable realtime for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create function to automatically delete expired messages
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM public.messages WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically delete expired chats
CREATE OR REPLACE FUNCTION delete_expired_chats()
RETURNS void AS $$
BEGIN
  DELETE FROM public.chats WHERE expires_at < now() OR is_terminated = true;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_expires_at ON public.messages(expires_at);
CREATE INDEX idx_chats_expires_at ON public.chats(expires_at);
CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants(chat_id);