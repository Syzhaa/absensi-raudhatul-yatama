import { useKelasFormat } from "../hooks/useKelasFormat";

export default function PromoteClassModal({
  selectedCount,
  targetKelas,
  setTargetKelas,
  kelasData,
  onClose,
  onSubmit,
  isPending,
}) {
  const { formatKelas } = useKelasFormat();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-md w-full space-y-4 z-10 animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">Naik Kelas</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-gray-600">
              close
            </span>
          </button>
        </div>

        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3 text-sm text-blue-900">
          <p className="font-medium">
            ✓ {selectedCount} siswa dipilih untuk naik kelas
          </p>
          <p className="text-xs mt-1">
            Pilih kelas tujuan untuk memindahkan siswa terpilih
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">
            Kelas Tujuan *
          </label>
          <select
            value={targetKelas}
            onChange={(e) => setTargetKelas(e.target.value)}
            className="w-full px-4 py-3 min-h-[48px] bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm md:text-base text-gray-900 focus:border-primary-green focus:bg-white focus:outline-none transition-all cursor-pointer"
            required
          >
            <option value="">-- Pilih Kelas Tujuan --</option>
            {kelasData?.data?.map((kelas) => (
              <option key={kelas.id} value={kelas.nama}>
                {formatKelas(kelas.nama)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border-2 border-gray-900 rounded-xl shadow-neo transition-all"
          >
            Batal
          </button>
          <button
            onClick={onSubmit}
            disabled={!targetKelas || isPending}
            className="flex-1 py-3 px-4 bg-amber-100 hover:bg-amber-200 text-amber-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Memproses..." : "Naik Kelas"}
          </button>
        </div>
      </div>
    </div>
  );
}
