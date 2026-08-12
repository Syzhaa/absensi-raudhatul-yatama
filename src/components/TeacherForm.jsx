import Modal from "./Modal";

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
      title={editingTeacher ? "Edit Guru" : "Tambah Guru"}
      size="lg"
      footer={
        <div className="space-y-2">
          <button
            type="button"
            onClick={onSubmit}
            className="w-full py-3.5 px-6 bg-primary-green text-gray-900 font-bold text-base md:text-lg rounded-full border-2 border-gray-900 shadow-neo hover:clean-shadow-md active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          >
            <span className="material-symbols-outlined text-xl">
              {editingTeacher ? "save" : "check"}
            </span>
            <span>
              {isPending
                ? "Menyimpan..."
                : editingTeacher
                  ? "Update Guru"
                  : "Simpan Guru"}
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
        onSubmit={onSubmit}
        id="teacher-form"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <label className={labelClass}>Lembaga *</label>
          <select {...field("lembaga")} className={selectClass} required>
            <option value="MA">MA</option>
            <option value="MTs">MTs</option>
            <option value="Yayasan">Yayasan</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Nama Guru *</label>
          <input
            type="text"
            {...field("nama")}
            className={inputClass}
            placeholder="Nama lengkap guru & gelar"
            required
          />
        </div>

        <div>
          <label className={labelClass}>NIP / NIDN</label>
          <input
            type="text"
            {...field("nip")}
            className={inputClass}
            placeholder="Nomor Induk Pegawai"
          />
        </div>

        <div>
          <label className={labelClass}>Mata Pelajaran</label>
          <input
            type="text"
            {...field("mata_pelajaran")}
            className={inputClass}
            placeholder="Misal: Matematika, Bahasa Indonesia"
          />
        </div>

        <div>
          <label className={labelClass}>No HP / WhatsApp</label>
          <input
            type="text"
            {...field("nomor_hp")}
            className={inputClass}
            placeholder="08123456789"
          />
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select {...field("status")} className={selectClass}>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Non-aktif</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
