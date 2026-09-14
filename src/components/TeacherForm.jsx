import { useState, useEffect, useMemo } from "react";
import Modal from "./Modal";
import {
  getAllMapelList,
  saveCustomMapel,
  parseAssignments,
  serializeAssignments,
} from "../utils/mapelHelper";

export default function TeacherForm({
  isOpen,
  onClose,
  editingTeacher,
  formData,
  setFormData,
  onSubmit,
  isPending,
  kelasData,
  allTeachers = [],
}) {
  // State untuk penugasan Mapel & Kelas
  const [assignments, setAssignments] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedMapel, setSelectedMapel] = useState("");
  const [isAddingCustomMapel, setIsAddingCustomMapel] = useState(false);
  const [customMapelInput, setCustomMapelInput] = useState("");
  const [mapelList, setMapelList] = useState(getAllMapelList());

  // Load existing assignments when editingTeacher changes
  useEffect(() => {
    if (isOpen) {
      if (formData.mata_pelajaran) {
        setAssignments(parseAssignments(formData.mata_pelajaran));
      } else {
        setAssignments([]);
      }
      setSelectedKelas("");
      setSelectedMapel("");
      setIsAddingCustomMapel(false);
      setCustomMapelInput("");
      setMapelList(getAllMapelList());
    }
  }, [isOpen, editingTeacher, formData.mata_pelajaran]);

  // Update formData.mata_pelajaran whenever assignments change
  const updateAssignments = (newAssignments) => {
    setAssignments(newAssignments);
    setFormData((prev) => ({
      ...prev,
      mata_pelajaran: serializeAssignments(newAssignments),
    }));
  };

  // Determine available classes based on teacher lembaga
  const targetLembaga = (formData.lembaga || "MA").toLowerCase();
  const availableKelasList = useMemo(() => {
    if (kelasData?.data && Array.isArray(kelasData.data) && kelasData.data.length > 0) {
      return kelasData.data.map((k) => k.nama || k.tingkat);
    }
    return targetLembaga === "mts" ? ["VII", "VIII", "IX"] : ["X", "XI", "XII"];
  }, [kelasData, targetLembaga]);

  // Map of taken subjects per class by other teachers: { "Kelas:Mapel": "Nama Guru" }
  const takenMapelMap = useMemo(() => {
    const map = {};
    const otherTeachers = allTeachers.filter(
      (t) =>
        t.id !== editingTeacher?.id &&
        (t.lembaga || "").toLowerCase() === targetLembaga
    );

    otherTeachers.forEach((t) => {
      if (t.mata_pelajaran) {
        const teacherAssignments = parseAssignments(t.mata_pelajaran);
        teacherAssignments.forEach((item) => {
          const key = `${item.kelas.toUpperCase()}:${item.mapel.toLowerCase()}`;
          map[key] = t.nama;
        });
      }
    });

    return map;
  }, [allTeachers, editingTeacher, targetLembaga]);

  // Check if a (kelas, mapel) is already taken by another teacher
  const checkConflict = (kelas, mapel) => {
    if (!kelas || !mapel) return null;
    const key = `${kelas.toUpperCase()}:${mapel.toLowerCase()}`;
    if (takenMapelMap[key]) {
      return takenMapelMap[key];
    }
    const globalKey = `SEMUA:${mapel.toLowerCase()}`;
    if (takenMapelMap[globalKey]) {
      return takenMapelMap[globalKey];
    }
    return null;
  };

  const handleAddAssignment = () => {
    if (!selectedKelas || !selectedMapel) return;

    const exists = assignments.some(
      (a) =>
        a.kelas.toUpperCase() === selectedKelas.toUpperCase() &&
        a.mapel.toLowerCase() === selectedMapel.toLowerCase()
    );
    if (exists) {
      alert(`Mata pelajaran ${selectedMapel} untuk Kelas ${selectedKelas} sudah ditambahkan ke guru ini.`);
      return;
    }

    const conflictTeacher = checkConflict(selectedKelas, selectedMapel);
    if (conflictTeacher) {
      alert(`Mapel ${selectedMapel} di Kelas ${selectedKelas} sudah diampu oleh ${conflictTeacher}.`);
      return;
    }

    const newAssignments = [...assignments, { mapel: selectedMapel, kelas: selectedKelas }];
    updateAssignments(newAssignments);
    setSelectedMapel("");
  };

  const handleRemoveAssignment = (index) => {
    const newAssignments = assignments.filter((_, i) => i !== index);
    updateAssignments(newAssignments);
  };

  const handleAddCustomMapel = () => {
    if (!customMapelInput || !customMapelInput.trim()) return;
    const clean = customMapelInput.trim();
    saveCustomMapel(clean);
    setMapelList(getAllMapelList());
    setSelectedMapel(clean);
    setCustomMapelInput("");
    setIsAddingCustomMapel(false);
  };

  const baseClass =
    "w-full px-4 py-2.5 min-h-[44px] bg-gray-50 border-2 border-gray-300 rounded-xl font-bold text-xs sm:text-sm text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none transition-all";
  const inputClass = `${baseClass} placeholder:text-gray-400 font-medium`;
  const labelClass =
    "block font-black text-xs text-gray-800 uppercase tracking-wider mb-1.5";
  const field = (key) => ({
    value: formData[key] || "",
    onChange: (e) => setFormData({ ...formData, [key]: e.target.value }),
  });

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    if (!formData.nama || !formData.nama.trim()) {
      alert("Nama lengkap guru wajib diisi.");
      return;
    }
    if (assignments.length === 0) {
      alert("Silakan tambahkan minimal 1 mata pelajaran & kelas yang diampu.");
      return;
    }
    onSubmit();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTeacher ? "Edit Data Guru" : "Tambah Guru Baru"}
      size="md"
      footer={
        <div className="space-y-2">
          <button
            type="submit"
            form="teacher-form"
            className="w-full py-3 px-6 bg-primary-green text-gray-900 font-black text-sm md:text-base rounded-xl border-2 border-gray-900 shadow-neo hover:shadow-neo-lg active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            disabled={isPending}
          >
            <span className="material-symbols-outlined text-xl">
              {editingTeacher ? "save" : "person_add"}
            </span>
            <span>
              {isPending
                ? "Menyimpan..."
                : editingTeacher
                  ? "Simpan Perubahan Guru"
                  : "Simpan Guru"}
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors text-center cursor-pointer"
          >
            Batal
          </button>
        </div>
      }
    >
      <form
        onSubmit={handleFormSubmit}
        id="teacher-form"
        className="space-y-4"
      >
        {/* 1. Nama Guru */}
        <div>
          <label className={labelClass}>Nama Lengkap Guru *</label>
          <input
            type="text"
            {...field("nama")}
            className={inputClass}
            placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd"
            required
            autoFocus
          />
        </div>

        {/* 2. NIP / NUPTK / NPK */}
        <div>
          <label className={labelClass}>NIP / NUPTK / NPK</label>
          <input
            type="text"
            {...field("nip")}
            className={`${inputClass} font-mono`}
            placeholder="Nomor NIP / NUPTK / NPK Guru"
          />
          <p className="text-[10px] text-gray-500 font-medium mt-1">
            Nomor unik identitas guru untuk cetak kartu dan presensi mandiri.
          </p>
        </div>

        {/* 3. Section: Penugasan Mata Pelajaran & Kelas */}
        <div className="space-y-2.5 bg-gray-50 p-3.5 sm:p-4 border-2 border-gray-300 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="block font-black text-xs text-gray-900 uppercase tracking-wider">
              Mata Pelajaran & Kelas Diampu *
            </label>
            <span className="text-[10px] text-gray-500 font-medium">
              1 Guru per Mapel di Kelas Tertentu
            </span>
          </div>

          {/* Existing assignments badges */}
          <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-white border-2 border-gray-200 rounded-xl items-center">
            {assignments.length === 0 ? (
              <span className="text-xs text-gray-400 italic">
                Belum ada mapel dipilih. Pilih kelas & mapel di bawah lalu klik "+ Tambah".
              </span>
            ) : (
              assignments.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-950 border-2 border-emerald-300 rounded-lg text-xs font-bold shadow-sm"
                >
                  <span className="bg-emerald-700 text-white px-1.5 py-0.5 rounded text-[10px] font-black">
                    {item.kelas === "Semua" ? "Semua Kelas" : `Kelas ${item.kelas}`}
                  </span>
                  <span>{item.mapel}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignment(idx)}
                    className="text-red-500 hover:text-red-700 ml-1 font-black text-sm leading-none cursor-pointer"
                    title="Hapus Penugasan"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Selector Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            {/* Kelas Dropdown */}
            <div className="sm:col-span-4">
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value="">-- Pilih Kelas --</option>
                {availableKelasList.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k}
                  </option>
                ))}
                <option value="Semua">Semua Kelas</option>
              </select>
            </div>

            {/* Mapel Dropdown + Tambah Button */}
            <div className="sm:col-span-5 flex gap-1">
              {isAddingCustomMapel ? (
                <div className="flex-1 flex gap-1">
                  <input
                    type="text"
                    value={customMapelInput}
                    onChange={(e) => setCustomMapelInput(e.target.value)}
                    placeholder="Ketik Mapel Baru..."
                    className="flex-1 px-3 py-2 bg-white border-2 border-emerald-500 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMapel}
                    className="px-2.5 py-2 bg-primary-green text-gray-900 font-bold text-xs rounded-xl border-2 border-gray-900 hover:bg-emerald-400 flex items-center justify-center cursor-pointer"
                    title="Simpan Mapel"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomMapel(false)}
                    className="px-2 py-2 bg-gray-200 text-gray-600 font-bold text-xs rounded-xl hover:bg-gray-300 flex items-center justify-center cursor-pointer"
                    title="Batal"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex gap-1">
                  <select
                    value={selectedMapel}
                    onChange={(e) => setSelectedMapel(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Pilih Mapel --</option>
                    {mapelList.map((m) => {
                      const conflict = checkConflict(selectedKelas, m);
                      return (
                        <option
                          key={m}
                          value={m}
                          disabled={!!conflict}
                          className={conflict ? "text-gray-400 bg-gray-100" : "text-gray-900"}
                        >
                          {m} {conflict ? `(❌ Diampu: ${conflict})` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomMapel(true)}
                    className="px-2.5 py-2 bg-white hover:bg-gray-100 text-gray-900 font-black text-xs rounded-xl border-2 border-gray-900 shadow-sm flex items-center justify-center gap-0.5 flex-shrink-0 cursor-pointer"
                    title="Tambah Mapel Baru ke Daftar"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add Button */}
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={handleAddAssignment}
                disabled={!selectedKelas || !selectedMapel || !!checkConflict(selectedKelas, selectedMapel)}
                className="w-full py-2 px-3 bg-primary-green hover:bg-emerald-400 disabled:opacity-40 text-gray-900 font-black text-xs rounded-xl border-2 border-gray-900 shadow-sm flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">playlist_add</span>
                <span>+ Tambah</span>
              </button>
            </div>
          </div>

          {/* Conflict Alert */}
          {selectedKelas && selectedMapel && checkConflict(selectedKelas, selectedMapel) && (
            <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 bg-red-50 p-2 rounded-lg border border-red-200">
              <span className="material-symbols-outlined text-sm flex-shrink-0">error</span>
              <span>
                Mapel <strong>{selectedMapel}</strong> di <strong>Kelas {selectedKelas}</strong> sudah diampu oleh <strong>{checkConflict(selectedKelas, selectedMapel)}</strong>.
              </span>
            </p>
          )}

          <input
            type="hidden"
            name="mata_pelajaran"
            value={formData.mata_pelajaran || ""}
          />
        </div>
      </form>
    </Modal>
  );
}
