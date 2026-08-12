import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../store/useAppStore";
import api from "../services/api";

/**
 * Hook to get effective lembaga for API calls
 * - Super Admin: use superAdminLembaga from store
 * - Other roles: use userLembaga from auth
 */
export function useEffectiveLembaga() {
  const userLembaga = useAppStore((state) => state.userLembaga);
  const superAdminLembaga = useAppStore((state) => state.superAdminLembaga);

  // Fetch user profile to check role
  const { data: userData, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  const isSuperAdmin = userData?.data?.role === "super_admin";

  // Super Admin uses selector, others use their own lembaga
  const effectiveLembaga = isSuperAdmin ? superAdminLembaga : userLembaga;

  return {
    effectiveLembaga,
    isSuperAdmin,
    isLoading,
  };
}
