import React, { useState, useEffect } from "react";

export default function CredentialsModal({
  teacher,
  credentials,
  onClose,
  onActivate,
  onResetPassword,
  onDeactivateAccess,
  isActivatePending,
  isResetPending,
  isDeactivatePending,
}) {
  const isExistingAccount = Boolean(teacher?.user_id || credentials?.has_account);

  const defaultEmailSuggestion = () => {
    if (credentials?.email) return credentials.email;
    if (!teacher?.nama) return "";
    const clean = teacher.nama
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 15);
    return `${clean || "guru" + teacher.id}@yatama.sch.id`;
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    setEmail(defaultEmailSuggestion());
    // Default password suggestion for quick creation
    if (!isExistingAccount) {
      setPassword(`yatama${new Date().getFullYear()}`);
    } else {
      setPassword(credentials?.password || "");
    }
  }, [teacher, credentials, isExistingAccount]);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let res = "";
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleCopyFormatted = () => {
    const textToCopy = `*KREDENSIAL LOGIN ABSENSI YATAMA*\n\n` +
      `👤 *Nama:* ${teacher?.nama || credentials?.name}\n` +
      `📧 *Email:* ${email}\n` +
      `🔑 *Password:* ${password || "(Tetap sama)"}\n` +
      `🌐 *URL Login:* ${window.location.origin}/login\n\n` +
      `_Harap simpan kredensial ini dan ganti kata sandi secara berkala._`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    if (!email.trim()) {
      setValidationError("Email tidak boleh kosong.");
      return;
    }

    if (!isExistingAccount) {
      if (!password || password.length < 6) {
        setValidationError("Password login wajib diisi minimal 6 karakter.");
        return;
      }
      onActivate({ email: email.trim(), password });
    } else {
      if (password && password.length < 6) {
        setValidationError("Password baru minimal 6 karakter.");
        return;
      }
      onResetPassword({ email: email.trim(), password: password || undefined });
    }
  };

  const isLoading = isActivatePending || isResetPending || isDeactivatePending;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-white border-3 border-gray-900 rounded-2xl shadow-neo max-w-md w-full p-5 sm:p-6 z-10 animate-slide-up space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl border-2 border-gray-900 flex items-center justify-center ${
              isExistingAccount ? "bg-cyan-100 text-cyan-800" : "bg-emerald-100 text-emerald-800"
            }`}>
              <span className="material-symbols-outlined text-2xl font-bold">
                {isExistingAccount ? "manage_accounts" : "key"}
              </span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                {isExistingAccount ? "Kelola Kredensial Login" : "Buat Akun & Password Guru"}
              </h2>
              <p className="text-[11px] text-gray-500 font-semibold">
                Sistem Absensi Digital Raudhatul Yatama
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Teacher Information Box */}
        <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Nama Dewan Guru
            </span>
            <span className="font-black text-xs sm:text-sm text-gray-900">
              {teacher?.nama || credentials?.name}
            </span>
            <span className="text-[11px] font-mono text-gray-600 block">
              NPK: {teacher?.nip || "-"} • {teacher?.lembaga ? teacher.lembaga.toUpperCase() : "MA"}
            </span>
          </div>
          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${
            isExistingAccount
              ? "bg-emerald-100 text-emerald-800 border-emerald-400"
              : "bg-amber-100 text-amber-800 border-amber-400"
          }`}>
            {isExistingAccount ? "Akun Aktif" : "Belum Punya Akun"}
          </span>
        </div>

        {validationError && (
          <div className="p-2.5 bg-red-50 border-2 border-red-300 rounded-xl text-xs font-bold text-red-700 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email Input */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase text-gray-800 tracking-wider">
              Email Login *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nama.guru@yatama.sch.id"
              className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-mono text-xs sm:text-sm font-bold text-gray-900 focus:outline-none transition-all"
            />
            <p className="text-[10px] text-gray-500 font-medium">
              Alamat surel unik untuk masuk ke sistem absensi
            </p>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase text-gray-800 tracking-wider">
                {isExistingAccount ? "Ubah Password (Kosongkan jika tetap)" : "Password Login *"}
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer underline"
              >
                <span className="material-symbols-outlined text-xs">refresh</span>
                Acak Sandi
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isExistingAccount ? "Ketik sandi baru..." : "Minimal 6 karakter"}
                className="w-full pl-3 pr-10 py-2 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-mono text-xs sm:text-sm font-bold text-gray-900 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 p-1"
                title={showPassword ? "Sembunyikan" : "Tampilkan"}
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* WhatsApp Copy Preview Bar */}
          {password && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleCopyFormatted}
                className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-500 text-emerald-900 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-emerald-600">
                  {copyFeedback ? "check_circle" : "content_copy"}
                </span>
                <span>{copyFeedback ? "Kredensial Tersalin!" : "Salin Kredensial untuk WhatsApp"}</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black text-xs sm:text-sm border-2 border-gray-900 rounded-xl shadow-neo transition-all active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-base">
                  {isExistingAccount ? "save" : "check"}
                </span>
              )}
              <span>{isExistingAccount ? "Simpan Perubahan Sandi" : "Buat Akun Login"}</span>
            </button>

            {isExistingAccount && (
              <button
                type="button"
                onClick={onDeactivateAccess}
                disabled={isLoading}
                className="py-2.5 px-3 bg-red-100 hover:bg-red-200 text-red-700 font-black text-xs border-2 border-gray-900 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                title="Hapus akun login guru"
              >
                <span className="material-symbols-outlined text-base">person_off</span>
                <span>Nonaktifkan</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
