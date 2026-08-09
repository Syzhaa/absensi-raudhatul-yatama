import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, size = 'lg' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Modal Content */}
        <div 
          className={`
            relative w-full ${sizeClasses[size]} 
            bg-white clean-border clean-shadow-lg
            transform transition-all
            
            /* Mobile: slide from bottom, rounded top only */
            rounded-t-2xl sm:rounded-2xl
            max-h-[90vh] sm:max-h-[85vh]
            
            /* Animation */
            animate-slide-up sm:animate-fade-in
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b-3 border-gray-900 px-4 sm:px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black uppercase text-gray-900">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center clean-border bg-gray-100 hover:bg-red-400 transition-colors"
                aria-label="Close"
              >
                <span className="text-2xl font-bold">×</span>
              </button>
            </div>
          </div>

          {/* Body - scrollable */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] sm:max-h-[calc(85vh-80px)] p-4 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
