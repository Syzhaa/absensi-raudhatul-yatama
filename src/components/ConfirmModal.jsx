import Modal from "./Modal";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "confirm", // 'confirm', 'alert', 'danger'
  confirmText,
  cancelText = "Batal",
}) {
  const getConfirmText = () => {
    if (confirmText) return confirmText;
    if (type === "alert") return "Tutup";
    if (type === "danger") return "Hapus";
    return "Ya, Lanjutkan";
  };

  const getConfirmButtonClass = () => {
    if (type === "alert") return "bg-gray-900 text-white hover:bg-gray-800 border-2 border-gray-900 shadow-neo";
    if (type === "danger")
      return "bg-rose-500 text-white hover:bg-rose-600 border-2 border-gray-900 shadow-neo";
    return "bg-primary-green text-gray-900 hover:bg-emerald-400 border-2 border-gray-900 shadow-neo";
  };

  const footer = (
    <div className="flex gap-2.5 justify-end w-full">
      {type !== "alert" && (
        <button
          onClick={onClose}
          aria-label="Batal"
          className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl border-2 border-gray-900 shadow-xs active:translate-y-0.5 transition-all cursor-pointer"
        >
          {cancelText}
        </button>
      )}
      <button
        onClick={onConfirm}
        className={`flex-1 sm:flex-none px-6 py-2 font-black rounded-xl active:translate-y-0.5 transition-all cursor-pointer ${getConfirmButtonClass()}`}
      >
        {getConfirmText()}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={footer}
    >
      <div className="text-gray-700 whitespace-pre-wrap">{message}</div>
    </Modal>
  );
}
