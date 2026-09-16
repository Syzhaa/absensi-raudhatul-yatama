import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { useEffectiveLembaga } from "./useEffectiveLembaga";

export function useAttendanceSettings() {
  const { effectiveLembaga } = useEffectiveLembaga();

  const query = useQuery({
    queryKey: ["attendance-settings", effectiveLembaga],
    queryFn: async () => {
      const res = await api.get("/attendance/settings", {
        params: effectiveLembaga ? { lembaga: effectiveLembaga } : {},
      });
      return res.data?.data || res.data;
    },
    staleTime: 0, // Selalu fresh saat berpindah halaman tanpa perlu hard refresh
    refetchOnMount: "always",
  });

  const enableTeacherAttendance =
    query.data?.enable_teacher_attendance !== undefined && query.data?.enable_teacher_attendance !== null
      ? Boolean(Number(query.data.enable_teacher_attendance))
      : true;

  const enableLocationCheck =
    query.data?.enable_location_check !== undefined && query.data?.enable_location_check !== null
      ? Boolean(Number(query.data.enable_location_check))
      : true;

  return {
    ...query,
    settings: query.data,
    enableTeacherAttendance,
    enableLocationCheck,
  };
}
