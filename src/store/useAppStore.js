import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set) => ({
      isTestMode: false,
      userLembaga: null,
      toggleTestMode: () => set((state) => ({ isTestMode: !state.isTestMode })),
      setTestMode: (value) => set({ isTestMode: value }),
      setUserLembaga: (lembaga) => set({ userLembaga: lembaga }),
    }),
    {
      name: 'yatama-app-settings', // unique name for localStorage key
    }
  )
);
