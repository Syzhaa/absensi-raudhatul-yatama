import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { studentService, teacherService, logsService } from "../services";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { useAppStore } from "../store/useAppStore";
import AttendanceModal from "../components/AttendanceModal";
import { AttendanceItem } from "../components/AttendanceItems";
import ConfirmModal from "../components/ConfirmModal";
import { CardSkeleton, TableRowSkeleton } from "../components/Skeleton";
import { useAttendanceSSE } from "../hooks/useAttendanceSSE";
import { getAutoHoliday } from "../utils/holidays";
import { getKelasNumericVal, sortKelasList } from "../utils/kelasHelper";
import { useKelasFormat } from "../hooks/useKelasFormat";
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
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: null,
  });

  const showAlert = (title, message) =>
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type: "alert",
      onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
    });

  const queryClient = useQueryClient();
  const { effectiveLembaga, isLoading: isLembagaLoading } = useEffectiveLembaga();
  const { formatKelas } = useKelasFormat();

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
        const params = { per_page: 9999, status: "aktif" };
        if (effectiveLembaga) params.lembaga = effectiveLembaga;
        const res = await studentService.getAll(params);
        // Handle paginated response: res.data.data (Laravel pagination) atau res.data (flat array)
        const data = res?.data?.data || res?.data || res || [];
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
        const params = { per_page: 9999, status: "aktif" };
        if (effectiveLembaga) params.lembaga = effectiveLembaga;
        const res = await teacherService.getAll(params);
        const data = res?.data?.data || res?.data || res || [];
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
    queryKey: ["attendance_students", selectedDate],
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
    queryKey: ["attendance_teachers", selectedDate],
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
    return sortKelasList(uniqueKelas);
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
          const nis = (item.student?.nisn || item.teacher?.nip || "").toLowerCase();
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
          const valA = getKelasNumericVal(a.student?.kelas);
          const valB = getKelasNumericVal(b.student?.kelas);
          if (valA !== valB) return valA - valB;
          
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
    <div className="w-full md:max-w-none max-w-5xl mx-auto space-y-4 animate-fade-in">
      {/* Top Header Card: Title, Date, Search, Filters */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-3.5 sm:p-4 shadow-neo space-y-3">
        {/* Row 1: Title & Date Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 border-2 border-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl text-emerald-900 font-bold">fact_check</span>
            </div>
            <div>
              <h1 className="font-black text-base sm:text-xl text-gray-900 tracking-tight leading-tight">
                Presensi & Roster
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
                Pantau kehadiran siswa & guru • {effectiveLembaga ? effectiveLembaga.toUpperCase() : "MA"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-44">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none text-base">
                calendar_today
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-bold text-xs text-gray-900 focus:outline-none transition-all cursor-pointer"
              />
            </div>
            <span className="px-2.5 py-1 text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl whitespace-nowrap">
              Total: {filteredRecords.length}
            </span>
          </div>
        </div>

        {/* Row 2: Search Bar & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-gray-100">
          {/* Role Tabs */}
          <div className="inline-flex p-1 bg-gray-100 border border-gray-300 rounded-xl gap-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`flex-1 sm:flex-initial py-1 px-3 rounded-lg text-xs font-black transition-all ${
                roleFilter === "all"
                  ? "bg-primary-green text-gray-900 shadow-sm border border-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("student")}
              className={`flex-1 sm:flex-initial py-1 px-3 rounded-lg text-xs font-black transition-all ${
                roleFilter === "student"
                  ? "bg-primary-green text-gray-900 shadow-sm border border-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Siswa
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("teacher")}
              className={`flex-1 sm:flex-initial py-1 px-3 rounded-lg text-xs font-black transition-all ${
                roleFilter === "teacher"
                  ? "bg-primary-green text-gray-900 shadow-sm border border-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Guru
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Cari nama..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl text-xs font-medium focus:outline-none transition-all"
              />
            </div>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border-2 border-gray-300 focus:border-gray-900 rounded-xl py-1.5 px-2.5 font-bold text-xs text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="belum_absen">Belum Absen</option>
              <option value="masuk">Sudah Masuk</option>
              <option value="pulang">Sudah Pulang</option>
              <option value="manual">Izin / Sakit / Alpha</option>
              <option value="libur">Libur</option>
            </select>
          </div>
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

      {/* Attendance Records: Responsive View (Card in Mobile, Table in Desktop) */}
      <div className="pb-24 md:pb-12">
        {isLoading ? (
          <div>
            {/* Mobile Skeleton */}
            <div className="md:hidden space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
            {/* Desktop Table Skeleton */}
            <div className="hidden md:block bg-white border-3 border-gray-900 rounded-2xl shadow-neo overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-900 text-white text-xs uppercase tracking-wider font-black">
                  <tr>
                    <th className="p-3.5">Nama & NISN/NIP</th>
                    <th className="p-3.5">Peran & Lembaga</th>
                    <th className="p-3.5">Jam Masuk</th>
                    <th className="p-3.5">Jam Pulang</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <TableRowSkeleton cols={6} />
                  <TableRowSkeleton cols={6} />
                  <TableRowSkeleton cols={6} />
                  <TableRowSkeleton cols={6} />
                  <TableRowSkeleton cols={6} />
                </tbody>
              </table>
            </div>
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
          <>
            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-3">
              {paginatedRecords.map((item) => (
                <AttendanceItem
                  key={item.id}
                  item={item}
                  onEdit={handleEditAttendance}
                />
              ))}
            </div>

            {/* Desktop View: Modern Compact Table */}
            <div className="hidden md:block bg-white border-3 border-gray-900 rounded-2xl shadow-neo overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead className="bg-slate-100 border-b-2 border-gray-900 text-gray-800 uppercase text-[11px] font-black tracking-wider select-none">
                    <tr>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">Kelas / NIP</th>
                      <th className="py-3 px-3 text-center">Peran</th>
                      <th className="py-3 px-4 text-center">Jam Masuk</th>
                      <th className="py-3 px-4 text-center">Jam Pulang</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-200 font-medium">
                    {paginatedRecords.map((item) => {
                      const isStudent = item.role === "student";
                      const person = isStudent ? item.student || item : item.teacher || item;
                      const isBelumAbsen = !item.status || item.status === "belum_absen";

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50/80 transition-colors group"
                        >
                          <td className="py-2.5 px-4 font-black text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{person?.nama || "Tanpa Nama"}</span>
                              {person?.nisn && (
                                <span className="text-[11px] font-mono text-gray-400 font-normal">
                                  ({person.nisn})
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-4 text-gray-700">
                            {isStudent ? (
                              <span className="font-bold">
                                Kelas {formatKelas(person?.kelas) || "-"}
                              </span>
                            ) : (
                              <span className="font-mono text-xs text-gray-600">
                                {person?.nip ? `NIP: ${person.nip}` : "Guru/Staf"}
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                isStudent
                                  ? "bg-blue-100 text-blue-800 border-blue-300"
                                  : "bg-purple-100 text-purple-800 border-purple-300"
                              }`}
                            >
                              {isStudent ? "Siswa" : "Guru"}
                            </span>
                          </td>

                          <td className="py-2.5 px-4 text-center">
                            {item.check_in ? (
                              <span className="inline-flex items-center gap-1 font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                                <span className="material-symbols-outlined text-xs">login</span>
                                {item.check_in}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-mono text-xs">-</span>
                            )}
                          </td>

                          <td className="py-2.5 px-4 text-center">
                            {item.check_out ? (
                              <span className="inline-flex items-center gap-1 font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-300">
                                <span className="material-symbols-outlined text-xs">logout</span>
                                {item.check_out}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-mono text-xs">-</span>
                            )}
                          </td>

                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border-2 border-gray-900 ${
                                isBelumAbsen
                                  ? "bg-amber-200 text-amber-950 animate-pulse"
                                  : item.status === "hadir"
                                  ? "bg-primary-green text-gray-900"
                                  : item.status === "terlambat"
                                  ? "bg-amber-300 text-gray-900"
                                  : item.status === "izin"
                                  ? "bg-purple-200 text-purple-900"
                                  : item.status === "sakit"
                                  ? "bg-blue-200 text-blue-900"
                                  : item.status === "alpha"
                                  ? "bg-red-200 text-red-900"
                                  : item.status === "libur"
                                  ? "bg-teal-300 text-teal-950"
                                  : "bg-gray-200 text-gray-900"
                              }`}
                            >
                              {isBelumAbsen ? "Belum" : item.status}
                            </span>
                          </td>

                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isBelumAbsen && (
                                <button
                                  type="button"
                                  onClick={() => handleEditAttendance(item)}
                                  className="px-2 py-1 bg-primary-green hover:bg-emerald-400 text-gray-900 text-xs font-black rounded border-2 border-gray-900 shadow-neo active:translate-y-0.5 transition-all flex items-center gap-1"
                                  title="Tandai Hadir"
                                >
                                  <span className="material-symbols-outlined text-xs">check</span>
                                  <span>Hadir</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEditAttendance(item)}
                                className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded border border-gray-900 transition-colors"
                                title="Edit Presensi"
                              >
                                <span className="material-symbols-outlined text-sm">edit_note</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
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
        onSuccessMessage={(msg) => showAlert("Berhasil", msg)}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
