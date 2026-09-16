import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAppStore = create(
  persist(
    (set) => ({
      userId: null,
      userName: null,
      userEmail: null,
      userLembaga: null,
      userRole: null,
      userPermissions: null,
      selectedKelas: null,
      superAdminLembaga: "MA", // Super Admin lembaga override (MA or MTs)
      setUserId: (id) => set({ userId: id }),
      setUserName: (name) => set({ userName: name }),
      setUserEmail: (email) => set({ userEmail: email }),
      setUserLembaga: (lembaga) => set({ userLembaga: lembaga }),
      setUserRole: (role) => set({ userRole: role }),
      setUserPermissions: (permissions) => set({ userPermissions: permissions }),
      setSelectedKelas: (kelas) => set({ selectedKelas: kelas }),
      setSuperAdminLembaga: (lembaga) => set({ superAdminLembaga: lembaga }),
    }),
    {
      name: "yatama-app-settings", // unique name for localStorage key
    },
  ),
);

export default useAppStore;
