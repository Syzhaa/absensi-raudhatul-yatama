import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const AttendanceItem = memo(function AttendanceItem({ item }) {
  const isStudent = item.role === 'student';
  const person = isStudent ? item.student : item.teacher;
  const subtitle = isStudent 
    ? `Kelas ${person?.kelas || '-'} (${item.lembaga?.toUpperCase() || 'MA'})`
    : `${person?.nip ? 'NIP: ' + person.nip : 'Guru'} (${item.lembaga?.toUpperCase() || 'MA'})`;

  return (
    <div className="bg-white border-2 md:border-3 border-gray-900 rounded-xl md:rounded-2xl p-3.5 md:p-4 shadow-neo transition-all space-y-3">
      {/* Top Row: Name, Role Badge, Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base md:text-lg text-gray-900 truncate leading-snug">
              {person?.nama || 'Tanpa Nama'}
            </h3>
            
            {/* Role Badge */}
            <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${
              isStudent ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-purple-100 text-purple-800 border-purple-300'
            }`}>
              {isStudent ? 'Siswa' : 'Guru'}
            </span>
          </div>

          <p className="text-xs text-gray-500 font-medium">
            {subtitle}
          </p>
        </div>

        {/* Status Badge */}
        <span className={`px-2.5 py-1 text-xs font-black rounded-md border-2 border-gray-900 flex-shrink-0 ${
          item.status === 'hadir' 
            ? 'bg-primary-green text-gray-900' 
            : item.status === 'terlambat'
            ? 'bg-amber-300 text-gray-900'
            : 'bg-red-200 text-red-900'
        }`}>
          {item.status?.toUpperCase() || 'HADIR'}
        </span>
      </div>

      {/* Bottom Row: Check-in / Check-out Time Badges */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
        {item.check_in ? (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold">
            <span className="material-symbols-outlined text-sm text-emerald-700">login</span>
            Masuk: <strong className="font-black text-gray-900">{item.check_in}</strong>
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium">
            Belum Masuk
          </span>
        )}

        {item.check_out ? (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-xs font-bold">
            <span className="material-symbols-outlined text-sm text-purple-700">logout</span>
            Pulang: <strong className="font-black text-gray-900">{item.check_out}</strong>
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium">
            Belum Pulang
          </span>
        )}
      </div>
    </div>
  );
});

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [roleFilter, setRoleFilter] = useState('all'); // all | student | teacher
  const [statusFilter, setStatusFilter] = useState('all'); // all | masuk | pulang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();
  const eventSourceRef = useRef(null);

  const { data: studentData, isLoading: isStudentLoading } = useQuery({
    queryKey: ['attendance_students', selectedDate],
    queryFn: async () => {
      try {
        const res = await api.get('/attendance/logs/students', { params: { date: selectedDate } });
        return res.data;
      } catch (err) {
        console.error('Student attendance fetch failed:', err);
        return [];
      }
    }
  });

  const { data: teacherData, isLoading: isTeacherLoading } = useQuery({
    queryKey: ['attendance_teachers', selectedDate],
    queryFn: async () => {
      try {
        const res = await api.get('/attendance/logs/teachers', { params: { date: selectedDate } });
        return res.data;
      } catch (err) {
        console.error('Teacher attendance fetch failed:', err);
        return [];
      }
    }
  });

  const isLoading = isStudentLoading || isTeacherLoading;

  // Combine + sort newest first
  const allItems = useMemo(() => {
    return [
      ...(studentData?.data || []).map((a) => ({ ...a, role: 'student' })),
      ...(teacherData?.data || []).map((a) => ({ ...a, role: 'teacher' })),
    ];
  }, [studentData, teacherData]);

  const records = useMemo(() => {
    return allItems
      .filter((a) => {
        // Role filter
        if (roleFilter !== 'all' && a.role !== roleFilter) return false;
        
        // Status filter
        if (statusFilter === 'masuk' && !a.check_in) return false;
        if (statusFilter === 'pulang' && !a.check_out) return false;
        
        return true;
      })
      .sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        if (ta !== tb) return tb - ta;
        return (b.id || 0) - (a.id || 0);
      });
  }, [allItems, roleFilter, statusFilter]);

  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = records.slice(startIndex, startIndex + itemsPerPage);

  const renderedRecords = useMemo(() => {
    return paginatedRecords.map((a) => <AttendanceItem key={`${a.role}-${a.id}`} item={a} />);
  }, [paginatedRecords]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, roleFilter, statusFilter, itemsPerPage]);

  // SSE Realtime Updates using native fetch
  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    const connectSSE = async () => {
      try {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const isTestMode = localStorage.getItem('is_test_mode') === 'true';
        
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/attendance/logs/stream?date=${selectedDate}${isTestMode ? '&is_test=1' : ''}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: abortController.signal
        });

        if (!response.ok) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (active) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunks = decoder.decode(value).split('\n\n');
          for (const chunk of chunks) {
            if (chunk.startsWith('data: ')) {
              try {
                const data = JSON.parse(chunk.substring(6));
                
                // Update React Query Cache dynamically
                if (data.role === 'student') {
                  queryClient.setQueryData(['attendance_students', selectedDate], (old) => {
                    if (!old) return { data: [data] };
                    const exists = old.data.findIndex(item => item.id === data.id);
                    if (exists >= 0) {
                      const newData = [...old.data];
                      newData[exists] = data;
                      return { ...old, data: newData };
                    }
                    return { ...old, data: [data, ...old.data] };
                  });
                } else if (data.role === 'teacher') {
                  queryClient.setQueryData(['attendance_teachers', selectedDate], (old) => {
                    if (!old) return { data: [data] };
                    const exists = old.data.findIndex(item => item.id === data.id);
                    if (exists >= 0) {
                      const newData = [...old.data];
                      newData[exists] = data;
                      return { ...old, data: newData };
                    }
                    return { ...old, data: [data, ...old.data] };
                  });
                }
              } catch(e) {}
            }
          }
        }
      } catch (error) {
        if (active && error.name !== 'AbortError') {
          // Reconnect after 3s on failure
          setTimeout(connectSSE, 3000);
        }
      }
    };

    connectSSE();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [selectedDate, queryClient]);

  return (
    <div className="max-w-5xl mx-auto space-y-4 landscape:space-y-2">
      {/* Header Compact + Modern Date Picker */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 landscape:py-2 shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-3 landscape:mb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl landscape:text-lg font-black text-gray-800 tracking-tight">Log Absensi</h1>
          <span className="px-2.5 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 border-2 border-gray-900 rounded-full">
            Total: {records.length}
          </span>
        </div>

        {/* Date Picker with Left Icon */}
        <div className="relative inline-flex items-center w-full sm:w-auto">
          <span className="material-symbols-outlined absolute left-3.5 text-gray-600 pointer-events-none text-xl z-10">
            calendar_month
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-4 py-2.5 bg-gray-100 border-2 border-gray-900 rounded-xl font-bold text-sm text-gray-800 shadow-neo focus:border-primary-green focus:bg-white focus:outline-none min-h-[44px] transition-all cursor-pointer"
          />
        </div>
      </div>

      {/* Two-Tier Filter Container */}
      <div className="space-y-3">
        {/* Tier 1: Segmented Control [ Siswa | Guru ] (iOS Style 50/50 Split) */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 border-2 border-gray-900 rounded-full shadow-neo">
          <button
            type="button"
            onClick={() => setRoleFilter(roleFilter === 'student' ? 'all' : 'student')}
            className={`py-2 px-4 rounded-full text-xs md:text-sm font-black transition-all text-center select-none flex items-center justify-center gap-1.5 ${
              roleFilter === 'student'
                ? 'bg-primary-green text-gray-900 shadow-sm border border-gray-900'
                : 'text-gray-600 hover:text-gray-900 font-bold'
            }`}
          >
            <span className="material-symbols-outlined text-lg">groups</span>
            <span>Siswa</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter(roleFilter === 'teacher' ? 'all' : 'teacher')}
            className={`py-2 px-4 rounded-full text-xs md:text-sm font-black transition-all text-center select-none flex items-center justify-center gap-1.5 ${
              roleFilter === 'teacher'
                ? 'bg-primary-green text-gray-900 shadow-sm border border-gray-900'
                : 'text-gray-600 hover:text-gray-900 font-bold'
            }`}
          >
            <span className="material-symbols-outlined text-lg">badge</span>
            <span>Guru</span>
          </button>
        </div>

        {/* Tier 2: Status Filter Chips [ Semua | Masuk | Pulang ] */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1 flex-shrink-0">
            Status:
          </span>
          {[
            { id: 'all', label: 'Semua' },
            { id: 'masuk', label: 'Masuk' },
            { id: 'pulang', label: 'Pulang' },
          ].map((chip) => {
            const isActive = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id)}
                className={`px-4 py-1.5 rounded-full text-xs md:text-sm whitespace-nowrap transition-all select-none ${
                  isActive
                    ? 'bg-primary-green text-gray-900 font-black border-2 border-gray-900 shadow-neo'
                    : 'bg-gray-100 text-gray-700 font-bold border border-gray-200 hover:bg-gray-200'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards List Container with Extra Large Bottom Padding for Mobile Nav */}
      <div className="space-y-3 pb-40 md:pb-12">
        {isLoading ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Memuat data absensi...
          </div>
        ) : records.length === 0 ? (
          /* Styled Mobile Empty State Card */
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 md:p-12 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-3xl text-gray-400">search_off</span>
            </div>
            <h3 className="font-bold text-base md:text-lg text-gray-800 mb-1">Belum Ada Data Absensi</h3>
            <p className="text-xs md:text-sm text-gray-500 max-w-xs leading-relaxed">
              Tidak ditemukan riwayat kehadiran untuk filter ini pada tanggal {selectedDate}.
            </p>
          </div>
        ) : (
          renderedRecords
        )}
      </div>

      {/* Pagination Controls */}
      {records.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 pb-12">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-gray-700">Tampilkan:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
              }}
              className="border-2 border-gray-400 rounded-lg px-2 py-1 font-bold text-xs md:text-sm text-gray-900 bg-transparent focus:outline-none focus:border-primary-green cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs md:text-sm font-bold text-gray-700">data</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 md:p-2 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-sm md:text-base">chevron_left</span>
            </button>
            <span className="text-xs md:text-sm font-bold text-gray-700">
              Halaman {currentPage} dari {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 md:p-2 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-sm md:text-base">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
