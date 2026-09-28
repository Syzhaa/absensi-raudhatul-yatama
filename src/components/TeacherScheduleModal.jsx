import React, { useState } from "react";
import { TEACHER_SCHEDULE_BY_DAY, getIndonesianDayName } from "../utils/scheduleHelper";

export default function TeacherScheduleModal({ isOpen, onClose, scheduleData }) {
  const [selectedDayTab, setSelectedDayTab] = useState(() => {
    const todayName = getIndonesianDayName(new Date());
    return todayName === "MINGGU" ? "SENIN" : todayName;
  });

  if (!isOpen) return null;

  const days = [
    { key: "SENIN", label: "Senin", color: "bg-amber-100 border-amber-300 text-amber-950" },
    { key: "SELASA", label: "Selasa", color: "bg-blue-100 border-blue-300 text-blue-950" },
    { key: "RABU", label: "Rabu", color: "bg-emerald-100 border-emerald-300 text-emerald-950" },
    { key: "KAMIS", label: "Kamis", color: "bg-orange-100 border-orange-300 text-orange-950" },
    { key: "JUMAT", label: "Jum'at", color: "bg-rose-100 border-rose-300 text-rose-950" },
    { key: "SABTU", label: "Sabtu", color: "bg-purple-100 border-purple-300 text-purple-950" },
  ];

  const todayName = getIndonesianDayName(new Date());

  // Data guru per hari dari props scheduleData jika ada, atau fallback resmi
  const getTeachersForDay = (dayKey) => {
    if (scheduleData?.schedule_by_day?.[dayKey]) {
      const teachers = new Set();
      Object.values(scheduleData.schedule_by_day[dayKey]).forEach((classes) => {
        if (typeof classes === "object" && classes !== null) {
          Object.values(classes).forEach((detail) => {
            const g = detail?.guru;
            if (g && g !== "-") teachers.add(g);
          });
        }
      });
      if (teachers.size > 0) return Array.from(teachers);
    }
    return TEACHER_SCHEDULE_BY_DAY[dayKey] || [];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white border-3 border-gray-900 rounded-2xl sm:rounded-3xl shadow-neo-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-neo-yellow border-b-3 border-gray-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-gray-900 flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-xl text-gray-900">event_note</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase truncate leading-tight">
                Jadwal Dewan Guru Tiap Hari
              </h2>
              <p className="text-[11px] font-bold text-gray-700 truncate">
                Tahun Ajaran 2026/2027 • MA Raudhatul Yatama
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white hover:bg-gray-100 border-2 border-gray-900 flex items-center justify-center font-black text-gray-900 shadow-xs active:translate-y-0.5 cursor-pointer shrink-0"
            title="Tutup"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Day Tabs */}
        <div className="p-3 bg-gray-50 border-b-2 border-gray-200 overflow-x-auto scrollbar-none flex items-center gap-1.5">
          {days.map((d) => {
            const isSelected = selectedDayTab === d.key;
            const isToday = todayName === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setSelectedDayTab(d.key)}
                className={`px-3 py-1.5 rounded-xl border-2 font-black text-xs uppercase transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                    : "bg-white text-gray-800 border-gray-900 hover:bg-gray-100"
                }`}
              >
                <span>{d.label}</span>
                {isToday && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Hari Ini" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content: Teachers on Selected Day */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-gray-500">Guru Bertugas:</span>
              <span className="px-2.5 py-0.5 bg-gray-900 text-white font-black text-xs uppercase rounded-lg">
                Hari {days.find((d) => d.key === selectedDayTab)?.label}
              </span>
              {todayName === selectedDayTab && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-400 font-bold text-[10px] rounded-md">
                  Hari Ini
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-gray-500">
              {getTeachersForDay(selectedDayTab).length} Dewan Guru
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {getTeachersForDay(selectedDayTab).map((guruName, idx) => (
              <div
                key={idx}
                className="p-3 bg-white border-2 border-gray-900 rounded-xl shadow-xs flex items-center gap-3 hover:translate-x-0.5 transition-transform"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 border border-gray-900 flex items-center justify-center font-black text-sm text-emerald-950 shrink-0 shadow-2xs">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-xs sm:text-sm text-gray-900 truncate">
                    {guruName}
                  </h4>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    Dewan Guru MA
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Full Week Summary Matrix */}
          <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200">
            <h3 className="text-xs font-black uppercase text-gray-700 mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              <span>Matriks Lengkap Seluruh Hari (Senin — Sabtu)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {days.map((d) => {
                const list = getTeachersForDay(d.key);
                const isToday = todayName === d.key;
                return (
                  <div
                    key={d.key}
                    onClick={() => setSelectedDayTab(d.key)}
                    className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedDayTab === d.key
                        ? "border-gray-900 bg-yellow-50 shadow-xs"
                        : "border-gray-300 bg-white hover:border-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs uppercase">{d.label}</span>
                      {isToday && (
                        <span className="text-[9px] font-black uppercase bg-emerald-500 text-white px-1.5 rounded">
                          Today
                        </span>
                      )}
                    </div>
                    <ul className="text-[10px] font-medium text-gray-700 space-y-0.5 leading-snug">
                      {list.map((g, i) => (
                        <li key={i} className="truncate">• {g.split(",")[0]}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-gray-100 border-t-2 border-gray-900 flex items-center justify-between gap-3">
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold">
            Sistem Presensi & Penugasan MA Raudhatul Yatama
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase shadow-xs active:translate-y-0.5 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
