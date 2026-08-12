import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { logsService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useAppStore } from "../store/useAppStore";
import AttendanceModal from "../components/AttendanceModal";
import { AttendanceItem, AbsentStudentItem } from "../components/AttendanceItems";
import { useAttendanceSSE } from "../hooks/useAttendanceSSE";

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const selectedKelas = useAppStore((state) => state.selectedKelas);
  const [kelasFilter, setKelasFilter] = useState(selectedKelas || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAbsentSection, setShowAbsentSection] = useState(true);

  const queryClient = useQueryClient();
  const { effectiveLembaga } = useEffectiveLembaga();

  // Sync local filter dengan global state
  useEffect(() => {
    setKelasFilter(selectedKelas || "all");
  }, [selectedKelas]);

  const { data: studentData, isLoading: isStudentLoading } = useQuery({
    queryKey: ["attendance_students", selectedDate, effectiveLembaga, kelasFilter],
    queryFn: async () => {
      try {
        const params = { date: selectedDate, lembaga: effectiveLembaga };
        if (kelasFilter && kelasFilter !== "all") params.kelas = kelasFilter;
        const res = await api.get("/attendance/logs/students", { params });
        return res.data;
      } catch (err) {
        console.error("Student attendance fetch failed:", err);
        return [];
      }
    },
    enabled: !!effectiveLembaga,
  });

  const { data: teacherData, isLoading: isTeacherLoading } = useQuery({
    queryKey: ["attendance_teachers", selectedDate, effectiveLembaga],
    queryFn: async () => {
      try {
        const res = await api.get("/attendance/logs/teachers", {
          params: { date: selectedDate, lembaga: effectiveLembaga },
        });
        return res.data;
      } catch (err) {
        console.error("Teacher attendance fetch failed:", err);
        return [];
      }
    },
    enabled: !!effectiveLembaga,
  });

  const { data: absentData, isLoading: isAbsentLoading } = useQuery({
    queryKey: [
      "attendance_absent_students",
      selectedDate,
      kelasFilter,
      effectiveLembaga,
    ],
    queryFn: async () => {
      try {
        const params = { date: selectedDate };
        if (effectiveLembaga) params.lembaga = effectiveLembaga;
        if (kelasFilter && kelasFilter !== "all") params.kelas = kelasFilter;

        const res = await logsService.getAbsentStudents(params);
        return res;
      } catch (err) {
        console.error("Absent students fetch failed:", err);
        return { data: [] };
      }
    },
    enabled: showAbsentSection,
  });

  const isLoading = isStudentLoading || isTeacherLoading;

  // Get unique kelas from students
  const kelasOptions = useMemo(() => {
    const students = studentData?.data || [];
    const uniqueKelas = [
      ...new Set(students.map((s) => s.student?.kelas).filter(Boolean)),
    ];
    return uniqueKelas.sort();
  }, [studentData]);

  // Combine + filter + sort
  const allItems = useMemo(() => {
    return [
      ...(studentData?.data || []).map((a) => ({ ...a, role: "student" })),
      ...(teacherData?.data || []).map((a) => ({ ...a, role: "teacher" })),
    ];
  }, [studentData, teacherData]);

  const records = useMemo(() => {
    return allItems
      .filter((a) => {
        // Role filter
        if (roleFilter !== "all" && a.role !== roleFilter) return false;

        // Status filter
        if (statusFilter === "masuk" && !a.check_in) return false;
        if (statusFilter === "pulang" && !a.check_out) return false;

        // Kelas filter
        if (a.role === "student" && kelasFilter !== "all") {
          if (a.student?.kelas !== kelasFilter) return false;
        }

        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const nama = (a.student?.nama || a.teacher?.nama || "").toLowerCase();
          if (!nama.includes(query)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        if (ta !== tb) return tb - ta;
        return (b.id || 0) - (a.id || 0);
      });
  }, [allItems, roleFilter, statusFilter, kelasFilter, searchQuery]);

  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = records.slice(startIndex, startIndex + itemsPerPage);

  const renderedRecords = useMemo(() => {
    return paginatedRecords.map((a) => (
      <AttendanceItem
        key={`${a.role}-${a.id}`}
        item={a}
        onEdit={handleEditAttendance}
      />
    ));
  }, [paginatedRecords]);

  const absentStudents = absentData?.data || [];

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedDate,
    roleFilter,
    statusFilter,
    kelasFilter,
    searchQuery,
    itemsPerPage,
  ]);

  // Handlers
  const handleEditAttendance = (item) => {
    setSelectedStudent(item);
    setShowModal(true);
  };

  const handleAddManual = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedStudent(null);
  };

  const handleStatusUpdate = () => {
    queryClient.invalidateQueries({
      queryKey: ["attendance_students", selectedDate],
    });
    queryClient.invalidateQueries({ queryKey: ["attendance_absent_students"] });
  };

  useAttendanceSSE(selectedDate, queryClient);

  return (
    <div className="max-w-5xl mx-auto space-y-4 landscape:space-y-2">
      {/* Header */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 landscape:py-2 shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl landscape:text-lg font-black text-gray-800 tracking-tight">
            Log Absensi
          </h1>
          <span className="px-2.5 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 border-2 border-gray-900 rounded-full">
            Total: {records.length}
          </span>
        </div>

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

      {/* Filters */}
      <div className="space-y-3">
        {/* Search + Kelas Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Cari nama siswa/guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm text-gray-800 focus:border-primary-green focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {kelasOptions.length > 0 && (
            <select
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              className="px-3 py-2 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm text-gray-800 focus:border-primary-green focus:bg-white focus:outline-none transition-all cursor-pointer"
            >
              <option value="all">Semua Kelas</option>
              {kelasOptions.map((kls) => (
                <option key={kls} value={kls}>
                  Kelas {kls}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Role Filter */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 border-2 border-gray-900 rounded-full shadow-neo">
          <button
            type="button"
            onClick={() =>
              setRoleFilter(roleFilter === "student" ? "all" : "student")
            }
            className={`py-2 px-4 rounded-full text-xs md:text-sm font-black transition-all text-center select-none flex items-center justify-center gap-1.5 ${"${"}
              roleFilter === 'student'
                ? 'bg-primary-green text-gray-900 shadow-sm border border-gray-900'
                : 'text-gray-600 hover:text-gray-900 font-bold'
            ${"}"}`}
          >
            <span className="material-symbols-outlined text-lg">groups</span>
            <span>Siswa</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setRoleFilter(roleFilter === "teacher" ? "all" : "teacher")
            }
            className={`py-2 px-4 rounded-full text-xs md:text-sm font-black transition-all text-center select-none flex items-center justify-center gap-1.5 ${"${"}
              roleFilter === 'teacher'
                ? 'bg-primary-green text-gray-900 shadow-sm border border-gray-900'
                : 'text-gray-600 hover:text-gray-900 font-bold'
            ${"}"}`}
          >
            <span className="material-symbols-outlined text-lg">badge</span>
            <span>Guru</span>
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1 flex-shrink-0">
            Status:
          </span>
          {[
            { id: "all", label: "Semua" },
            { id: "masuk", label: "Masuk" },
            { id: "pulang", label: "Pulang" },
          ].map((chip) => {
            return (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id)}
                className={`px-4 py-1.5 rounded-full text-xs md:text-sm whitespace-nowrap transition-all select-none ${"${"}
                  isActive
                    ? 'bg-primary-green text-gray-900 font-black border-2 border-gray-900 shadow-neo'
                    : 'bg-gray-100 text-gray-700 font-bold border border-gray-200 hover:bg-gray-200'
                ${"}"}`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Absent Students Section (Collapsible) */}
      {roleFilter !== "teacher" && absentStudents.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl overflow-hidden shadow-neo">
          <button
            onClick={() => setShowAbsentSection(!showAbsentSection)}
            className="w-full px-4 py-3 flex items-center justify-between bg-amber-100/50 hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700">
                warning
              </span>
              <h2 className="font-black text-sm md:text-base text-amber-900">
                Belum Absen ({absentStudents.length})
              </h2>
            </div>
            <span className="material-symbols-outlined text-amber-700">
              {showAbsentSection ? "expand_less" : "expand_more"}
            </span>
          </button>

          {showAbsentSection && (
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {isAbsentLoading ? (
                <p className="text-sm text-gray-600 text-center py-4">
                  Memuat data...
                </p>
              ) : (
                absentStudents.map((student) => (
                  <AbsentStudentItem
                    key={student.id}
                    student={student}
                    onAddManual={handleAddManual}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Attendance Records */}
      <div className="space-y-3 pb-40 md:pb-12">
        {isLoading ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-bold text-gray-600 shadow-neo">
            Memuat data absensi...
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 md:p-12 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-3xl text-gray-400">
                search_off
              </span>
            </div>
            <h3 className="font-bold text-base md:text-lg text-gray-800 mb-1">
              Belum Ada Data Absensi
            </h3>
            <p className="text-xs md:text-sm text-gray-500 max-w-xs leading-relaxed">
              Tidak ditemukan riwayat kehadiran untuk filter ini pada tanggal{" "}
              {selectedDate}.
            </p>
          </div>
        ) : (
          renderedRecords
        )}
      </div>

      {/* Pagination */}
      {records.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 pb-12">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-gray-700">
              Tampilkan:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border-2 border-gray-400 rounded-lg px-2 py-1 font-bold text-xs md:text-sm text-gray-900 bg-transparent focus:outline-none focus:border-primary-green cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs md:text-sm font-bold text-gray-700">
              data
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 md:p-2 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-sm md:text-base">
                chevron_left
              </span>
            </button>
            <span className="text-xs md:text-sm font-bold text-gray-700">
              Halaman {currentPage} dari {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 md:p-2 text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-sm md:text-base">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <AttendanceModal
        isOpen={showModal}
        onClose={handleModalClose}
        student={selectedStudent}
        date={selectedDate}
        lembaga={effectiveLembaga}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
