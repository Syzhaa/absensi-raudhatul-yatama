import { useState, useEffect, useMemo } from "react";
import { useKelasFormat } from "../hooks/useKelasFormat";
import { useEffectiveLembaga } from "../hooks/useEffectiveLembaga";
import { filterKelasByLembaga, sortKelasList } from "../utils/kelasHelper";
import { compressImage } from "../utils/imageCompressor";
import Modal from "./Modal";
import { getPhotoUrl } from "../services/api";
import { useAppStore } from "../store/useAppStore";

export default function StudentForm({
  isOpen,
  onClose,
  editingStudent,
  formData,
  setFormData,
  onSubmit,
  isPending,
  kelasData,
}) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(editingStudent?.foto || null);
  const userRole = useAppStore((state) => state.userRole);
  const { formatKelas } = useKelasFormat();
  const { effectiveLembaga } = useEffectiveLembaga();
  const targetLembaga = (formData.lembaga || effectiveLembaga || "ma").toLowerCase();

  const optionsKelas = useMemo(() => {
    const rawList = kelasData?.data && Array.isArray(kelasData.data) && kelasData.data.length > 0
      ? filterKelasByLembaga(kelasData.data, targetLembaga).map((k) => k.nama || k.tingkat)
      : [];

    let list = rawList.length > 0
      ? rawList
      : (targetLembaga === "mts" ? ["VII", "VIII", "IX"] : ["X", "XI", "XII"]);

    if (formData.kelas && !list.includes(formData.kelas)) {
      list = [formData.kelas, ...list];
    }
    return sortKelasList([...new Set(list)]);
  }, [kelasData, targetLembaga, formData.kelas]);

  useEffect(() => {
    if (isOpen) {
      setPhotoFile(null);
      setPhotoPreview(editingStudent?.foto || null);
    }
  }, [isOpen, editingStudent]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Ukuran foto maksimal 10MB");
        return;
      }
      try {
        const compressed = await compressImage(file, 600, 0.8);
        setPhotoFile(compressed);
        setPhotoPreview(URL.createObjectURL(compressed));
      } catch (err) {
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const baseClass =
    "w-full px-3 py-1.5 min-h-[36px] bg-gray-50 border-2 border-gray-300 rounded-xl font-bold text-xs sm:text-sm text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none transition-all";
  const inputClass = `${baseClass} placeholder:text-gray-400 font-medium`;
  const selectClass = `${baseClass} cursor-pointer`;
  const labelClass =
    "block font-black text-[11px] text-gray-800 uppercase tracking-wider mb-1";
  const field = (key) => ({
    value: formData[key],
    onChange: (e) => setFormData({ ...formData, [key]: e.target.value }),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingStudent ? "Edit Siswa" : "Tambah Siswa"}
      size="lg"
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
            type="button"
            onClick={() => onSubmit(photoFile)}
            className="px-5 py-2 bg-primary-green hover:bg-lime-400 text-gray-900 font-black text-xs sm:text-sm rounded-xl border-2 border-gray-900 shadow-neo active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            disabled={isPending}
          >
            <span className="material-symbols-outlined text-base">
              {editingStudent ? "save" : "check"}
            </span>
            <span>
              {isPending
                ? "Menyimpan..."
                : editingStudent
                  ? "Update Siswa"
                  : "Simpan Siswa"}
            </span>
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(photoFile);
        }}
        id="student-form"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5"
      >
        {/* Photo Upload Compact */}
        <div className="col-span-full bg-gray-50 border border-gray-200 rounded-xl p-2 sm:p-2.5 flex items-center gap-3">
          {photoPreview && (
            <div className="relative shrink-0">
              <img
                src={getPhotoUrl(photoPreview)}
                alt="Preview"
                className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg border-2 border-gray-300 shadow-xs"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={handlePhotoChange}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors text-xs font-bold text-gray-800 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm text-gray-600">upload</span>
              <span>{photoPreview ? "Ganti Foto" : "Unggah Foto Siswa"}</span>
            </label>
            <span className="text-[10px] text-gray-500 font-medium ml-2">
              JPG/PNG/WebP
            </span>
          </div>
        </div>

        {userRole === "super_admin" && (
          <div>
            <label className={labelClass}>Lembaga *</label>
            <select {...field("lembaga")} className={selectClass} required>
              <option value="MA">MA</option>
              <option value="MTs">MTs</option>
            </select>
          </div>
        )}

        <div>
          <label className={labelClass}>Nama Siswa *</label>
          <input
            type="text"
            {...field("nama")}
            className={inputClass}
            placeholder="Nama lengkap siswa"
            required
          />
        </div>

        <div>
          <label className={labelClass}>NISN (10 digit)</label>
          <input
            type="text"
            value={formData.nisn}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              if (value.length <= 10) {
                setFormData({ ...formData, nisn: value });
              }
            }}
            className={inputClass}
            placeholder="10 digit angka"
            maxLength={10}
          />
          {formData.nisn &&
            formData.nisn.length > 0 &&
            formData.nisn.length !== 10 && (
              <p className="text-red-600 text-xs font-semibold mt-1">
                NISN harus tepat 10 digit (sekarang: {formData.nisn.length})
              </p>
            )}
        </div>

        <div>
          <label className={labelClass}>Tempat Lahir</label>
          <input
            type="text"
            {...field("tempat_lahir")}
            className={inputClass}
            placeholder="Kota tempat lahir"
          />
        </div>

        <div>
          <label htmlFor="tanggal_lahir_input" className={labelClass}>Tanggal Lahir</label>
          <input id="tanggal_lahir_input" type="date" {...field("tanggal_lahir")} className={baseClass} />
        </div>

        <div>
          <label className={labelClass}>Jenis Kelamin *</label>
          <select
            {...field("jenis_kelamin")}
            className={selectClass}
            required
          >
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Kelas *</label>
          <select {...field("kelas")} className={selectClass} required>
            <option value="">-- Pilih Kelas --</option>
            {optionsKelas.map((namaKelas) => (
              <option key={namaKelas} value={namaKelas}>
                Kelas {formatKelas(namaKelas)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>No HP Orang Tua</label>
          <input
            type="text"
            {...field("nomor_hp_orangtua")}
            className={inputClass}
            placeholder="08123456789"
          />
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select {...field("status")} className={selectClass}>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Non-aktif</option>
            <option value="lulus">Lulus</option>
            <option value="pindah">Pindah</option>
          </select>
        </div>

        <div className="col-span-full">
          <label className={labelClass}>Alamat Lengkap</label>
          <textarea
            {...field("alamat")}
            className="w-full px-3 py-1.5 bg-gray-50 border-2 border-gray-300 rounded-xl font-medium text-xs sm:text-sm text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
            rows="2"
            placeholder="Alamat domisili siswa"
          ></textarea>
        </div>
      </form>
    </Modal>
  );
}
