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
    if (type === "alert") return "bg-gray-900 text-white hover:bg-gray-800";
    if (type === "danger")
      return "bg-red-500 text-white hover:bg-red-600 border-2 border-gray-900";
    return "bg-[#9bd47a] text-gray-900 hover:bg-[#8bc969] border-2 border-gray-900";
  };

  const footer = (
    <div className="flex gap-3 justify-end w-full">
      {type !== "alert" && (
        <button
          onClick={onClose}
          className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl border-2 border-transparent hover:border-gray-300 transition-all"
        >
          {cancelText}
        </button>
      )}
      <button
        onClick={onConfirm}
        className={`flex-1 sm:flex-none px-6 py-2 font-black rounded-xl transition-all shadow-sm ${getConfirmButtonClass()}`}
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
