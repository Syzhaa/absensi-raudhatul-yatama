import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, GraduationCap, CheckCircle, LogOut } from 'lucide-react';
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
 { id: 'masuk_siswa', label: 'Masuk Siswa', icon: 'GraduationCap', type: 'check_in', role: 'student', color: 'bg-green-500' },
 { id: 'pulang_siswa', label: 'Pulang Siswa', icon: 'GraduationCap', type: 'check_out', role: 'student', color: 'bg-blue-500' },
 { id: 'masuk_guru', label: 'Masuk Guru', icon: 'Users', type: 'check_in', role: 'teacher', color: 'bg-green-500' },
 { id: 'pulang_guru', label: 'Pulang Guru', icon: 'Users', type: 'check_out', role: 'teacher', color: 'bg-blue-500' },
];

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

 // Count records for each tab
 const getCountForTab = (tabId) => {
 const config = TAB_CONFIG.find(t => t.id === tabId);
 // In real scenario, you'd fetch data for each tab
 // For now, show count only for active tab
 return tabId === activeTab ? records.length : '?';
 };

 const renderTable = () => {
 if (isLoading) {
 return <p className="text-center py-8 text-gray-600">Loading...</p>;
 }

 if (records.length === 0) {
 const Icon = isStudent ? GraduationCap : Users;
 return (
 <div className="text-center py-12">
 <Icon size={64} className="mx-auto mb-4 text-gray-400" />
 <p className="text-gray-600 text-lg">
 {isStudent ? 'Belum ada data absensi siswa' : 'Belum ada data absensi guru'}
 </p>
 <p className="text-gray-500 text-sm">untuk tanggal {selectedDate}</p>
 </div>
 );
 }

 return (
 <div className="overflow-x-auto">
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
 <td className="py-3 px-4 font-Kimi K3">{person?.nama}</td>
 <td className="py-3 px-4">{identifier}</td>
 <td className="py-3 px-4">
 {attendance.check_in ? (
 <span className="font-mono text-green-600 font-bold">{attendance.check_in}</span>
 ) : (
 <span className="text-gray-400">-</span>
 )}
 </td>
 <td className="py-3 px-4">
 {attendance.check_out ? (
 <span className="font-mono text-blue-600 font-bold">{attendance.check_out}</span>
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
 );
 })}
 </tbody>
 </table>
 </div>
 );
 };

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

 {/* 4 Tabs Grid */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
 {TAB_CONFIG.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`py-3 px-3 md:px-4 font-bold border-3 border-black transition-all flex flex-col items-center gap-2 ${
 activeTab === tab.id
 ? 'bg-neo-pink shadow-neo'
 : 'bg-white shadow-neo hover:shadow-neo-lg'
 }`}
 >
 <div className="text-lg md:text-2xl">
 {tab.type === 'check_in' ? '🟢' : '🔵'}
 </div>
 <div className="text-xs md:text-sm text-center leading-tight">{tab.label}</div>
 <div className="text-xs font-mono bg-gray-100 px-2 py-1 border border-gray-400">
 {getCountForTab(tab.id)}
 </div>
 </button>
 ))}
 </div>

 {/* Table Content */}
 {renderTable()}
 </div>
 </div>
 );
}
