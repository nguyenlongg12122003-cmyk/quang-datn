import { create } from 'zustand'

type ChatPanel = 'support' | 'ai' | null

interface ChatUiState {
  openPanel: ChatPanel
  setOpenPanel: (panel: ChatPanel) => void
  toggle: (panel: Exclude<ChatPanel, null>) => void
}

export const useChatUiStore = create<ChatUiState>((set) => ({
  openPanel: null,
  setOpenPanel: (panel) => set({ openPanel: panel }),
  toggle: (panel) =>
    set((state) => ({ openPanel: state.openPanel === panel ? null : panel })),
}))
