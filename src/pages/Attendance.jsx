import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

function AttendanceItem({ item }) {
  const isStudent = item.role === 'student';
  const person = isStudent ? item.student : item.teacher;
  const label = isStudent ? `${person?.kelas || ''} (Siswa)` : `${person?.nip || ''} (Guru)`;
  return (
    <div className="bg-white clean-border clean-shadow-sm p-3 space-y-1">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-gray-800 truncate">{person?.nama}</p>
          <p className="font-normal text-sm text-gray-600 truncate">{label}</p>
        </div>
        <span className={'px-2 py-0.5 text-xs font-bold clean-border flex-shrink-0 ' +
          (item.status === 'hadir' ? 'bg-primary-green text-gray-800' : 'bg-yellow-200 text-gray-800')
        }>
          {item.status?.toUpperCase()}
        </span>
      </div>
      <div className="flex gap-2 text-sm flex-wrap">
        {item.check_in && (
          <span className="bg-primary-green clean-border px-2 py-0.5 font-mono text-gray-800 font-bold">In {item.check_in}</span>
        )}
        {item.check_out && (
          <span className="bg-primary-purple clean-border px-2 py-0.5 font-mono text-white font-bold">Out {item.check_out}</span>
        )}
      </div>
    </div>
  );
}

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState('all'); // all | student | teacher
  const queryClient = useQueryClient();
  const eventSourceRef = useRef(null);

  const { data: studentData } = useQuery({
    queryKey: ['attendance_students', selectedDate],
    queryFn: () => api.get('/attendance/logs/students', { params: { date: selectedDate } }),
  });

  const { data: teacherData } = useQuery({
    queryKey: ['attendance_teachers', selectedDate],
    queryFn: () => api.get('/attendance/logs/teachers', { params: { date: selectedDate } }),
  });

  // Combine + sort newest first by created_at (fallback: id desc)
  const allItems = [
    ...(studentData?.data || []).map((a) => ({ ...a, role: 'student' })),
    ...(teacherData?.data || []).map((a) => ({ ...a, role: 'teacher' })),
  ];

  const records = allItems
    .filter((a) => filter === 'all' || a.role === filter)
    .sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      if (ta !== tb) return tb - ta;
      return (b.id || 0) - (a.id || 0);
    });

  // SSE realtime updates - invalidates all queries when new attendance arrives
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const baseURL = api.defaults.baseURL || '';
    const url = `${baseURL}/attendance/logs/stream?date=${selectedDate}`;

    eventSourceRef.current = new EventSource(url);

    eventSourceRef.current.onmessage = () => {
      queryClient.invalidateQueries(['attendance_students']);
      queryClient.invalidateQueries(['attendance_teachers']);
    };

    eventSourceRef.current.onerror = () => {
      eventSourceRef.current?.close();
    };

    return () => {
      eventSourceRef.current?.close();
    };
  }, [selectedDate, queryClient]);

  return (
    <div className="space-y-4">
      {/* Filter bar: date + dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input w-auto"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-auto cursor-pointer"
          >
            <option value="all">Semua</option>
            <option value="student">Siswa</option>
            <option value="teacher">Guru</option>
          </select>
        </div>
        <p className="font-normal text-sm text-gray-600">
          {records.length} absensi
        </p>
      </div>

      {/* Card list */}
      <div className="space-y-2">
        {records.length === 0 ? (
          <div className="card text-center py-10">
            <p className="font-normal text-sm text-gray-600">Belum ada data absensi pada tanggal {selectedDate}</p>
          </div>
        ) : (
          records.map((a) => <AttendanceItem key={`${a.role}-${a.id}`} item={a} />)
        )}
      </div>
    </div>
  );
}
