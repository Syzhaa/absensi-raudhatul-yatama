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
      color: 'bg-primary-container',
      iconColor: 'text-on-primary-container',
    },
    {
      label: 'Total Guru',
      value: stats.total_teachers || 0,
      icon: 'badge',
      color: 'bg-secondary-container',
      iconColor: 'text-on-secondary-container',
    },
    {
      label: 'Siswa Hadir Hari Ini',
      value: stats.students_present_today || 0,
      icon: 'check_circle',
      color: 'bg-neo-green',
      iconColor: 'text-on-primary-container',
    },
    {
      label: 'Guru Hadir Hari Ini',
      value: stats.teachers_present_today || 0,
      icon: 'verified',
      color: 'bg-neo-yellow',
      iconColor: 'text-on-primary-container',
    },
    {
      label: 'Terlambat',
      value: stats.students_late || 0,
      icon: 'schedule',
      color: 'bg-neo-orange',
      iconColor: 'text-on-primary',
    },
    {
      label: 'Izin',
      value: stats.students_permission || 0,
      icon: 'info',
      color: 'bg-tertiary-container',
      iconColor: 'text-on-tertiary-container',
    },
    {
      label: 'Sakit',
      value: stats.students_sick || 0,
      icon: 'emergency',
      color: 'bg-neo-yellow',
      iconColor: 'text-on-primary-container',
    },
    {
      label: 'Alpha',
      value: stats.students_alpha || 0,
      icon: 'cancel',
      color: 'bg-error-container',
      iconColor: 'text-on-error-container',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="font-headline-md text-headline-md text-on-surface">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Dashboard Absensi</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Persentase Kehadiran: <span className="font-bold text-on-surface">{stats.attendance_rate || 0}%</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          return (
            <div key={stat.label} className="card">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 ${stat.color} border-3 border-outline flex items-center justify-center`}>
                  <span className={`material-symbols-outlined text-3xl ${stat.iconColor}`}>
                    {stat.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-headline-md text-headline-md text-on-surface">{stat.value}</div>
                  <div className="font-body-md text-sm text-on-surface-variant truncate">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
