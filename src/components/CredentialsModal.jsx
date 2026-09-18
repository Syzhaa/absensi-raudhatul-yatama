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
    const withoutSuffix = teacher.nama.split(",")[0];
    const withoutPrefix = withoutSuffix.replace(/^(dr|prof|ust|ustadz|h|hj)\.?\s+/i, "");
    const clean = withoutPrefix
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);
    return `${clean || "guru" + teacher.id}@raudhatulyatama.sch.id`;
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    setEmail(defaultEmailSuggestion());
    // Default password Yatama10
    if (!isExistingAccount) {
      setPassword("Yatama10");
    } else {
      setPassword(credentials?.password || "Yatama10");
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
    const textToCopy = `*KREDENSIAL RESMI GURU RAUDHATUL YATAMA*\n\n` +
      `👤 *Nama:* ${teacher?.nama || credentials?.name}\n` +
      `📧 *Email:* ${email}\n` +
      `🔑 *Password:* ${password || "Yatama10"}\n\n` +
      `🌐 *Portal Madrasah:* https://raudhatulyatama.sch.id/login\n` +
      `📱 *Presensi Digital:* https://absen.raudhatulyatama.sch.id\n` +
      `📧 *Webmail Madrasah:* https://mail.raudhatulyatama.sch.id\n\n` +
      `_1 Akun resmi otomatis terhubung ke Portal, Presensi Digital, dan Webmail Madrasah._`;

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-white border-2 sm:border-3 border-gray-900 rounded-2xl shadow-neo max-w-sm w-full p-3.5 sm:p-4 z-10 animate-slide-up space-y-2.5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl border-2 border-gray-900 flex items-center justify-center shrink-0 ${
              isExistingAccount ? "bg-cyan-100 text-cyan-800" : "bg-emerald-100 text-emerald-800"
            }`}>
              <span className="material-symbols-outlined text-lg font-bold">
                {isExistingAccount ? "manage_accounts" : "key"}
              </span>
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-gray-900 leading-tight">
                {isExistingAccount ? "Kelola Kredensial Login" : "Buat Akun Guru (SSO)"}
              </h2>
              <p className="text-[10px] text-emerald-800 font-bold">
                1 Akun: Portal, Absensi & Webmail
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Teacher Information Box */}
        <div className="p-2.5 bg-gray-50 border border-gray-300 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">
              Nama Dewan Guru
            </span>
            <span className="font-black text-xs text-gray-900">
              {teacher?.nama || credentials?.name}
            </span>
            <span className="text-[10px] font-mono text-gray-600 block">
              NPK: {teacher?.nip || "-"} • {teacher?.lembaga ? teacher.lembaga.toUpperCase() : "MA"}
            </span>
          </div>
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
            isExistingAccount
              ? "bg-emerald-100 text-emerald-800 border-emerald-400"
              : "bg-amber-100 text-amber-800 border-amber-400"
          }`}>
            {isExistingAccount ? "Aktif" : "Belum Ada"}
          </span>
        </div>

        {validationError && (
          <div className="p-2 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-700 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* Email Input */}
          <div className="space-y-1">
            <label className="block text-[11px] font-black uppercase text-gray-800 tracking-wider">
              Email Resmi Guru *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nama@raudhatulyatama.sch.id"
              className="w-full px-2.5 py-1.5 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-mono text-xs font-bold text-gray-900 focus:outline-none transition-all"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black uppercase text-gray-800 tracking-wider">
                {isExistingAccount ? "Ubah Sandi (Kosongkan jika tetap)" : "Password Login *"}
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer underline"
              >
                <span className="material-symbols-outlined text-xs">refresh</span>
                Acak
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isExistingAccount ? "Ketik sandi baru..." : "Minimal 6 karakter"}
                className="w-full pl-2.5 pr-8 py-1.5 bg-gray-50 border-2 border-gray-300 focus:border-gray-900 focus:bg-white rounded-xl font-mono text-xs font-bold text-gray-900 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 p-0.5 cursor-pointer"
                title={showPassword ? "Sembunyikan" : "Tampilkan"}
              >
                <span className="material-symbols-outlined text-base">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* WhatsApp Copy Preview Bar */}
          {password && (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={handleCopyFormatted}
                className="w-full py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-500 text-emerald-900 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm text-emerald-600">
                  {copyFeedback ? "check_circle" : "content_copy"}
                </span>
                <span>{copyFeedback ? "Kredensial Tersalin!" : "Salin untuk WhatsApp"}</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-1.5 flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 px-3 bg-primary-green hover:bg-emerald-400 text-gray-900 font-black text-xs border-2 border-gray-900 rounded-xl shadow-neo transition-all active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
            >
              {isLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-base">
                  {isExistingAccount ? "save" : "check"}
                </span>
              )}
              <span>{isExistingAccount ? "Simpan Sandi" : "Buat Akun"}</span>
            </button>

            {isExistingAccount && (
              <button
                type="button"
                onClick={onDeactivateAccess}
                disabled={isLoading}
                className="py-2 px-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-black text-xs border-2 border-gray-900 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                title="Hapus akun login guru"
              >
                <span className="material-symbols-outlined text-base">person_off</span>
                <span>Nonaktif</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
