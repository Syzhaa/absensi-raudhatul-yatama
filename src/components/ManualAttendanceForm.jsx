export default function ManualAttendanceForm({
  manualFormData,
  setManualFormData,
  teachersData,
  manualSubmitMutation,
  handleManualSubmit,
  isGuru = false,
  myTeacher = null,
}) {
  return (
        <div className="w-full max-w-sm bg-white border-3 border-gray-900 rounded-3xl shadow-neo p-6 space-y-4">
          <h3 className="font-black text-lg text-gray-900 text-center mb-2">
            Input Kehadiran Manual
          </h3>
          <p className="text-xs text-gray-600 text-center mb-4">
            {isGuru ? "Pengajuan izin, sakit, atau alpha mandiri" : "Untuk guru yang izin, sakit, atau tidak hadir"}
          </p>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            {/* Dropdown / Badge Pilih Guru */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                {isGuru ? "Nama Guru (Akun Anda)" : "Pilih Guru"}
              </label>
              {isGuru ? (
                <div className="p-3 bg-emerald-50 border-2 border-gray-900 rounded-xl">
                  <span className="text-xs font-black text-emerald-950 block">
                    {myTeacher?.nama || "Guru Terautentikasi"}
                  </span>
                  {myTeacher?.nip && (
                    <span className="text-[11px] font-mono text-emerald-800">
                      NIP/NPK: {myTeacher.nip}
                    </span>
                  )}
                </div>
              ) : (
                <select
                  value={manualFormData.teacher_id}
                  onChange={(e) =>
                    setManualFormData({
                      ...manualFormData,
                      teacher_id: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2.5 bg-white border-2 border-gray-900 rounded-xl font-medium text-sm text-gray-900 focus:outline-none focus:border-primary-green"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachersData?.data?.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.nama} {teacher.nip ? `(${teacher.nip})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Radio Status */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Status Kehadiran
              </label>
              <div className="space-y-2">
                {[
                  {
                    value: "hadir",
                    label: "Pelajaran Jarak Jauh (PJJ)",
                    color: "cyan",
                    icon: "laptop_chromebook",
                    defaultNote: "Pelajaran Jarak Jauh (PJJ)",
                  },
                  { value: "izin", label: "Izin", color: "blue", icon: "info" },
                  { value: "sakit", label: "Sakit", color: "yellow", icon: "emergency" },
                  {
                    value: "alpha",
                    label: "Alpha (Tidak Hadir)",
                    color: "red",
                    icon: "cancel",
                  },
                ].map((status) => (
                  <label
                    key={status.value}
                    className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      manualFormData.status === status.value
                        ? `border-gray-900 bg-${status.color}-50 shadow-xs font-black`
                        : "border-gray-300 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={status.value}
                      checked={manualFormData.status === status.value}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        const newNote = newStatus === "hadir"
                          ? (manualFormData.note || "Pelajaran Jarak Jauh (PJJ)")
                          : manualFormData.note;
                        setManualFormData({
                          ...manualFormData,
                          status: newStatus,
                          note: newNote,
                        });
                      }}
                      className="w-4 h-4 text-primary-green focus:ring-0"
                    />
                    <span className="material-symbols-outlined text-lg text-gray-700">
                      {status.icon}
                    </span>
                    <span className="font-bold text-sm text-gray-900">
                      {status.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quick Note Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Preset:</span>
              <button
                type="button"
                onClick={() =>
                  setManualFormData({
                    ...manualFormData,
                    status: "hadir",
                    note: "Pelajaran Jarak Jauh (PJJ)",
                  })
                }
                className="px-2 py-0.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-950 font-black text-[10px] rounded-lg border border-cyan-400 cursor-pointer shadow-2xs"
              >
                💻 PJJ
              </button>
              <button
                type="button"
                onClick={() =>
                  setManualFormData({
                    ...manualFormData,
                    status: "sakit",
                    note: "Sakit demam / istirahat",
                  })
                }
                className="px-2 py-0.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-950 font-bold text-[10px] rounded-lg border border-yellow-300 cursor-pointer shadow-2xs"
              >
                🏥 Sakit
              </button>
              <button
                type="button"
                onClick={() =>
                  setManualFormData({
                    ...manualFormData,
                    status: "izin",
                    note: "Izin keperluan keluarga",
                  })
                }
                className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-950 font-bold text-[10px] rounded-lg border border-blue-300 cursor-pointer shadow-2xs"
              >
                📝 Keperluan Keluarga
              </button>
            </div>

            {/* Textarea Alasan */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Keterangan / Alasan {manualFormData.status === "hadir" ? "(PJJ)" : "(opsional)"}
              </label>
              <textarea
                value={manualFormData.note}
                onChange={(e) =>
                  setManualFormData({ ...manualFormData, note: e.target.value })
                }
                rows={3}
                placeholder={manualFormData.status === "hadir" ? "Pelajaran Jarak Jauh (PJJ)..." : "Contoh: Sakit demam, ada keperluan keluarga, dll."}
                className="w-full px-3 py-2.5 bg-white border-2 border-gray-900 rounded-xl font-medium text-sm text-gray-900 focus:outline-none focus:border-primary-green resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={manualSubmitMutation.isPending}
              className="w-full bg-[#9bd47a] hover:bg-lime-400 text-gray-900 font-extrabold py-3 px-6 border-3 border-gray-900 rounded-2xl shadow-neo transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {manualSubmitMutation.isPending ? (
                <>
                  <span className="material-symbols-outlined text-xl animate-spin">
                    refresh
                  </span>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">
                    check_circle
                  </span>
                  <span>SIMPAN</span>
                </>
              )}
            </button>
          </form>
        </div>
  );
}
