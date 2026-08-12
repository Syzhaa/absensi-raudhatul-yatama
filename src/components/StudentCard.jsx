export default function StudentCard({
  student,
  isSelected,
  onSelect,
  onDownloadQR,
  onEdit,
  onDelete,
  isDeletePending,
  activeDropdown,
  setActiveDropdown,
}) {
  const dropdownOpen = activeDropdown === student.id;
  const closeDropdown = () => setActiveDropdown(null);
  const menuItemClass =
    "w-full text-left px-4 py-2 text-sm font-bold flex items-center gap-2";

  return (
    <div
      className={`bg-white border-2 md:border-3 border-gray-900 rounded-xl md:rounded-2xl p-3.5 md:p-4 shadow-neo transition-all ${
        isSelected ? "bg-emerald-50/70 border-primary-green" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Checkbox & Main Info */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(student.id)}
            className="mt-1 w-4 h-4 md:w-5 md:h-5 rounded border-2 border-gray-900 text-primary-green focus:ring-0 cursor-pointer flex-shrink-0"
          />

          <div className="space-y-1.5 min-w-0 flex-1">
            {/* Nama Siswa */}
            <h3 className="font-bold text-base md:text-lg text-gray-900 truncate leading-snug">
              {student.nama}
            </h3>

            {/* Chips / Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Kelas Badge */}
              <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 rounded-md">
                {student.kelas || "Tanpa Kelas"}
              </span>

              {/* Lembaga Badge */}
              <span className="px-2 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 rounded-md uppercase">
                {student.lembaga}
              </span>

              {/* Status Badge */}
              <span
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${
                  student.status === "aktif"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-gray-100 text-gray-700 border-gray-300"
                }`}
              >
                {student.status?.toUpperCase()}
              </span>

              {student.nisn && (
                <span className="text-[11px] font-medium text-gray-500 hidden sm:inline">
                  NISN: {student.nisn}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="relative flex items-center gap-1.5 flex-shrink-0">
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onDownloadQR(student)}
              className="p-1.5 md:p-2 bg-blue-100 text-blue-700 border-2 border-gray-900 rounded-lg hover:bg-blue-200 transition-colors shadow-sm"
              title="Download QR"
            >
              <span className="material-symbols-outlined text-lg">
                qr_code_2
              </span>
            </button>
            <button
              onClick={() => onEdit(student)}
              className="p-1.5 md:p-2 bg-amber-100 text-amber-900 border-2 border-gray-900 rounded-lg hover:bg-amber-200 transition-colors shadow-sm"
              title="Edit siswa"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
            <button
              onClick={() => onDelete(student.id)}
              disabled={isDeletePending}
              className="p-1.5 md:p-2 bg-red-100 text-red-700 border-2 border-gray-900 rounded-lg hover:bg-red-200 transition-colors shadow-sm disabled:opacity-50"
              title="Hapus siswa"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>

          {/* Mobile Kebab Menu */}
          <div className="md:hidden relative">
            <button
              onClick={() =>
                setActiveDropdown(dropdownOpen ? null : student.id)
              }
              className="p-1.5 bg-gray-100 text-gray-700 border-2 border-gray-900 rounded-lg shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">
                more_vert
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border-2 border-gray-900 rounded-xl shadow-neo z-10 overflow-hidden">
                <button
                  onClick={() => {
                    onDownloadQR(student);
                    closeDropdown();
                  }}
                  className={`${menuItemClass} text-blue-700 hover:bg-blue-50 border-b border-gray-100`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    qr_code_2
                  </span>
                  Download QR
                </button>
                <button
                  onClick={() => {
                    onEdit(student);
                    closeDropdown();
                  }}
                  className={`${menuItemClass} text-amber-700 hover:bg-amber-50 border-b border-gray-100`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    edit
                  </span>
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(student.id);
                    closeDropdown();
                  }}
                  disabled={isDeletePending}
                  className={`${menuItemClass} text-red-700 hover:bg-red-50 disabled:opacity-50`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    delete
                  </span>
                  Hapus
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
