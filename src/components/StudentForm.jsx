import { useState, useEffect } from "react";
import Modal from "./Modal";
import { getPhotoUrl } from "../services/api";

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

  useEffect(() => {
    if (isOpen) {
      setPhotoFile(null);
      setPhotoPreview(editingStudent?.foto || null);
    }
  }, [isOpen, editingStudent]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2048 * 1024) {
        alert("Ukuran foto maksimal 2MB");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const baseClass =
    "w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all";
  const inputClass = `${baseClass} placeholder:text-gray-400`;
  const selectClass = `${baseClass} cursor-pointer`;
  const labelClass =
    "block font-bold text-xs md:text-sm text-gray-800 uppercase tracking-wider mb-1.5";
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
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onSubmit(photoFile)}
            className="w-full py-3.5 px-6 bg-primary-green text-gray-900 font-bold text-base md:text-lg rounded-full border-2 border-gray-900 shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          >
            <span className="material-symbols-outlined text-xl">
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
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors text-center"
          >
            Batal
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
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Photo Upload */}
        <div className="md:col-span-2">
          <label className={labelClass}>Foto Siswa</label>
          <div className="flex items-start gap-4">
            {photoPreview && (
              <div className="relative">
                <img
                  src={getPhotoUrl(photoPreview)}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
              >
                <span className="material-symbols-outlined">upload</span>
                <span className="text-sm font-medium">
                  {photoPreview ? "Ganti Foto" : "Pilih Foto"}
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG. Max 2MB
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Lembaga *</label>
          <select {...field("lembaga")} className={selectClass} required>
            <option value="MA">MA</option>
            <option value="MTs">MTs</option>
          </select>
        </div>

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
          <label className={labelClass}>Tanggal Lahir</label>
          <input type="date" {...field("tanggal_lahir")} className={baseClass} />
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
          <label className={labelClass}>Kelas</label>
          <select {...field("kelas")} className={selectClass}>
            <option value="">-- Pilih Kelas --</option>
            {kelasData?.data?.map((kelas) => (
              <option key={kelas.id} value={kelas.nama}>
                {kelas.nama}
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

        <div className="md:col-span-2">
          <label className={labelClass}>Alamat Lengkap</label>
          <textarea
            {...field("alamat")}
            className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
            rows="3"
            placeholder="Alamat domisili siswa"
          ></textarea>
        </div>
      </form>
    </Modal>
  );
}
