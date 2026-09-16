import { create } from "zustand";

export const useNoticeStore = create((set, get) => ({
  isOpen: false,
  title: "",
  message: "",
  type: "info", // 'success' | 'error' | 'warning' | 'info'
  confirmText: "Tutup",
  onCloseCallback: null,

  showNotice: ({ title, message, type = "info", confirmText = "Tutup", onClose }) => {
    let finalTitle = title;
    if (!finalTitle) {
      if (type === "success") finalTitle = "Berhasil";
      else if (type === "error") finalTitle = "Perhatian";
      else if (type === "warning") finalTitle = "Peringatan";
      else finalTitle = "Pemberitahuan";
    }

    set({
      isOpen: true,
      title: finalTitle,
      message: typeof message === "string" ? message : JSON.stringify(message, null, 2),
      type,
      confirmText,
      onCloseCallback: onClose || null,
    });
  },

  showSuccess: (message, title = "Berhasil", onClose) => {
    get().showNotice({ title, message, type: "success", confirmText: "Selesai", onClose });
  },

  showError: (message, title = "Terjadi Kesalahan", onClose) => {
    get().showNotice({ title, message, type: "error", confirmText: "Tutup", onClose });
  },

  showWarning: (message, title = "Peringatan", onClose) => {
    get().showNotice({ title, message, type: "warning", confirmText: "Mengerti", onClose });
  },

  closeNotice: () => {
    const cb = get().onCloseCallback;
    set({ isOpen: false, onCloseCallback: null });
    if (typeof cb === "function") {
      try {
        cb();
      } catch (err) {
        console.error("Notice callback error:", err);
      }
    }
  },
}));

export default useNoticeStore;
