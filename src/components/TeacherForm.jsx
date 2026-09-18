import { useState, useEffect, useMemo } from "react";
import Modal from "./Modal";
import {
  getAllMapelList,
  saveCustomMapel,
  parseAssignments,
  serializeAssignments,
} from "../utils/mapelHelper";
import { filterKelasByLembaga, sortKelasList } from "../utils/kelasHelper";

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
    const rawList = kelasData?.data && Array.isArray(kelasData.data) && kelasData.data.length > 0
      ? filterKelasByLembaga(kelasData.data, targetLembaga).map((k) => k.nama || k.tingkat)
      : [];

    const list = rawList.length > 0
      ? rawList
      : (targetLembaga === "mts" ? ["VII", "VIII", "IX"] : ["X", "XI", "XII"]);

    return sortKelasList([...new Set(list)]);
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
    "w-full px-3 py-1.5 min-h-[36px] bg-gray-50 border-2 border-gray-300 rounded-xl font-bold text-xs sm:text-sm text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none transition-all";
  const inputClass = `${baseClass} placeholder:text-gray-400 font-medium`;
  const labelClass =
    "block font-black text-[11px] text-gray-800 uppercase tracking-wider mb-1";
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
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl border border-gray-300 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            form="teacher-form"
            className="px-5 py-2 bg-primary-green hover:bg-lime-400 text-gray-900 font-black text-xs sm:text-sm rounded-xl border-2 border-gray-900 shadow-neo active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            disabled={isPending}
          >
            <span className="material-symbols-outlined text-base">
              {editingTeacher ? "save" : "person_add"}
            </span>
            <span>
              {isPending
                ? "Menyimpan..."
                : editingTeacher
                  ? "Simpan Guru"
                  : "Tambah Guru"}
            </span>
          </button>
        </div>
      }
    >
      <form
        onSubmit={handleFormSubmit}
        id="teacher-form"
        className="space-y-3"
      >
        {/* Row 1: Data Identitas Guru (Nama, NPK & No. HP/WA) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
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
              placeholder="Nomor NIP / NPK Guru"
            />
          </div>

          {/* 3. Nomor WhatsApp / HP Asli Guru */}
          <div>
            <label className={labelClass}>No. HP / WhatsApp Guru</label>
            <input
              type="tel"
              {...field("nomor_hp")}
              className={`${inputClass} font-mono`}
              placeholder="Contoh: 08123456789"
            />
          </div>
        </div>

        {/* 3. Section: Penugasan Mata Pelajaran & Kelas */}
        <div className="space-y-3 bg-slate-50 p-4 border-2 border-gray-300 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <label className="block font-black text-xs text-gray-900 uppercase tracking-wider">
                Mata Pelajaran & Kelas Diampu *
              </label>
              <p className="text-[11px] text-gray-500 font-medium">
                Pilih kelas dan mata pelajaran yang diajar, lalu klik tombol "+ Tambah".
              </p>
            </div>
            {assignments.length > 0 && (
              <span className="self-start sm:self-auto px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[11px] font-black rounded-lg border border-emerald-300">
                {assignments.length} Mapel Ditugaskan
              </span>
            )}
          </div>

          {/* Existing assignments badges */}
          <div className="flex flex-wrap gap-2 min-h-[44px] p-2.5 bg-white border-2 border-gray-200 rounded-xl items-center">
            {assignments.length === 0 ? (
              <span className="text-xs text-gray-400 italic">
                Belum ada mapel dipilih. Silakan tentukan kelas & mapel di bawah lalu klik "+ Tambahkan ke Daftar".
              </span>
            ) : (
              assignments.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-950 border-2 border-emerald-400 rounded-xl text-xs font-bold shadow-sm"
                >
                  <span className="bg-emerald-800 text-white px-2 py-0.5 rounded-md text-[10px] font-black">
                    {item.kelas === "Semua" ? "Semua Kelas" : `Kelas ${item.kelas}`}
                  </span>
                  <span className="font-extrabold">{item.mapel}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignment(idx)}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-600 ml-1 font-black text-sm transition-colors cursor-pointer"
                    title="Hapus Penugasan"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Controls Container: Clean Inline Row with Small Side Button */}
          <div className="bg-white p-3 border-2 border-gray-200 rounded-xl space-y-2">
            <div className="flex items-end gap-2">
              {/* 1. Pilih Kelas */}
              <div className="w-1/3">
                <label className="block text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1">
                  Kelas *
                </label>
                <select
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Kelas --</option>
                  {availableKelasList.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                  <option value="Semua">Semua Kelas</option>
                </select>
              </div>

              {/* 2. Pilih Mata Pelajaran */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-gray-700 uppercase tracking-wider">
                    Mata Pelajaran *
                  </label>
                  {!isAddingCustomMapel && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomMapel(true)}
                      className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>+ Mapel Baru</span>
                    </button>
                  )}
                </div>

                {isAddingCustomMapel ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={customMapelInput}
                      onChange={(e) => setCustomMapelInput(e.target.value)}
                      placeholder="Mapel baru..."
                      className="flex-1 px-3 py-2 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomMapel}
                      className="px-2 py-2 bg-primary-green text-gray-900 font-black text-xs rounded-xl border-2 border-gray-900 hover:bg-emerald-400 cursor-pointer shadow-sm"
                      title="Simpan Mapel Baru"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomMapel(false)}
                      className="px-2 py-2 bg-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-300 cursor-pointer"
                      title="Batal"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedMapel}
                    onChange={(e) => setSelectedMapel(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:outline-none cursor-pointer"
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
                )}
              </div>

              {/* Small compact button at the side with icon + */}
              <button
                type="button"
                onClick={handleAddAssignment}
                disabled={!selectedKelas || !selectedMapel || !!checkConflict(selectedKelas, selectedMapel)}
                className="h-[38px] px-3 bg-emerald-400 hover:bg-emerald-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:shadow-none text-gray-900 font-black text-xs rounded-xl border-2 border-gray-900 shadow-neo transition-all active:translate-y-0.5 flex items-center justify-center gap-1 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
                title="Tambahkan Mapel"
              >
                <span className="material-symbols-outlined text-lg font-bold">add</span>
              </button>
            </div>

            {/* Conflict Alert if any */}
            {selectedKelas && selectedMapel && checkConflict(selectedKelas, selectedMapel) && (
              <p className="text-[11px] text-red-600 font-bold flex items-center gap-1.5 bg-red-50 p-2 rounded-xl border border-red-200">
                <span className="material-symbols-outlined text-base flex-shrink-0">error</span>
                <span>
                  Mapel <strong>{selectedMapel}</strong> di <strong>Kelas {selectedKelas}</strong> sudah diampu oleh <strong>{checkConflict(selectedKelas, selectedMapel)}</strong>.
                </span>
              </p>
            )}
          </div>

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
