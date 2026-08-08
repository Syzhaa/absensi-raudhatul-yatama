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
    <div className="space-y-6">
      <div className="card">
        <h1 className="font-bold text-2xl text-gray-800 mb-2">Dashboard Absensi</h1>
        <p className="font-normal text-sm text-gray-600">
          Persentase Kehadiran: <span className="font-bold text-gray-800">{stats.attendance_rate || 0}%</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          return (
            <div key={stat.label} className="card">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 ${stat.color} border-3 border-gray-900 flex items-center justify-center`}>
                  <span className={`material-symbols-outlined text-3xl ${stat.iconColor}`}>
                    {stat.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xl text-gray-800">{stat.value}</div>
                  <div className="font-normal text-sm text-gray-600 truncate">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
