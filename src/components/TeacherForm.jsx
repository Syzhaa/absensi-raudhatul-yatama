import React from "react";
import Modal from "./Modal";
import { DEFAULT_MAPEL_LIST } from "../utils/mapelHelper";

export default function TeacherForm({
  isOpen,
  onClose,
  editingTeacher,
  formData,
  setFormData,
  onSubmit,
  isPending,
}) {
  const baseClass =
    "w-full px-4 py-2.5 min-h-[44px] bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-bold text-xs sm:text-sm text-gray-900 focus:outline-none transition-all";
  const inputClass = `${baseClass} placeholder:text-gray-400 font-medium`;
  const labelClass =
    "block font-black text-xs text-gray-800 uppercase tracking-wider mb-1.5";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama || !formData.nama.trim()) {
      alert("Nama guru wajib diisi.");
      return;
    }
    onSubmit();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTeacher ? "Edit Data Guru" : "Tambah Guru Baru"}
      size="sm"
      footer={
        <div className="space-y-2">
          <button
            type="submit"
            form="teacher-simple-form"
            className="w-full py-3 px-6 bg-primary-green text-gray-900 font-black text-sm md:text-base rounded-xl border-2 border-gray-900 shadow-neo hover:shadow-neo-lg active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            disabled={isPending}
          >
            <span className="material-symbols-outlined text-xl">
              {editingTeacher ? "save" : "check"}
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
        id="teacher-simple-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* 1. Nama Guru */}
        <div>
          <label className={labelClass}>Nama Guru *</label>
          <input
            type="text"
            required
            value={formData.nama || ""}
            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
            placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd"
            className={inputClass}
            autoFocus
          />
        </div>

        {/* 2. Mata Pelajaran */}
        <div>
          <label className={labelClass}>Mata Pelajaran (Mapel) *</label>
          <input
            type="text"
            list="mapel-options"
            required
            value={formData.mata_pelajaran || ""}
            onChange={(e) =>
              setFormData({ ...formData, mata_pelajaran: e.target.value })
            }
            placeholder="Ketik nama mapel atau pilih..."
            className={inputClass}
          />
          <datalist id="mapel-options">
            {DEFAULT_MAPEL_LIST.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <p className="text-[10px] text-gray-500 mt-1">
            Bisa ketik nama mapel langsung (contoh: Matematika, Sejarah, Fiqih, dll).
          </p>
        </div>

        {/* 3. NIP / NUPTK / NPK */}
        <div>
          <label className={labelClass}>NPK / NIP / NUPTK</label>
          <input
            type="text"
            value={formData.nip || ""}
            onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
            placeholder="Nomor NPK / NIP / NUPTK guru"
            className={`${inputClass} font-mono`}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Digunakan untuk nomor identitas kartu dan presensi guru.
          </p>
        </div>
      </form>
    </Modal>
  );
}
