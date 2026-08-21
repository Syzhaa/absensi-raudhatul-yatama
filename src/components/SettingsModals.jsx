import React, { useState } from "react";

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

export function ClearAllAttendanceModal({ isClearing, onCancel, onConfirm }) {
  const [confirmText, setConfirmText] = useState("");
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />

      <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-md w-full space-y-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 border-2 border-red-500 rounded-full flex items-center justify-center text-red-600 flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">warning</span>
          </div>
          <h2 className="text-lg font-black text-gray-900">
            Hapus Semua Data Absensi?
          </h2>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-medium">
            Tindakan ini akan menghapus <strong className="text-red-600">SEMUA</strong> data absensi siswa dan guru dari database.
          </p>
          <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl">
            <p className="text-xs text-red-700 font-bold flex items-start gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>Peringatan: Tindakan ini tidak dapat dibatalkan!</span>
            </p>
          </div>
          <div className="pt-2">
            <label className="block text-xs font-bold text-gray-900 mb-1">
              Ketik "HAPUS" untuk konfirmasi:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="HAPUS"
              className="w-full px-3 py-2 border-2 border-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isClearing}
            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border-2 border-gray-900 rounded-xl transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isClearing || confirmText !== "HAPUS"}
            className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-gray-900 rounded-xl shadow-neo active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClearing ? (
              <span className="animate-spin material-symbols-outlined">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-lg">delete_forever</span>
            )}
            <span>Ya, Hapus Semua</span>
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
          Data Absensi Dihapus!
        </h2>
        <p className="text-sm text-gray-600 font-medium leading-relaxed">
          Seluruh data & log absensi telah berhasil dihapus secara
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

export function SettingsSuccessModal({ onClose }) {
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
          Pengaturan Disimpan!
        </h2>
        <p className="text-sm text-gray-600 font-medium leading-relaxed">
          Semua konfigurasi jam operasional dan format tampilan kelas berhasil diperbarui.
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
