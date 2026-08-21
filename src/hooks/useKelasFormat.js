import { useQuery } from "@tanstack/react-query";
import { useEffectiveLembaga } from "./useEffectiveLembaga";
import api from "../services/api";
import { convertKelasFormat } from "../utils/kelasHelper";

/**
 * Hook untuk fetch kelas_format setting dan provide converter function
 * 
 * Usage:
 *   const { formatKelas, kelasFormat, isLoading } = useKelasFormat();
 *   const displayKelas = formatKelas(student.kelas); // Auto-convert sesuai setting
 */
export function useKelasFormat() {
  const { effectiveLembaga, isLoading: isLembagaLoading } = useEffectiveLembaga();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["settings", effectiveLembaga],
    queryFn: async () => {
      const params = effectiveLembaga ? { lembaga: effectiveLembaga } : {};
      const response = await api.get(`/attendance/settings/my`, { params });
      return response.data;
    },
    enabled: !isLembagaLoading,
    staleTime: 30 * 1000,
  });

  // Default to roman if not set
  const kelasFormat = settingsData?.data?.kelas_format || "roman";

  /**
   * Convert kelas to current format setting
   * @param {string} kelas - Raw kelas value from database
   * @returns {string} Formatted kelas
   */
  const formatKelas = (kelas) => {
    if (!kelas) return kelas;
    return convertKelasFormat(kelas, kelasFormat);
  };

  return {
    formatKelas,        // Function: (kelas) => formatted kelas
    kelasFormat,        // Current format: 'roman' | 'numeric'
    isLoading,          // Loading state
  };
}
