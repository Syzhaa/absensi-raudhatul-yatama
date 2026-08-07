import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, GraduationCap } from 'lucide-react';
import api from '../services/api';

const attendanceService = {
  getStudentAttendance: async (date) => {
    const response = await api.get('/attendance/students', { params: { date } });
    return response.data;
  },
  getTeacherAttendance: async (date) => {
    const response = await api.get('/attendance/teachers', { params: { date } });
    return response.data;
  },
};

export default function Attendance() {
  const [activeTab, setActiveTab] = useState('students');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: studentData, isLoading: loadingStudents } = useQuery({
    queryKey: ['student-attendance', selectedDate],
    queryFn: () => attendanceService.getStudentAttendance(selectedDate),
    enabled: activeTab === 'students',
  });

  const { data: teacherData, isLoading: loadingTeachers } = useQuery({
    queryKey: ['teacher-attendance', selectedDate],
    queryFn: () => attendanceService.getTeacherAttendance(selectedDate),
    enabled: activeTab === 'teachers',
  });

  const students = studentData?.data || [];
  const teachers = teacherData?.data || [];

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Calendar size={32} className="text-neo-pink" />
          <div>
            <h1 className="text-3xl font-bold">Log Absensi</h1>
            <p className="text-gray-600">Riwayat absensi siswa dan guru</p>
          </div>
        </div>

        {/* Date Filter */}
        <div className="mb-6">
          <label className="block font-bold mb-2">Pilih Tanggal</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input max-w-xs"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 py-3 px-6 font-bold border-3 border-black transition-all ${
              activeTab === 'students'
                ? 'bg-neo-pink shadow-neo'
                : 'bg-white shadow-neo hover:shadow-neo-lg'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <GraduationCap size={20} />
              Siswa ({students.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`flex-1 py-3 px-6 font-bold border-3 border-black transition-all ${
              activeTab === 'teachers'
                ? 'bg-neo-pink shadow-neo'
                : 'bg-white shadow-neo hover:shadow-neo-lg'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users size={20} />
              Guru ({teachers.length})
            </div>
          </button>
        </div>

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div>
            {loadingStudents ? (
              <p className="text-center py-8 text-gray-600">Loading...</p>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap size={64} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 text-lg">Belum ada data absensi siswa</p>
                <p className="text-gray-500 text-sm">untuk tanggal {selectedDate}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-3 border-black">
                  <thead>
                    <tr className="border-b-3 border-black bg-neo-bg">
                      <th className="text-left py-3 px-4">Nama</th>
                      <th className="text-left py-3 px-4">Kelas</th>
                      <th className="text-left py-3 px-4">Check-in</th>
                      <th className="text-left py-3 px-4">Check-out</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((attendance) => (
                      <tr key={attendance.id} className="border-b border-gray-300">
                        <td className="py-3 px-4 font-medium">{attendance.student?.nama}</td>
                        <td className="py-3 px-4">{attendance.student?.kelas}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-green-600 font-bold">
                            {attendance.check_in}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {attendance.check_out ? (
                            <span className="font-mono text-blue-600 font-bold">
                              {attendance.check_out}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 font-bold border-2 border-black ${
                              attendance.status === 'hadir'
                                ? 'bg-green-500 text-white'
                                : 'bg-yellow-500 text-black'
                            }`}
                          >
                            {attendance.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Teachers Tab */}
        {activeTab === 'teachers' && (
          <div>
            {loadingTeachers ? (
              <p className="text-center py-8 text-gray-600">Loading...</p>
            ) : teachers.length === 0 ? (
              <div className="text-center py-12">
                <Users size={64} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 text-lg">Belum ada data absensi guru</p>
                <p className="text-gray-500 text-sm">untuk tanggal {selectedDate}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-3 border-black">
                  <thead>
                    <tr className="border-b-3 border-black bg-neo-bg">
                      <th className="text-left py-3 px-4">Nama</th>
                      <th className="text-left py-3 px-4">NIP</th>
                      <th className="text-left py-3 px-4">Check-in</th>
                      <th className="text-left py-3 px-4">Check-out</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((attendance) => (
                      <tr key={attendance.id} className="border-b border-gray-300">
                        <td className="py-3 px-4 font-medium">{attendance.teacher?.nama}</td>
                        <td className="py-3 px-4">{attendance.teacher?.nip}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-green-600 font-bold">
                            {attendance.check_in}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {attendance.check_out ? (
                            <span className="font-mono text-blue-600 font-bold">
                              {attendance.check_out}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 font-bold border-2 border-black ${
                              attendance.status === 'hadir'
                                ? 'bg-green-500 text-white'
                                : 'bg-yellow-500 text-black'
                            }`}
                          >
                            {attendance.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
