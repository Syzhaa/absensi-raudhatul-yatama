export function LogoutModal({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />

      <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-sm w-full space-y-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-red-600 flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">warning</span>
          </div>
          <h2 className="text-xl font-black text-gray-900">
            Konfirmasi Logout
          </h2>
        </div>

        <p className="text-sm text-gray-600 font-medium">
          Apakah Anda yakin ingin keluar dari akun admin ini?
        </p>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border-2 border-gray-900 rounded-xl transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-gray-900 rounded-xl shadow-neo transition-all"
          >
            Ya, Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export function TestModeModal({ testMode, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />

      <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-sm w-full space-y-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-amber-700 flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">science</span>
          </div>
          <h2 className="text-lg font-black text-gray-900">
            {testMode ? "Matikan Mode Testing?" : "Masuk ke Mode Simulasi?"}
          </h2>
        </div>

        <p className="text-xs md:text-sm text-gray-600 font-medium leading-relaxed">
          {testMode
            ? "Aplikasi akan kembali ke mode produksi normal dan menampilkan data asli."
            : "Data yang dimasukkan tidak akan tersimpan ke absen asli dan data produksi asli akan disembunyikan."}
        </p>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border-2 border-gray-900 rounded-xl transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 bg-amber-400 hover:bg-amber-500 text-gray-950 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all"
          >
            {testMode ? "Ya, Matikan" : "Ya, Masuk Mode Test"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClearDataModal({ isClearing, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />

      <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-sm w-full space-y-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-red-600 flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">
              delete_forever
            </span>
          </div>
          <h2 className="text-lg font-black text-gray-900">
            Hapus Semua Data Test?
          </h2>
        </div>

        <p className="text-xs md:text-sm text-gray-600 font-medium leading-relaxed">
          Seluruh riwayat absensi percobaan yang dibuat saat mode testing akan
          dibersihkan secara permanen.
        </p>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border-2 border-gray-900 rounded-xl transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isClearing}
            className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all disabled:opacity-50"
          >
            {isClearing ? "Menghapus..." : "Ya, Hapus Data Test"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClearSuccessModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-sm w-full space-y-4 z-10 animate-slide-up text-center">
        <div className="w-14 h-14 bg-emerald-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
          <span className="material-symbols-outlined text-3xl font-black">
            check_circle
          </span>
        </div>
        <h2 className="text-xl font-black text-gray-900">
          Data Test Dibersihkan!
        </h2>
        <p className="text-sm text-gray-600 font-medium leading-relaxed">
          Seluruh data & log absensi mode testing telah berhasil dihapus secara
          bersih dari sistem.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black border-2 border-gray-900 rounded-xl shadow-neo transition-all"
        >
          Selesai
        </button>
      </div>
    </div>
  );
}
