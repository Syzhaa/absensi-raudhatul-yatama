export default function ManualAttendanceForm({
  manualFormData,
  setManualFormData,
  teachersData,
  manualSubmitMutation,
  handleManualSubmit,
}) {
  return (
        <div className="w-full max-w-sm bg-white border-3 border-gray-900 rounded-3xl shadow-neo p-6 space-y-4">
          <h3 className="font-black text-lg text-gray-900 text-center mb-2">
            Input Kehadiran Manual
          </h3>
          <p className="text-xs text-gray-600 text-center mb-4">
            Untuk guru yang izin, sakit, atau tidak hadir
          </p>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            {/* Dropdown Pilih Guru */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Pilih Guru
              </label>
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
            </div>

            {/* Radio Status */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Status Kehadiran
              </label>
              <div className="space-y-2">
                {[
                  { value: "izin", label: "Izin", color: "blue" },
                  { value: "sakit", label: "Sakit", color: "yellow" },
                  {
                    value: "alpha",
                    label: "Alpha (Tidak Hadir)",
                    color: "red",
                  },
                ].map((status) => (
                  <label
                    key={status.value}
                    className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      manualFormData.status === status.value
                        ? `border-gray-900 bg-${status.color}-50`
                        : "border-gray-300 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={status.value}
                      checked={manualFormData.status === status.value}
                      onChange={(e) =>
                        setManualFormData({
                          ...manualFormData,
                          status: e.target.value,
                        })
                      }
                      className="w-4 h-4 text-primary-green focus:ring-0"
                    />
                    <span className="font-bold text-sm text-gray-900">
                      {status.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Textarea Alasan */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Keterangan/Alasan (opsional)
              </label>
              <textarea
                value={manualFormData.note}
                onChange={(e) =>
                  setManualFormData({ ...manualFormData, note: e.target.value })
                }
                rows={3}
                placeholder="Contoh: Sakit demam, ada keperluan keluarga, dll."
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
