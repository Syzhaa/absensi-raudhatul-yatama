import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useAppStore } from "../store/useAppStore";

export default function Dashboard() {
  const { effectiveLembaga, isLoading: isLembagaLoading } = useEffectiveLembaga();
  const selectedKelas = useAppStore((state) => state.selectedKelas);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", effectiveLembaga, selectedKelas],
    queryFn: () => attendanceService.getDashboard(effectiveLembaga, selectedKelas),
    enabled: !isLembagaLoading,
  });

  const stats = data?.data || {};

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
    {
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
  );
}
