import { create } from 'zustand';
import { supportChatApi, type ChatMessage } from '@/lib/api-service';
import { useAuthStore } from './auth-store';

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isTyping: boolean;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  fetchMessages: () => Promise<void>;
  sendMessage: (message: string, senderId: string, senderName: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isOpen: false,
  isTyping: false,

  toggleChat: () => {
    const next = !get().isOpen;
    set({ isOpen: next });
    if (next) void get().fetchMessages();
  },
  openChat: () => {
    set({ isOpen: true });
    void get().fetchMessages();
  },
  closeChat: () => set({ isOpen: false }),

  fetchMessages: async () => {
    try {
      const messages = await supportChatApi.getMessages();
      set({ messages });
    } catch {
      // keep empty list silently
    }
  },

  sendMessage: (message, _senderId, _senderName) => {
    const user = useAuthStore.getState().user;
    const optimistic: ChatMessage = {
      id: `msg-${Date.now()}`,
      channel: 'support',
      senderId: user?.id || 'guest',
      senderName: user?.name || 'Khách',
      senderRole: 'customer',
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    set({ messages: [...get().messages, optimistic] });

    supportChatApi.sendMessage(message).catch(() => {
      // still show locally even if send failed
    });

    // Show typing indicator, then refetch so admin replies appear
    set({ isTyping: true });
    setTimeout(async () => {
      set({ isTyping: false });
      try {
        const messages = await supportChatApi.getMessages();
        set({ messages });
      } catch { /* ignore */ }
    }, 2000);
  },
}));
