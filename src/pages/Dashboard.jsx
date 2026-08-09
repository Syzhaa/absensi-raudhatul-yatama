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
      iconColor: 'text-gray-800',
    },
    {
      label: 'Total Guru',
      value: stats.total_teachers || 0,
      icon: 'badge',
      color: 'bg-gray-100',
      iconColor: 'text-gray-800',
    },
    {
      label: 'Siswa Hadir Hari Ini',
      value: stats.students_present_today || 0,
      icon: 'check_circle',
      color: 'bg-primary-green',
      iconColor: 'text-gray-800',
    },
    {
      label: 'Guru Hadir Hari Ini',
      value: stats.teachers_present_today || 0,
      icon: 'verified',
      color: 'bg-yellow-200',
      iconColor: 'text-gray-800',
    },
    {
      label: 'Terlambat',
      value: stats.students_late || 0,
      icon: 'schedule',
      color: 'bg-primary-green',
      iconColor: 'text-white',
    },
    {
      label: 'Izin',
      value: stats.students_permission || 0,
      icon: 'info',
      color: 'bg-purple-100',
      iconColor: 'text-white',
    },
    {
      label: 'Sakit',
      value: stats.students_sick || 0,
      icon: 'emergency',
      color: 'bg-yellow-200',
      iconColor: 'text-gray-800',
    },
    {
      label: 'Alpha',
      value: stats.students_alpha || 0,
      icon: 'cancel',
      color: 'bg-red-100',
      iconColor: 'text-red-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="font-bold text-xl text-gray-800">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid 2x2 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {statCards.map((stat) => (
          <div 
            key={stat.label} 
            className={`${stat.color} border-3 border-gray-900 rounded-xl p-3 md:p-4 flex flex-col items-center justify-center text-center clean-shadow-sm hover:clean-shadow-md transition-all`}
          >
            {/* Icon */}
            <span className={`material-symbols-outlined text-2xl md:text-3xl mb-1 ${stat.iconColor}`}>
              {stat.icon}
            </span>
            
            {/* Value */}
            <div className="font-black text-xl md:text-2xl text-gray-800 mb-0.5">
              {stat.value}
            </div>
            
            {/* Label */}
            <div className="font-bold text-xs md:text-sm text-gray-800 leading-tight">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
