import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { studentService, teacherService, logsService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useAppStore } from "../store/useAppStore";
import AttendanceModal from "../components/AttendanceModal";
import { AttendanceItem } from "../components/AttendanceItems";
import { useAttendanceSSE } from "../hooks/useAttendanceSSE";

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [roleFilter, setRoleFilter] = useState("all");
  const [kelasFilter, setKelasFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [showModal, setShowModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const queryClient = useQueryClient();
  const { effectiveLembaga } = useEffectiveLembaga();

  // 1. Fetch Master Active Students
  const { data: masterStudents, isLoading: isMasterStudentsLoading } = useQuery({
    queryKey: ["students_master", effectiveLembaga],
    queryFn: async () => {
      try {
        const params = {};
        if (effectiveLembaga) params.lembaga = effectiveLembaga;
        const res = await studentService.getAll(params);
        const data = res?.data || res || [];
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error("Master students fetch failed:", err);
        return [];
      }
    },
    enabled: !!effectiveLembaga,
  });

  // 2. Fetch Master Active Teachers
  const { data: masterTeachers, isLoading: isMasterTeachersLoading } = useQuery({
    queryKey: ["teachers_master", effectiveLembaga],
    queryFn: async () => {
      try {
        const params = {};
        if (effectiveLembaga) params.lembaga = effectiveLembaga;
        const res = await teacherService.getAll(params);
        const data = res?.data || res || [];
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error("Master teachers fetch failed:", err);
        return [];
      }
    },
    enabled: !!effectiveLembaga,
  });

  // 3. Fetch Attendance Logs for Students on Selected Date
  const { data: studentLogs, isLoading: isStudentLogsLoading } = useQuery({
    queryKey: ["attendance_students", selectedDate, effectiveLembaga],
    queryFn: async () => {
      try {
        const params = { date: selectedDate, lembaga: effectiveLembaga };
        const res = await api.get("/attendance/logs/students", { params });
        return res.data?.data || [];
      } catch (err) {
        console.error("Student logs fetch failed:", err);
        return [];
      }
    },
    enabled: !!effectiveLembaga,
  });

  // 4. Fetch Attendance Logs for Teachers on Selected Date
  const { data: teacherLogs, isLoading: isTeacherLogsLoading } = useQuery({
    queryKey: ["attendance_teachers", selectedDate, effectiveLembaga],
    queryFn: async () => {
      try {
        const res = await api.get("/attendance/logs/teachers", {
          params: { date: selectedDate, lembaga: effectiveLembaga },
        });
        return res.data?.data || [];
      } catch (err) {
        console.error("Teacher logs fetch failed:", err);
        return [];
      }
    },
    enabled: !!effectiveLembaga,
  });

  const isLoading =
    isMasterStudentsLoading ||
    isMasterTeachersLoading ||
    isStudentLogsLoading ||
    isTeacherLogsLoading;

  // Compute Kelas Options from Master Students
  const kelasOptions = useMemo(() => {
    const students = masterStudents || [];
    const uniqueKelas = [
      ...new Set(students.map((s) => s.kelas).filter(Boolean)),
    ];
    return uniqueKelas.sort();
  }, [masterStudents]);

  // Combine Master Roster + Attendance Logs into complete status map
  const fullRoster = useMemo(() => {
    const sLogs = studentLogs || [];
    const tLogs = teacherLogs || [];

    // Map logs by ID for instant lookup
    const studentLogMap = new Map();
    sLogs.forEach((log) => {
      if (log.student_id) {
        studentLogMap.set(log.student_id, log);
      }
    });

    const teacherLogMap = new Map();
    tLogs.forEach((log) => {
      if (log.teacher_id) {
        teacherLogMap.set(log.teacher_id, log);
      }
    });

    // Build complete Student items
    const studentRoster = (masterStudents || []).map((student) => {
      const log = studentLogMap.get(student.id);
      return {
        id: `student-${student.id}`,
        student_id: student.id,
        role: "student",
        student: student,
        lembaga: student.lembaga || effectiveLembaga,
        status: log ? log.status : "belum_absen",
        check_in: log ? log.check_in : null,
        check_out: log ? log.check_out : null,
        attendance_id: log ? log.id : null,
        created_at: log ? log.created_at : null,
        has_attended: !!log,
      };
    });

    // Build complete Teacher items
    const teacherRoster = (masterTeachers || []).map((teacher) => {
      const log = teacherLogMap.get(teacher.id);
      return {
        id: `teacher-${teacher.id}`,
        teacher_id: teacher.id,
        role: "teacher",
        teacher: teacher,
        lembaga: teacher.lembaga || effectiveLembaga,
        status: log ? log.status : "belum_absen",
        check_in: log ? log.check_in : null,
        check_out: log ? log.check_out : null,
        attendance_id: log ? log.id : null,
        created_at: log ? log.created_at : null,
        has_attended: !!log,
      };
    });

    return [...studentRoster, ...teacherRoster];
  }, [masterStudents, masterTeachers, studentLogs, teacherLogs, effectiveLembaga]);

  // Counts for Stats & Filters
  const stats = useMemo(() => {
    let total = fullRoster.length;
    let belumAbsen = 0;
    let hadir = 0;
    let pulang = 0;
    let izinSakitAlpha = 0;

    fullRoster.forEach((item) => {
      // Filter by role & kelas for stats
      if (roleFilter !== "all" && item.role !== roleFilter) return;
      if (
        item.role === "student" &&
        kelasFilter !== "all" &&
        item.student?.kelas !== kelasFilter
      ) {
        return;
      }

      if (!item.has_attended || item.status === "belum_absen") {
        belumAbsen++;
      } else {
        if (item.check_in || ["hadir", "terlambat"].includes(item.status)) {
          hadir++;
        }
        if (item.check_out) {
          pulang++;
        }
        if (["izin", "sakit", "alpha", "libur"].includes(item.status)) {
          izinSakitAlpha++;
        }
      }
    });

    return { total, belumAbsen, hadir, pulang, izinSakitAlpha };
  }, [fullRoster, roleFilter, kelasFilter]);

  const filteredRecords = useMemo(() => {
    return fullRoster
      .filter((item) => {
        // Role filter
        if (roleFilter !== "all" && item.role !== roleFilter) return false;

        // Kelas filter (only for students)
        if (
          item.role === "student" &&
          kelasFilter !== "all" &&
          item.student?.kelas !== kelasFilter
        ) {
          return false;
        }

        // Status filter
        if (statusFilter === "belum_absen") {
          if (item.has_attended && item.status !== "belum_absen") return false;
        } else if (statusFilter === "masuk") {
          if (!item.check_in && !["hadir", "terlambat"].includes(item.status)) return false;
        } else if (statusFilter === "pulang") {
          if (!item.check_out) return false;
        } else if (statusFilter === "manual") {
          if (!["izin", "sakit", "alpha", "libur"].includes(item.status)) return false;
        }

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nama = (item.student?.nama || item.teacher?.nama || "").toLowerCase();
          const nis = (item.student?.nis || item.teacher?.nip || "").toLowerCase();
          if (!nama.includes(q) && !nis.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aBelum = !a.has_attended || a.status === "belum_absen";
        const bBelum = !b.has_attended || b.status === "belum_absen";

        // RULE: BELUM ABSEN ALWAYS AT THE VERY TOP!
        if (aBelum && !bBelum) return -1;
        if (!aBelum && bBelum) return 1;

        // If both are Belum Absen: sort by kelas then by nama
        if (aBelum && bBelum) {
          const kelasA = a.student?.kelas || "99";
          const kelasB = b.student?.kelas || "99";
          if (kelasA !== kelasB) return kelasA.localeCompare(kelasB, undefined, { numeric: true });
          
          const namaA = a.student?.nama || a.teacher?.nama || "";
          const namaB = b.student?.nama || b.teacher?.nama || "";
          return namaA.localeCompare(namaB);
        }

        // If both are already attended: sort by latest log created_at / check_in
        const ta = new Date(a.created_at || a.check_in || 0).getTime();
        const tb = new Date(b.created_at || b.check_in || 0).getTime();
        if (ta !== tb) return tb - ta;

        return (b.attendance_id || 0) - (a.attendance_id || 0);
      });
  }, [fullRoster, roleFilter, kelasFilter, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedDate,
    roleFilter,
    kelasFilter,
    statusFilter,
    searchQuery,
    itemsPerPage,
  ]);

  // Handlers
  const handleEditAttendance = (person) => {
    setSelectedPerson(person);
    setShowModal(true);
  };

  const handleQuickHadir = async (item) => {
    try {
      const payload = {
        status: "hadir",
        date: selectedDate,
        is_test: false,
      };
      if (item.role === "teacher") {
        payload.teacher_id = item.teacher_id;
      } else {
        payload.student_id = item.student_id;
      }

      await logsService.createManual(payload);
      
      queryClient.invalidateQueries({
        queryKey: ["attendance_students", selectedDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["attendance_teachers", selectedDate],
      });
    } catch (err) {
      alert(err.response?.data?.message || "Gagal absen manual");
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedPerson(null);
  };

  const handleStatusUpdate = () => {
    queryClient.invalidateQueries({
      queryKey: ["attendance_students", selectedDate],
    });
    queryClient.invalidateQueries({
      queryKey: ["attendance_teachers", selectedDate],
    });
    queryClient.invalidateQueries({
      queryKey: ["students_master"],
    });
    queryClient.invalidateQueries({
      queryKey: ["teachers_master"],
    });
  };

  useAttendanceSSE(selectedDate, queryClient);

  return (
    <div className="max-w-5xl mx-auto space-y-4 landscape:space-y-2">
      {/* Header */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 landscape:py-2 shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl md:text-2xl landscape:text-lg font-black text-gray-900 tracking-tight">
            Absensi & Log Kehadiran
          </h1>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-black bg-emerald-100 text-emerald-900 border-2 border-gray-900 rounded-full shadow-sm">
              Roster Total: {filteredRecords.length}
            </span>
            {stats.belumAbsen > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-black bg-amber-200 text-amber-950 border-2 border-gray-900 rounded-full animate-pulse shadow-sm">
                Belum Absen: {stats.belumAbsen}
              </span>
            )}
          </div>
        </div>

        <div className="relative inline-flex items-center w-full sm:w-auto">
          <span className="material-symbols-outlined absolute left-3.5 text-gray-700 pointer-events-none text-xl z-10">
            calendar_month
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-4 py-2.5 bg-gray-100 border-2 border-gray-900 rounded-xl font-bold text-sm text-gray-900 shadow-neo hover:border-emerald-600 focus:border-emerald-600 focus:bg-white focus:outline-none min-h-[44px] transition-all cursor-pointer"
          />
        </div>
      </div>

      {/* Filters Section */}
      <div className="space-y-3 bg-white/70 backdrop-blur-sm border-2 border-gray-900 rounded-2xl p-3.5 shadow-neo">
        {/* Search Filter */}
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xl pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Cari nama atau NIS/NIP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-2 border-gray-300 rounded-xl font-semibold text-sm text-gray-900 hover:border-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
          />
        </div>

        {/* Role Toggle Tabs */}
        <div className="grid grid-cols-3 p-1 bg-gray-100 border-2 border-gray-900 rounded-xl shadow-neo gap-1">
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={`py-2 px-3 rounded-lg text-xs md:text-sm font-black transition-all text-center select-none flex items-center justify-center gap-1.5 ${
              roleFilter === "all"
                ? "bg-emerald-400 text-gray-950 shadow-neo border-2 border-gray-900"
                : "text-gray-700 hover:text-gray-950 hover:bg-gray-200 font-bold"
            }`}
          >
            <span className="material-symbols-outlined text-lg">view_list</span>
            <span>Semua</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("student")}
            className={`py-2 px-3 rounded-lg text-xs md:text-sm font-black transition-all text-center select-none flex items-center justify-center gap-1.5 ${
              roleFilter === "student"
                ? "bg-emerald-400 text-gray-950 shadow-neo border-2 border-gray-900"
                : "text-gray-700 hover:text-gray-950 hover:bg-gray-200 font-bold"
            }`}
          >
            <span className="material-symbols-outlined text-lg">groups</span>
            <span>Siswa</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("teacher")}
            className={`py-2 px-3 rounded-lg text-xs md:text-sm font-black transition-all text-center select-none flex items-center justify-center gap-1.5 ${
              roleFilter === "teacher"
                ? "bg-emerald-400 text-gray-950 shadow-neo border-2 border-gray-900"
                : "text-gray-700 hover:text-gray-950 hover:bg-gray-200 font-bold"
            }`}
          >
            <span className="material-symbols-outlined text-lg">badge</span>
            <span>Guru</span>
          </button>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wider pl-1 flex-shrink-0">
            Filter Status:
          </span>
          {[
            { id: "all", label: "Semua Status" },
            {
              id: "belum_absen",
              label: `Belum Absen (${stats.belumAbsen})`,
              badgeColor: "bg-amber-300 text-amber-950 border-amber-500",
            },
            { id: "masuk", label: "Masuk" },
            { id: "pulang", label: "Pulang" },
            { id: "manual", label: "Izin / Sakit / Alpha" },
          ].map((chip) => {
            const isActive = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all select-none flex items-center gap-1.5 border-2 ${
                  isActive
                    ? "bg-gray-900 text-white border-gray-900 shadow-neo"
                    : "bg-gray-100 text-gray-700 border-gray-300 hover:border-gray-900 hover:bg-gray-200"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Attendance Records List */}
      <div className="space-y-3 pb-24 md:pb-12">
        {isLoading ? (
          <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-8 text-center font-black text-gray-700 shadow-neo animate-pulse">
            Memuat roster & data absensi...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white border-2 border-gray-900 rounded-2xl p-8 md:p-12 text-center shadow-neo flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full border-2 border-gray-900 flex items-center justify-center mb-3 shadow-neo">
              <span className="material-symbols-outlined text-3xl text-gray-600">
                search_off
              </span>
            </div>
            <h3 className="font-black text-base md:text-lg text-gray-900 mb-1">
              Tidak Ada Data Siswa / Guru
            </h3>
            <p className="text-xs md:text-sm text-gray-600 max-w-xs leading-relaxed">
              Tidak ditemukan data yang sesuai dengan filter ini pada tanggal{" "}
              {selectedDate}.
            </p>
          </div>
        ) : (
          paginatedRecords.map((item) => (
            <AttendanceItem
              key={item.id}
              item={item}
              onEdit={handleEditAttendance}
              onQuickHadir={handleQuickHadir}
            />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {filteredRecords.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 pb-12">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-gray-700">
              Tampilkan:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border-2 border-gray-900 rounded-xl px-2.5 py-1 font-black text-xs md:text-sm text-gray-900 bg-white focus:outline-none focus:border-emerald-600 cursor-pointer shadow-sm"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs md:text-sm font-bold text-gray-700">
              per halaman
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-900 border-2 border-gray-900 rounded-xl bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-neo active:translate-y-0.5"
            >
              <span className="material-symbols-outlined text-sm md:text-base font-bold">
                chevron_left
              </span>
            </button>
            <span className="text-xs md:text-sm font-black text-gray-900 bg-white px-3 py-1.5 border-2 border-gray-900 rounded-xl shadow-neo">
              Halaman {currentPage} dari {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 text-gray-900 border-2 border-gray-900 rounded-xl bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-neo active:translate-y-0.5"
            >
              <span className="material-symbols-outlined text-sm md:text-base font-bold">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Attendance / Edit Status Modal */}
      <AttendanceModal
        isOpen={showModal}
        onClose={handleModalClose}
        student={selectedPerson}
        date={selectedDate}
        lembaga={effectiveLembaga}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
