import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, GraduationCap } from 'lucide-react';
import api from '../services/api';

const attendanceService = {
  getStudentAttendance: async (date, type = null) => {
    const params = { date };
    if (type) params.type = type;
    const response = await api.get('/attendance/logs/students', { params });
    return response.data;
  },
  getTeacherAttendance: async (date, type = null) => {
    const params = { date };
    if (type) params.type = type;
    const response = await api.get('/attendance/logs/teachers', { params });
    return response.data;
  },
};

const TAB_CONFIG = [
  { id: 'masuk_siswa', label: 'Masuk Siswa', type: 'check_in', role: 'student', color: 'bg-green-500' },
  { id: 'pulang_siswa', label: 'Pulang Siswa', type: 'check_out', role: 'student', color: 'bg-blue-500' },
  { id: 'masuk_guru', label: 'Masuk Guru', type: 'check_in', role: 'teacher', color: 'bg-green-500' },
  { id: 'pulang_guru', label: 'Pulang Guru', type: 'check_out', role: 'teacher', color: 'bg-blue-500' },
];

function AttendanceCard({ attendance, isStudent }) {
  const person = isStudent ? attendance.student : attendance.teacher;
  const identifier = isStudent ? person?.kelas : person?.nip;
  return (
    <div className="bg-white border-3 border-black p-3 space-y-1">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{person?.nama}</p>
          <p className="text-sm text-gray-600">{identifier}</p>
        </div>
        <span className={'px-2 py-0.5 text-xs font-bold border-2 border-black flex-shrink-0 ' +
          (attendance.status === 'hadir' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black')
        }>
          {attendance.status?.toUpperCase()}
        </span>
      </div>
      <div className="flex gap-2 text-sm">
        {attendance.check_in && (
          <span className="bg-green-50 border border-green-300 px-2 py-0.5 font-mono text-green-700 font-bold">
            In: {attendance.check_in}
          </span>
        )}
        {attendance.check_out && (
          <span className="bg-blue-50 border border-blue-300 px-2 py-0.5 font-mono text-blue-700 font-bold">
            Out: {attendance.check_out}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Attendance() {
  const [activeTab, setActiveTab] = useState('masuk_siswa');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const tabConfig = TAB_CONFIG.find(t => t.id === activeTab);
  const isStudent = tabConfig?.role === 'student';
  const attendanceType = tabConfig?.type;

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance', selectedDate, activeTab],
    queryFn: () => {
      if (isStudent) {
        return attendanceService.getStudentAttendance(selectedDate, attendanceType);
      } else {
        return attendanceService.getTeacherAttendance(selectedDate, attendanceType);
      }
    },
  });

  const records = attendanceData?.data || [];

  const getCountForTab = (tabId) => tabId === activeTab ? records.length : '?';

  const renderContent = () => {
    if (isLoading) return <p className="text-center py-8 text-gray-600">Loading...</p>;

    if (records.length === 0) {
      const Icon = isStudent ? GraduationCap : Users;
      return (
        <div className="text-center py-12">
          <Icon size={48} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600">{isStudent ? 'Belum ada data absensi siswa' : 'Belum ada data absensi guru'}</p>
          <p className="text-gray-500 text-sm">tanggal {selectedDate}</p>
        </div>
      );
    }

    return (
      <>
        {/* Mobile: card layout */}
        <div className="md:hidden space-y-2">
          {records.map((a) => (
            <AttendanceCard key={a.id} attendance={a} isStudent={isStudent} />
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-3 border-black">
            <thead>
              <tr className="border-b-3 border-black bg-neo-bg">
                <th className="text-left py-3 px-4">Nama</th>
                <th className="text-left py-3 px-4">{isStudent ? 'Kelas' : 'NIP'}</th>
                <th className="text-left py-3 px-4">Check-in</th>
                <th className="text-left py-3 px-4">Check-out</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((attendance) => {
                const person = isStudent ? attendance.student : attendance.teacher;
                const identifier = isStudent ? person?.kelas : person?.nip;
                return (
                  <tr key={attendance.id} className="border-b border-gray-300">
                    <td className="py-3 px-4 font-bold">{person?.nama}</td>
                    <td className="py-3 px-4">{identifier}</td>
                    <td className="py-3 px-4">
                      {attendance.check_in ? (
                        <span className="font-mono text-green-600 font-bold">{attendance.check_in}</span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      {attendance.check_out ? (
                        <span className="font-mono text-blue-600 font-bold">{attendance.check_out}</span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={'px-3 py-1 font-bold border-2 border-black ' +
                        (attendance.status === 'hadir' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black')
                      }>
                        {attendance.status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Calendar size={28} className="text-neo-pink" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Log Absensi</h1>
            <p className="text-sm text-gray-600">Riwayat absensi siswa dan guru</p>
          </div>
        </div>

        {/* Date Filter */}
        <div className="mb-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input w-full max-w-xs"
          />
        </div>

        {/* 4 Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={'py-2 px-3 font-bold border-3 border-black transition-all flex items-center justify-center gap-2 text-sm ' +
                (activeTab === tab.id ? 'bg-neo-pink shadow-neo' : 'bg-white shadow-neo hover:shadow-neo-lg')
              }
            >
              <span>{tab.type === 'check_in' ? '🟢' : '🔵'}</span>
              <span className="truncate">{tab.label}</span>
              <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 border border-gray-400">
                {getCountForTab(tab.id)}
              </span>
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
