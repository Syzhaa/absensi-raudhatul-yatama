import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  { id: 'masuk_siswa', label: 'Masuk Siswa', type: 'check_in', role: 'student', color: 'bg-primary-green', icon: '🟢' },
  { id: 'pulang_siswa', label: 'Pulang Siswa', type: 'check_out', role: 'student', color: 'bg-primary-purple', icon: '🔵' },
  { id: 'masuk_guru', label: 'Masuk Guru', type: 'check_in', role: 'teacher', color: 'bg-primary-green', icon: '🟢' },
  { id: 'pulang_guru', label: 'Pulang Guru', type: 'check_out', role: 'teacher', color: 'bg-gray-100', icon: '🔵' },
];

function AttendanceCard({ attendance, isStudent }) {
  const person = isStudent ? attendance.student : attendance.teacher;
  const identifier = isStudent ? person?.kelas : person?.nip;
  return (
    <div className="bg-white border-3 border-gray-900 p-3 space-y-1">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base text-gray-800 truncate">{person?.nama}</p>
          <p className="font-normal text-sm text-gray-600">{identifier}</p>
        </div>
        <span className={'px-2 py-0.5 text-xs font-bold border-2 border-gray-900 flex-shrink-0 ' +
          (attendance.status === 'hadir' ? 'bg-primary-green text-white' : 'bg-yellow-200 text-gray-800')
        }>
          {attendance.status?.toUpperCase()}
        </span>
      </div>
      <div className="flex gap-2 text-sm">
        {attendance.check_in && (
          <span className="bg-primary-green border border-gray-900 px-2 py-0.5 font-mono text-gray-800 font-bold">
            In: {attendance.check_in}
          </span>
        )}
        {attendance.check_out && (
          <span className="bg-purple-100 border border-gray-900 px-2 py-0.5 font-mono text-white font-bold">
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
  const queryClient = useQueryClient();
  const eventSourceRef = useRef(null);

  const tabConfig = TAB_CONFIG.find(t => t.id === activeTab);
  const isStudent = tabConfig?.role === 'student';
  const attendanceType = tabConfig?.type;

  // Load ALL tab counts in parallel
  const { data: tabCounts } = useQuery({
    queryKey: ['attendance_counts', selectedDate],
    queryFn: async () => {
      const results = await Promise.all(
        TAB_CONFIG.map(tab =>
          tab.role === 'student'
            ? attendanceService.getStudentAttendance(selectedDate, tab.type)
            : attendanceService.getTeacherAttendance(selectedDate, tab.type)
        )
      );
      return Object.fromEntries(
        TAB_CONFIG.map((tab, i) => [tab.id, results[i].data?.length || 0])
      );
    },
  });

  // Active tab data
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

  const getCountForTab = (tabId) => tabCounts?.[tabId] ?? 0;

  // SSE realtime updates
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const baseURL = api.defaults.baseURL || '';
    const url = `${baseURL}/attendance/logs/stream?date=${selectedDate}`;
    
    eventSourceRef.current = new EventSource(url);

    eventSourceRef.current.onmessage = () => {
      // Invalidate all queries when new attendance arrives
      queryClient.invalidateQueries(['attendance']);
      queryClient.invalidateQueries(['attendance_counts']);
    };

    eventSourceRef.current.onerror = () => {
      eventSourceRef.current?.close();
    };

    return () => {
      eventSourceRef.current?.close();
    };
  }, [selectedDate, queryClient]);

  const renderContent = () => {
    if (isLoading) return <p className="text-center py-8 font-normal text-gray-600">Loading...</p>;

    if (records.length === 0) {
      const icon = isStudent ? 'school' : 'badge';
      return (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl mx-auto mb-3 text-gray-600 block">{icon}</span>
          <p className="font-normal text-sm text-gray-600">
            {isStudent ? 'Belum ada data absensi siswa' : 'Belum ada data absensi guru'}
          </p>
          <p className="font-normal text-sm text-gray-600">tanggal {selectedDate}</p>
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
          <table className="w-full border-3 border-gray-900">
            <thead>
              <tr className="border-b-3 border-gray-900 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-base text-gray-800">Nama</th>
                <th className="text-left py-3 px-4 font-semibold text-base text-gray-800">{isStudent ? 'Kelas' : 'NIP'}</th>
                <th className="text-left py-3 px-4 font-semibold text-base text-gray-800">Check-in</th>
                <th className="text-left py-3 px-4 font-semibold text-base text-gray-800">Check-out</th>
                <th className="text-left py-3 px-4 font-semibold text-base text-gray-800">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((attendance) => {
                const person = isStudent ? attendance.student : attendance.teacher;
                const identifier = isStudent ? person?.kelas : person?.nip;
                return (
                  <tr key={attendance.id} className="border-b border-gray-900-variant">
                    <td className="py-3 px-4 font-normal text-gray-800">{person?.nama}</td>
                    <td className="py-3 px-4 font-normal text-gray-600">{identifier}</td>
                    <td className="py-3 px-4">
                      {attendance.check_in ? (
                        <span className="font-mono text-green-700 font-bold">{attendance.check_in}</span>
                      ) : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      {attendance.check_out ? (
                        <span className="font-mono text-purple-600 font-bold">{attendance.check_out}</span>
                      ) : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={'px-3 py-1 font-bold border-2 border-gray-900 ' +
                        (attendance.status === 'hadir' ? 'bg-primary-green text-white' : 'bg-yellow-200 text-gray-800')
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
          <span className="material-symbols-outlined text-4xl text-purple-600">calendar_month</span>
          <div>
            <h1 className="font-bold text-2xl text-gray-800">Log Absensi</h1>
            <p className="font-normal text-sm text-gray-600">Riwayat absensi siswa dan guru</p>
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
              className={'py-2 px-3 font-semibold border-3 border-gray-900 transition-all flex items-center justify-center gap-2 text-sm neo-btn ' +
                (activeTab === tab.id ? 'bg-primary-green text-gray-800 shadow-neo' : 'bg-white text-gray-800 shadow-neo hover:clean-shadow-md')
              }
            >
              <span>{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
              <span className="text-xs font-mono bg-gray-50 text-gray-800 px-1.5 py-0.5 border border-gray-900-variant">
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
