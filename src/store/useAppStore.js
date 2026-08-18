import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAppStore = create(
  persist(
    (set) => ({
      userLembaga: null,
      userRole: null,
      selectedKelas: null,
      superAdminLembaga: "MA", // Super Admin lembaga override (MA or MTs)
      setUserLembaga: (lembaga) => set({ userLembaga: lembaga }),
      setUserRole: (role) => set({ userRole: role }),
      setSelectedKelas: (kelas) => set({ selectedKelas: kelas }),
      setSuperAdminLembaga: (lembaga) => set({ superAdminLembaga: lembaga }),
    }),
    {
      name: "yatama-app-settings", // unique name for localStorage key
    },
  ),
);
