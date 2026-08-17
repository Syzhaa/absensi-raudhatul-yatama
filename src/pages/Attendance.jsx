import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { studentService, teacherService, logsService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useAppStore } from "../store/useAppStore";
import AttendanceModal from "../components/AttendanceModal";
import { AttendanceItem } from "../components/AttendanceItems";
import { useAttendanceSSE } from "../hooks/useAttendanceSSE";
import { getAutoHoliday } from "../utils/holidays";
import { format } from "date-fns";

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
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
  const { effectiveLembaga, isLoading: isLembagaLoading } = useEffectiveLembaga();

  // Sync kelasFilter dengan selectedKelas dari header global
  const selectedKelas = useAppStore((state) => state.selectedKelas);
  useEffect(() => {
    setKelasFilter(selectedKelas || "all");
  }, [selectedKelas]);

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
    enabled: !isLembagaLoading,
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
    enabled: !isLembagaLoading,
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
    enabled: !isLembagaLoading,
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
    enabled: !isLembagaLoading,
  });

  // 5. Fetch Holidays Calendar
  const { data: holidaysData } = useQuery({
    queryKey: ["holidays", effectiveLembaga],
    queryFn: async () => {
      try {
        const res = await api.get("/attendance/holidays", {
          params: { lembaga: effectiveLembaga },
        });
        return res.data?.data || [];
      } catch (err) {
        console.error("Holidays fetch failed:", err);
        return [];
      }
    },
    enabled: !isLembagaLoading,
  });

  const activeHoliday = useMemo(() => {
    const list = Array.isArray(holidaysData) ? holidaysData : [];

    // 1. Cek dari kalender libur yang dibuat admin (prioritas utama)
    const apiHoliday = list.find((h) => {
      const hStart = (h.start_date || "").substring(0, 10);
      const hEnd = (h.end_date || "").substring(0, 10);
      return selectedDate >= hStart && selectedDate <= hEnd;
    });

    if (apiHoliday) return apiHoliday;

    // 2. Fallback: Hari Minggu atau Hari Libur Nasional Indonesia
    return getAutoHoliday(selectedDate);
  }, [holidaysData, selectedDate]);

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
      let status = log ? log.status : "belum_absen";
      let notes = log ? log.notes : null;

      // If this date is an active holiday and student has no check_in or is alpha/belum_absen
      if (activeHoliday && (activeHoliday.applies_to === "all" || activeHoliday.applies_to === "students")) {
        if (!log || status === "alpha" || status === "belum_absen") {
          status = "libur";
          notes = `Libur: ${activeHoliday.name}`;
        }
      }

      return {
        id: `student-${student.id}`,
        student_id: student.id,
        role: "student",
        student: student,
        lembaga: student.lembaga || effectiveLembaga,
        status: status,
        check_in: log ? log.check_in : null,
        check_out: log ? log.check_out : null,
        attendance_id: log ? log.id : null,
        created_at: log ? log.created_at : null,
        has_attended: !!log || status === "libur",
        notes: notes,
      };
    });

    // Build complete Teacher items
    const teacherRoster = (masterTeachers || []).map((teacher) => {
      const log = teacherLogMap.get(teacher.id);
      let status = log ? log.status : "belum_absen";
      let notes = log ? log.notes : null;

      // If this date is an active holiday and teacher has no check_in or is alpha/belum_absen
      if (activeHoliday && (activeHoliday.applies_to === "all" || activeHoliday.applies_to === "teachers")) {
        if (!log || status === "alpha" || status === "belum_absen") {
          status = "libur";
          notes = `Libur: ${activeHoliday.name}`;
        }
      }

      return {
        id: `teacher-${teacher.id}`,
        teacher_id: teacher.id,
        role: "teacher",
        teacher: teacher,
        lembaga: teacher.lembaga || effectiveLembaga,
        status: status,
        check_in: log ? log.check_in : null,
        check_out: log ? log.check_out : null,
        attendance_id: log ? log.id : null,
        created_at: log ? log.created_at : null,
        has_attended: !!log || status === "libur",
        notes: notes,
      };
    });

    return [...studentRoster, ...teacherRoster];
  }, [masterStudents, masterTeachers, studentLogs, teacherLogs, effectiveLembaga, activeHoliday]);

  // Counts for Stats & Filters
  const stats = useMemo(() => {
    let total = fullRoster.length;
    let belumAbsen = 0;
    let hadir = 0;
    let pulang = 0;
    let izinSakitAlpha = 0;
    let liburCount = 0;

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

      if (item.status === "libur") {
        liburCount++;
      } else if (!item.has_attended || item.status === "belum_absen") {
        belumAbsen++;
      } else {
        if (item.check_in || ["hadir", "terlambat"].includes(item.status)) {
          hadir++;
        }
        if (item.check_out) {
          pulang++;
        }
        if (["izin", "sakit", "alpha"].includes(item.status)) {
          izinSakitAlpha++;
        }
      }
    });

    return { total, belumAbsen, hadir, pulang, izinSakitAlpha, liburCount };
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
          if (!["izin", "sakit", "alpha"].includes(item.status)) return false;
        } else if (statusFilter === "libur") {
          if (item.status !== "libur") return false;
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

  const handleQuickLibur = async (item) => {
    try {
      const payload = {
        status: "libur",
        date: selectedDate,
        notes: activeHoliday ? `Libur: ${activeHoliday.name}` : "Libur",
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
      alert(err.response?.data?.message || "Gagal tandai libur");
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
      {/* Top Controls: Date & Search */}
      <div className="flex gap-2 w-full">
        <div className="relative w-[140px] sm:w-[160px] shrink-0">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none text-lg z-10">
            calendar_month
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full pl-9 pr-2 py-2 bg-white border-2 md:border-3 border-gray-900 rounded-xl font-bold text-xs md:text-sm text-gray-900 shadow-neo hover:border-emerald-600 focus:outline-none transition-all cursor-pointer"
          />
        </div>
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Cari nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border-2 md:border-3 border-gray-900 rounded-xl font-bold text-xs md:text-sm text-gray-900 shadow-neo focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Active Holiday Banner */}
      {activeHoliday && (
        <div className="bg-emerald-400 border-2 md:border-3 border-gray-900 rounded-2xl p-4 md:p-5 shadow-neo flex items-center gap-3.5 text-gray-900 animate-slide-up">
          <div className="w-11 h-11 md:w-12 md:h-12 bg-white border-2 border-gray-900 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-2xl text-emerald-700">
              celebration
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-block px-2 py-0.5 bg-gray-900 text-emerald-300 text-[10px] font-black rounded uppercase tracking-wider mb-0.5">
              Hari Libur
            </div>
            <h3 className="text-sm md:text-base font-black text-gray-900 truncate">
              {activeHoliday.name}
            </h3>
            <p className="text-xs font-bold text-gray-800 opacity-90">
              {activeHoliday.description || "Presensi ditiadakan / libur terjadwal."}
            </p>
          </div>
        </div>
      )}

      {/* Role Tabs & Filters Row */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 items-stretch sm:items-center">
        {/* Role Toggle Tabs */}
        <div className="grid grid-cols-3 p-1 bg-white border-2 md:border-3 border-gray-900 rounded-xl shadow-neo gap-1 w-full sm:w-64 shrink-0">
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center select-none flex items-center justify-center gap-1 ${
              roleFilter === "all"
                ? "bg-emerald-400 text-gray-950 shadow-neo border-2 border-gray-900"
                : "text-gray-700 hover:text-gray-950 hover:bg-gray-200"
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("student")}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center select-none flex items-center justify-center gap-1 ${
              roleFilter === "student"
                ? "bg-emerald-400 text-gray-950 shadow-neo border-2 border-gray-900"
                : "text-gray-700 hover:text-gray-950 hover:bg-gray-200"
            }`}
          >
            Siswa
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("teacher")}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all text-center select-none flex items-center justify-center gap-1 ${
              roleFilter === "teacher"
                ? "bg-emerald-400 text-gray-950 shadow-neo border-2 border-gray-900"
                : "text-gray-700 hover:text-gray-950 hover:bg-gray-200"
            }`}
          >
            Guru
          </button>
        </div>

        {/* Status Filter & Stats */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select 
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="w-[140px] sm:w-[160px] shrink-0 bg-white border-2 md:border-3 border-gray-900 rounded-xl py-1.5 px-2 font-bold text-[10px] sm:text-xs shadow-neo focus:outline-none cursor-pointer"
           >
              <option value="all">Semua Status</option>
              <option value="belum_absen">Belum Absen</option>
              <option value="masuk">Sudah Masuk</option>
              <option value="pulang">Sudah Pulang</option>
              <option value="manual">Izin / Sakit / Alpha</option>
              <option value="libur">Libur</option>
           </select>
           
           <div className="flex flex-row flex-1 sm:flex-initial justify-end gap-1.5 overflow-hidden">
             <span className="px-2 py-1 text-[9px] sm:text-[10px] font-black bg-emerald-100 text-emerald-900 border-2 border-gray-900 rounded-full text-center shadow-sm whitespace-nowrap">
                Total: {filteredRecords.length}
             </span>
             {stats.liburCount > 0 ? (
               <span className="px-2 py-1 text-[9px] sm:text-[10px] font-black bg-teal-200 text-teal-950 border-2 border-gray-900 rounded-full text-center shadow-sm whitespace-nowrap">
                  Libur: {stats.liburCount}
               </span>
             ) : stats.belumAbsen > 0 ? (
               <span className="px-2 py-1 text-[9px] sm:text-[10px] font-black bg-amber-200 text-amber-950 border-2 border-gray-900 rounded-full text-center animate-pulse shadow-sm whitespace-nowrap">
                  Belum: {stats.belumAbsen}
               </span>
             ) : null}
           </div>
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
              onQuickLibur={activeHoliday ? undefined : handleQuickLibur}
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
