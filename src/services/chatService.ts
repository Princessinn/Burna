import { supabase } from "@/integrations/supabase/client";
import { generateSymmetricKey, encryptMessage, decryptMessage, exportKey, importKey, generateAnonymousId } from "@/utils/encryption";

export interface Chat {
  id: string;
  max_users: number;
  message_lifespan_seconds: number;
  created_at: string;
  expires_at: string;
  is_terminated: boolean;
}

export interface Message {
  id: string;
  chat_id: string;
  encrypted_content: string;
  message_type: 'text' | 'image';
  sender_id: string;
  created_at: string;
  expires_at: string;
}

export interface DecryptedMessage {
  id: string;
  text: string;
  timestamp: Date;
  isSent: boolean;
  image?: string;
  expiresAt: Date;
}

class ChatService {
  private encryptionKey: CryptoKey | null = null;
  private anonymousId: string;

  constructor() {
    // Get or create anonymous ID
    this.anonymousId = localStorage.getItem('burna_anonymous_id') || generateAnonymousId();
    localStorage.setItem('burna_anonymous_id', this.anonymousId);
  }

  async createChat(maxUsers: number, messageLifespanSeconds: number): Promise<string> {
    const { data, error } = await supabase
      .from('chats')
      .insert({
        max_users: maxUsers,
        message_lifespan_seconds: messageLifespanSeconds,
      })
      .select()
      .single();

    if (error) throw error;

    // Generate and store encryption key for this chat
    const key = await generateSymmetricKey();
    const keyString = await exportKey(key);
    localStorage.setItem(`burna_chat_key_${data.id}`, keyString);

    return data.id;
  }

  async joinChat(chatId: string): Promise<Chat> {
    // Check if chat exists and is not terminated
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('is_terminated', false)
      .single();

    if (chatError) throw new Error('Chat not found or has been terminated');

    // Check current participants count
    const { count } = await supabase
      .from('chat_participants')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId);

    if (count && count >= chat.max_users) {
      throw new Error('Chat is full');
    }

    // Add user to participants (ignore if already exists)
    await supabase
      .from('chat_participants')
      .upsert({
        chat_id: chatId,
        anonymous_id: this.anonymousId,
      }, { onConflict: 'chat_id,anonymous_id' });

    return chat;
  }

  async loadEncryptionKey(chatId: string): Promise<void> {
    const keyString = localStorage.getItem(`burna_chat_key_${chatId}`);
    if (!keyString) {
      // Generate new key if not found (for chat participants who joined via link)
      const key = await generateSymmetricKey();
      const newKeyString = await exportKey(key);
      localStorage.setItem(`burna_chat_key_${chatId}`, newKeyString);
      this.encryptionKey = key;
    } else {
      this.encryptionKey = await importKey(keyString, "AES-GCM", ["encrypt", "decrypt"]);
    }
  }

  async sendMessage(chatId: string, text: string, messageType: 'text' | 'image' = 'text'): Promise<void> {
    if (!this.encryptionKey) {
      await this.loadEncryptionKey(chatId);
    }

    console.log('Sending message:', { messageType, textLength: text.length });

    // Get chat settings for expiration
    const { data: chat } = await supabase
      .from('chats')
      .select('message_lifespan_seconds')
      .eq('id', chatId)
      .single();

    if (!chat) throw new Error('Chat not found');

    try {
      const encryptedMessage = await encryptMessage(text, this.encryptionKey!);
      console.log('Message encrypted successfully');
      
      const expiresAt = new Date(Date.now() + (chat.message_lifespan_seconds * 1000));

      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          encrypted_content: JSON.stringify(encryptedMessage),
          message_type: messageType,
          sender_id: this.anonymousId,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }
      
      console.log('Message saved to database successfully');
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }

  async getMessages(chatId: string): Promise<DecryptedMessage[]> {
    if (!this.encryptionKey) {
      await this.loadEncryptionKey(chatId);
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const decryptedMessages: DecryptedMessage[] = [];
    
    for (const message of messages || []) {
      try {
        const encryptedData = JSON.parse(message.encrypted_content);
        const decryptedText = await decryptMessage(encryptedData, this.encryptionKey!);
        
        decryptedMessages.push({
          id: message.id,
          text: message.message_type === 'text' ? decryptedText : '',
          timestamp: new Date(message.created_at),
          isSent: message.sender_id === this.anonymousId,
          image: message.message_type === 'image' ? decryptedText : undefined,
          expiresAt: new Date(message.expires_at),
        });
      } catch (err) {
        console.error('Failed to decrypt message:', err);
      }
    }

    return decryptedMessages;
  }

  async terminateChat(chatId: string): Promise<void> {
    const { error } = await supabase
      .from('chats')
      .update({ is_terminated: true })
      .eq('id', chatId);

    if (error) throw error;

    // Clean up local storage
    localStorage.removeItem(`burna_chat_key_${chatId}`);
  }

  async getParticipantCount(chatId: string): Promise<number> {
    const { count } = await supabase
      .from('chat_participants')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId);

    return count || 0;
  }

  subscribeToMessages(chatId: string, callback: (message: DecryptedMessage) => void) {
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          try {
            if (!this.encryptionKey) {
              await this.loadEncryptionKey(chatId);
            }
            
            const message = payload.new as Message;
            const encryptedData = JSON.parse(message.encrypted_content);
            const decryptedText = await decryptMessage(encryptedData, this.encryptionKey!);
            
            callback({
              id: message.id,
              text: message.message_type === 'text' ? decryptedText : '',
              timestamp: new Date(message.created_at),
              isSent: message.sender_id === this.anonymousId,
              image: message.message_type === 'image' ? decryptedText : undefined,
              expiresAt: new Date(message.expires_at),
            });
          } catch (err) {
            console.error('Failed to decrypt real-time message:', err);
          }
        }
      )
      .subscribe();

    return channel;
  }

  getAnonymousId(): string {
    return this.anonymousId;
  }
}

export const chatService = new ChatService();