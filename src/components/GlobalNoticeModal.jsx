import React, { useEffect, useRef } from "react";
import { useNoticeStore } from "../store/useNoticeStore";

export default function GlobalNoticeModal() {
  const { isOpen, title, message, type, confirmText, closeNotice } = useNoticeStore();
  const confirmBtnRef = useRef(null);

  // Hook global window.alert interceptor
  useEffect(() => {
    const nativeAlert = window.alert;

    window.alert = (msg) => {
      if (msg === undefined || msg === null) return;
      const text = typeof msg === "string" ? msg : JSON.stringify(msg, null, 2);

      // Otomatis tentukan kategori alert berdasarkan kata kunci
      const lower = text.toLowerCase();
      const isSuccess =
        lower.includes("berhasil") ||
        lower.includes("sukses") ||
        lower.includes("success");
      const isError =
        lower.includes("gagal") ||
        lower.includes("error") ||
        lower.includes("salah") ||
        lower.includes("tidak dapat") ||
        lower.includes("ditolak") ||
        lower.includes("wajib") ||
        lower.includes("melebihi");
      const isWarning =
        lower.includes("perhatian") ||
        lower.includes("peringatan") ||
        lower.includes("pastikan") ||
        lower.includes("harus");

      const alertType = isSuccess
        ? "success"
        : isError
        ? "error"
        : isWarning
        ? "warning"
        : "info";

      const defaultTitle = isSuccess
        ? "Berhasil"
        : isError
        ? "Perhatian"
        : isWarning
        ? "Peringatan"
        : "Pemberitahuan";

      useNoticeStore.getState().showNotice({
        title: defaultTitle,
        message: text,
        type: alertType,
      });
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  // Keyboard navigation: Escape and Enter to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        closeNotice();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Focus button for accessibility
    setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeNotice]);

  if (!isOpen) return null;

  // Visual Configuration
  let iconName = "info";
  let iconColorClass = "bg-blue-100 border-blue-500 text-blue-700";
  let btnClass = "bg-primary-green hover:bg-lime-400 text-gray-900";

  if (type === "success") {
    iconName = "check_circle";
    iconColorClass = "bg-emerald-100 border-emerald-500 text-emerald-700";
    btnClass = "bg-primary-green hover:bg-lime-400 text-gray-900";
  } else if (type === "error") {
    iconName = "error";
    iconColorClass = "bg-red-100 border-red-500 text-red-600";
    btnClass = "bg-gray-900 hover:bg-gray-800 text-white";
  } else if (type === "warning") {
    iconName = "warning";
    iconColorClass = "bg-amber-100 border-amber-500 text-amber-800";
    btnClass = "bg-amber-300 hover:bg-amber-400 text-amber-950";
  }

  return (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={closeNotice}
    >
      <div 
        className="relative bg-white border-2 border-gray-900 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-lg animate-scale-up text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Circle Icon */}
        <div className="flex justify-center -mt-2">
          <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center shadow-sm ${iconColorClass}`}>
            <span className="material-symbols-outlined text-4xl">
              {iconName}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="font-black text-lg sm:text-xl uppercase tracking-tight text-gray-900">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 font-semibold leading-relaxed whitespace-pre-line break-words max-h-60 overflow-y-auto px-1">
            {message}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={closeNotice}
            className={`w-full py-3 px-6 rounded-2xl border-2 border-gray-900 font-black text-xs sm:text-sm uppercase tracking-wide transition-all shadow-sm active:translate-y-0.5 cursor-pointer ${btnClass}`}
          >
            {confirmText || "Tutup"}
          </button>
        </div>
      </div>
    </div>
  );
}
