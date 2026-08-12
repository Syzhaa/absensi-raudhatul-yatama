import { useState } from "react";

const PromoteModal = ({
  isOpen,
  onClose,
  selectedUsers,
  onSubmit,
  isSubmitting,
}) => {
  const [newKelas, setNewKelas] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newKelas.trim()) return;
    onSubmit(newKelas.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white border-3 border-gray-900 rounded-2xl shadow-neo-xl overflow-hidden">
        <div className="bg-amber-50 border-b-3 border-gray-900 p-4 flex items-center justify-between">
          <div>
            <h2 className="font-black text-lg text-gray-900">Naik Kelas</h2>
            <p className="text-sm text-gray-600">
              {selectedUsers.length} siswa terpilih
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-amber-100"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">
              Kelas Tujuan
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 11, 12, XIII"
              value={newKelas}
              onChange={(e) => setNewKelas(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl font-medium text-sm focus:border-primary-green focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Semua siswa terpilih akan dipindahkan ke kelas ini
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 border-2 border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-200"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-amber-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo hover:clean-shadow-md disabled:opacity-50"
            >
              {isSubmitting ? "Memproses..." : "Naik Kelas"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromoteModal;
