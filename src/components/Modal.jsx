import { useEffect } from "react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "lg",
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Bottom Sheet Container */}
      <div
        className={`
          relative w-full ${sizeClasses[size]} 
          bg-white border-t-3 sm:border-3 border-x-3 sm:border-x-3 border-gray-900
          shadow-neo transform transition-all
          
          /* Mobile: bottom sheet with rounded top corners */
          rounded-t-[28px] sm:rounded-2xl
          max-h-[92vh] sm:max-h-[85vh]
          flex flex-col z-10
          
          /* Animation */
          animate-slide-up sm:animate-fade-in
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle for Mobile */}
        <div className="w-full pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-black uppercase text-gray-900 tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 border border-gray-300 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-6 flex-1 space-y-4">
          {children}
        </div>

        {/* Sticky Footer if provided */}
        {footer && (
          <div className="p-4 sm:p-5 border-t border-gray-200 bg-white rounded-b-2xl flex-shrink-0 sticky bottom-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
