export default function CredentialsModal({
  credentials,
  onClose,
  onCopy,
  onResetPassword,
  onDeactivateAccess,
  isResetPending,
  isDeactivatePending,
}) {
  if (!credentials) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo p-6 max-w-md w-full space-y-4 z-10 animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">
            Informasi Akun Guru
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-gray-600">
              close
            </span>
          </button>
        </div>

        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-xs text-amber-900 font-medium">
          <strong>Info:</strong> Password berikut adalah password default akun.
          Jika guru pernah menggantinya, gunakan Reset Password.
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Nama Guru
            </label>
            <div className="px-3 py-2.5 bg-gray-100 border-2 border-gray-200 rounded-xl font-medium text-sm text-gray-900">
              {credentials.name}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Email Login
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 bg-gray-100 border-2 border-gray-200 rounded-xl font-mono text-sm text-gray-900 break-all">
                {credentials.email}
              </div>
              <button
                onClick={() => onCopy(credentials.email)}
                className="px-3 py-2 bg-blue-100 text-blue-700 border-2 border-gray-900 rounded-lg hover:bg-blue-200 transition-colors flex-shrink-0"
                title="Salin Email"
              >
                <span className="material-symbols-outlined text-lg">
                  content_copy
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Password
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 bg-gray-100 border-2 border-gray-200 rounded-xl font-mono text-sm text-gray-900">
                {credentials.password}
              </div>
              <button
                onClick={() => onCopy(credentials.password)}
                className="px-3 py-2 bg-blue-100 text-blue-700 border-2 border-gray-900 rounded-lg hover:bg-blue-200 transition-colors flex-shrink-0"
                title="Salin Password"
              >
                <span className="material-symbols-outlined text-lg">
                  content_copy
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 text-xs text-emerald-900">
          <p className="font-medium">
            ✓ Guru dapat login ke sistem menggunakan kredensial di atas.
          </p>
          <p className="mt-1">
            Sarankan guru untuk mengganti password setelah login pertama kali.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={onResetPassword}
            disabled={isResetPending || isDeactivatePending}
            className="py-3 px-4 bg-orange-100 text-orange-800 font-black border-2 border-gray-900 rounded-xl hover:bg-orange-200 disabled:opacity-50"
          >
            Reset Password
          </button>
          <button
            onClick={onDeactivateAccess}
            disabled={isResetPending || isDeactivatePending}
            className="py-3 px-4 bg-red-100 text-red-700 font-black border-2 border-gray-900 rounded-xl hover:bg-red-200 disabled:opacity-50"
          >
            Nonaktifkan Akses
          </button>
        </div>

        <button onClick={onClose} className="w-full py-2 font-bold text-gray-600 hover:text-gray-900">
          Tutup
        </button>
      </div>
    </div>
  );
}
