import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../services';
import { Users, UserCog, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

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
      icon: Users,
      color: 'bg-neo-blue',
    },
    {
      label: 'Total Guru',
      value: stats.total_teachers || 0,
      icon: UserCog,
      color: 'bg-neo-pink',
    },
    {
      label: 'Siswa Hadir Hari Ini',
      value: stats.students_present_today || 0,
      icon: CheckCircle,
      color: 'bg-neo-green',
    },
    {
      label: 'Guru Hadir Hari Ini',
      value: stats.teachers_present_today || 0,
      icon: CheckCircle,
      color: 'bg-neo-yellow',
    },
    {
      label: 'Terlambat',
      value: stats.students_late || 0,
      icon: Clock,
      color: 'bg-orange-300',
    },
    {
      label: 'Izin',
      value: stats.students_permission || 0,
      icon: AlertCircle,
      color: 'bg-blue-300',
    },
    {
      label: 'Sakit',
      value: stats.students_sick || 0,
      icon: AlertCircle,
      color: 'bg-yellow-300',
    },
    {
      label: 'Alpha',
      value: stats.students_alpha || 0,
      icon: XCircle,
      color: 'bg-red-300',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold mb-2">Dashboard Absensi</h1>
        <p className="text-gray-600">
          Persentase Kehadiran: <span className="font-bold">{stats.attendance_rate || 0}%</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.color} border-3 border-black flex items-center justify-center`}>
                  <Icon size={24} />
                </div>
                <div>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
