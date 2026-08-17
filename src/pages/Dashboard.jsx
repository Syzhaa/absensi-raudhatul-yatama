import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useAppStore } from "../store/useAppStore";
import { getAutoHoliday } from "../utils/holidays";
import { format } from "date-fns";
import api from "../services/api";

export default function Dashboard() {
  const { effectiveLembaga, isLoading: isLembagaLoading } = useEffectiveLembaga();
  const selectedKelas = useAppStore((state) => state.selectedKelas);
  const queryClient = useQueryClient();

  const today = format(new Date(), "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", effectiveLembaga, selectedKelas, today],
    queryFn: () => attendanceService.getDashboard(effectiveLembaga, selectedKelas, today),
    enabled: !isLembagaLoading,
  });

  const { data: holidaysData } = useQuery({
    queryKey: ["holidays", effectiveLembaga],
    queryFn: async () => {
      try {
        const res = await api.get("/attendance/holidays", { params: { lembaga: effectiveLembaga } });
        return res.data?.data || [];
      } catch (err) {
        return [];
      }
    },
    enabled: !isLembagaLoading,
  });

  const stats = data?.data || {};

  const activeHoliday = useMemo(() => {
    const list = Array.isArray(holidaysData) ? holidaysData : [];
    const apiHoliday = list.find((h) => {
      const hStart = (h.start_date || "").substring(0, 10);
      const hEnd = (h.end_date || "").substring(0, 10);
      return today >= hStart && today <= hEnd;
    });
    if (apiHoliday) return apiHoliday;
    return getAutoHoliday(today);
  }, [holidaysData, today]);

  const isHoliday = !!activeHoliday;
  const holidayName = activeHoliday?.name || "Hari Libur Terjadwal";
  const holidayDesc = activeHoliday?.description || "Kegiatan presensi otomatis ditiadakan / ditutup untuk hari ini.";

  const statCards = [
    {
      label: "Total Siswa",
      value: stats.total_students || 0,
      icon: "groups",
      color: "bg-primary-green",
      iconColor: "text-gray-900",
    },
    {
      label: "Total Guru",
      value: stats.total_teachers || 0,
      icon: "badge",
      color: "bg-white",
      iconColor: "text-gray-900",
    },
    {
      label: "Siswa Hadir Hari Ini",
      value: stats.students_present_today || 0,
      icon: "check_circle",
      color: "bg-emerald-100",
      iconColor: "text-emerald-800",
    },
    {
      label: "Guru Hadir Hari Ini",
      value: stats.teachers_present_today || 0,
      icon: "verified",
      color: "bg-amber-100",
      iconColor: "text-amber-800",
    },
    {
      label: "Terlambat",
      value: stats.students_late || 0,
      icon: "schedule",
      color: "bg-amber-200",
      iconColor: "text-amber-900",
    },
    {
      label: "Izin",
      value: stats.students_permission || 0,
      icon: "info",
      color: "bg-purple-100",
      iconColor: "text-purple-900",
    },
    {
      label: "Sakit",
      value: stats.students_sick || 0,
      icon: "emergency",
      color: "bg-blue-100",
      iconColor: "text-blue-900",
    },
    isHoliday ? {
      label: "Libur",
      value: stats.students_libur || stats.total_students || 0,
      icon: "event",
      color: "bg-teal-200",
      iconColor: "text-teal-900",
    } : {
      label: "Alpha",
      value: stats.students_alpha || 0,
      icon: "cancel",
      color: "bg-red-100",
      iconColor: "text-red-700",
    },
  ];

  if (isLoading) {
    return (
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
        Loading data dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Holiday Banner if Today is a Holiday */}
      {isHoliday && (
        <div className="bg-emerald-400 border-2 md:border-3 border-gray-900 rounded-2xl p-4 md:p-6 shadow-neo flex items-center gap-4 text-gray-900 animate-slide-up">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-white border-2 border-gray-900 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-2xl md:text-3xl text-emerald-700">
              celebration
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-block px-2.5 py-0.5 bg-gray-900 text-emerald-300 text-[10px] md:text-xs font-black rounded-md uppercase tracking-wider mb-1">
              Hari Ini Libur
            </div>
            <h2 className="text-base md:text-xl font-black text-gray-900 truncate">
              {holidayName}
            </h2>
            <p className="text-xs font-bold text-gray-800 opacity-90">
              {holidayDesc}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className={`${stat.color} border-2 md:border-3 border-gray-900 rounded-2xl p-4 md:p-6 shadow-neo flex flex-col gap-2`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm font-black uppercase tracking-wide text-gray-700">
                {stat.label}
              </span>
              <span
                className={`material-symbols-outlined ${stat.iconColor}`}
                style={{ fontSize: "28px" }}
                aria-hidden="true"
              >
                {stat.icon}
              </span>
            </div>
            <div className="text-3xl md:text-4xl font-black text-gray-900">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
