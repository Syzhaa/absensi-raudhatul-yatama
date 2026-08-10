import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../services';

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => attendanceService.getDashboard(),
  });

  const stats = data?.data || {};

  const statCards = [
    {
      label: 'Total Siswa',
      value: stats.total_students || 0,
      icon: 'groups',
      color: 'bg-primary-green',
      iconColor: 'text-gray-900',
    },
    {
      label: 'Total Guru',
      value: stats.total_teachers || 0,
      icon: 'badge',
      color: 'bg-white',
      iconColor: 'text-gray-900',
    },
    {
      label: 'Siswa Hadir Hari Ini',
      value: stats.students_present_today || 0,
      icon: 'check_circle',
      color: 'bg-emerald-100',
      iconColor: 'text-emerald-800',
    },
    {
      label: 'Guru Hadir Hari Ini',
      value: stats.teachers_present_today || 0,
      icon: 'verified',
      color: 'bg-amber-100',
      iconColor: 'text-amber-800',
    },
    {
      label: 'Terlambat',
      value: stats.students_late || 0,
      icon: 'schedule',
      color: 'bg-amber-200',
      iconColor: 'text-amber-900',
    },
    {
      label: 'Izin',
      value: stats.students_permission || 0,
      icon: 'info',
      color: 'bg-purple-100',
      iconColor: 'text-purple-900',
    },
    {
      label: 'Sakit',
      value: stats.students_sick || 0,
      icon: 'emergency',
      color: 'bg-blue-100',
      iconColor: 'text-blue-900',
    },
    {
      label: 'Alpha',
      value: stats.students_alpha || 0,
      icon: 'cancel',
      color: 'bg-red-100',
      iconColor: 'text-red-700',
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
    <div className="space-y-4 landscape:space-y-2 pb-28 md:pb-12">
      {/* Header Compact Card Banner */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 landscape:py-2 shadow-neo flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl landscape:text-lg font-black text-gray-800 tracking-tight">Dashboard</h1>
          <span className="px-2.5 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 border-2 border-gray-900 rounded-full">
            Hari ini
          </span>
        </div>
        <div className="text-[10px] md:text-xs font-bold text-gray-500">
          Raudhatul Yatama
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 landscape:grid-cols-4 gap-3 md:grid-cols-4 md:gap-4">
        {statCards.map((stat) => (
          <div 
            key={stat.label} 
            className={`${stat.color} border-2 md:border-3 border-gray-900 rounded-2xl p-4 landscape:p-2 flex flex-col items-center justify-center text-center shadow-neo hover:clean-shadow-md transition-all`}
          >
            <div className={`w-10 h-10 landscape:w-8 landscape:h-8 rounded-full bg-white/50 border border-gray-900/10 flex items-center justify-center mb-2 landscape:mb-1 ${stat.iconColor}`}>
              <span className="material-symbols-outlined landscape:text-lg">{stat.icon}</span>
            </div>
            <h3 className="font-bold text-[10px] landscape:text-[9px] md:text-xs text-gray-700 uppercase tracking-wider mb-0.5">{stat.label}</h3>
            <p className={`text-2xl landscape:text-xl md:text-3xl font-black ${stat.iconColor}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
