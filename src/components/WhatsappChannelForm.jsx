import { useState, useEffect } from "react";
import Modal from "./Modal";

export default function WhatsappChannelForm({
  isOpen,
  onClose,
  channel,
  availableClasses = [],
  onSubmit,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    name: "",
    target_scope: "class",
    kelas: "",
    target_type: "group",
    api_key: "",
    is_active: true,
  });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name || "",
        target_scope: channel.target_scope || "class",
        kelas: channel.kelas || "",
        target_type: channel.target_type || "group",
        api_key: channel.api_key || "",
        is_active: channel.is_active ?? true,
      });
    } else {
      setFormData({
        name: "",
        target_scope: "class",
        kelas: availableClasses[0]?.nama || "10",
        target_type: "group",
        api_key: "",
        is_active: true,
      });
    }
  }, [channel, availableClasses, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Nama saluran wajib diisi.");
      return;
    }
    if (formData.target_scope === "class" && !formData.kelas.trim()) {
      alert("Pilih atau isi kelas target untuk saluran ini.");
      return;
    }
    if (!formData.api_key.trim()) {
      alert("API Key WhatsApp wajib diisi.");
      return;
    }

    onSubmit({
      ...formData,
      name: formData.name.trim(),
      kelas: formData.target_scope === "class" ? formData.kelas.trim() : null,
      api_key: formData.api_key.trim(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={channel ? "Edit Saluran WhatsApp" : "Tambah Saluran WhatsApp Baru"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama Saluran */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-gray-800 tracking-wider">
            Nama Saluran *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Contoh: Grup Kelas 10 MA atau Grup Dewan Guru"
            className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-900 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-green"
            required
          />
          <span className="text-[10px] text-gray-500 font-medium">
            Label identifikasi untuk membedakan saluran di dashboard.
          </span>
        </div>

        {/* Lingkup Target (Scope) */}
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-gray-800 tracking-wider">
            Target Pengiriman (Lingkup) *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label
              className={`flex items-start gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                formData.target_scope === "class"
                  ? "bg-emerald-50 border-emerald-600 shadow-sm"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              <input
                type="radio"
                name="target_scope"
                value="class"
                checked={formData.target_scope === "class"}
                onChange={(e) => setFormData({ ...formData, target_scope: e.target.value })}
                className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <div className="font-black text-xs text-gray-900">Per Kelas</div>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                  Khusus absensi siswa kelas tertentu
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                formData.target_scope === "teacher"
                  ? "bg-purple-50 border-purple-600 shadow-sm"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              <input
                type="radio"
                name="target_scope"
                value="teacher"
                checked={formData.target_scope === "teacher"}
                onChange={(e) => setFormData({ ...formData, target_scope: e.target.value })}
                className="mt-0.5 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <div className="font-black text-xs text-gray-900">Dewan Guru</div>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                  Khusus absensi guru & staf
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                formData.target_scope === "general"
                  ? "bg-blue-50 border-blue-600 shadow-sm"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              <input
                type="radio"
                name="target_scope"
                value="general"
                checked={formData.target_scope === "general"}
                onChange={(e) => setFormData({ ...formData, target_scope: e.target.value })}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-black text-xs text-gray-900">Umum / Semua</div>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                  Fallback jika kelas tak ditentukan
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Pilihan Kelas (Jika Scope = class) */}
        {formData.target_scope === "class" && (
          <div className="space-y-1 p-3 bg-emerald-50/70 border-2 border-emerald-300 rounded-xl">
            <label className="text-xs font-black uppercase text-emerald-950 tracking-wider">
              Pilih Kelas Siswa Target *
            </label>
            <div className="flex gap-2">
              <select
                value={formData.kelas}
                onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-900 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Kelas --</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.nama}>
                    Kelas {c.nama} {c.tingkat ? `(Tingkat ${c.tingkat})` : ""}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={formData.kelas}
                onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                placeholder="Atau ketik nama kelas"
                className="w-1/2 px-3 py-2 bg-white border-2 border-gray-900 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-emerald-800 font-medium">
              Saat siswa dari kelas ini presensi, pesan otomatis diteruskan ke API Key saluran ini.
            </p>
          </div>
        )}

        {/* Mode Pengiriman (Grup WA vs Pribadi) */}
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-gray-800 tracking-wider">
            Mode Pengiriman Saluran *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label
              className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                formData.target_type === "group"
                  ? "bg-emerald-50 border-emerald-600 shadow-sm"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              }`}
            >
              <input
                type="radio"
                name="channel_target_type"
                value="group"
                checked={formData.target_type === "group"}
                onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="material-symbols-outlined text-emerald-600 text-lg">groups</span>
              <span className="font-black text-xs text-gray-900">Grup WhatsApp</span>
            </label>

            <label
              className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                formData.target_type === "personal"
                  ? "bg-blue-50 border-blue-600 shadow-sm"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              }`}
            >
              <input
                type="radio"
                name="channel_target_type"
                value="personal"
                checked={formData.target_type === "personal"}
                onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="material-symbols-outlined text-blue-600 text-lg">person</span>
              <span className="font-black text-xs text-gray-900">Pribadi (Ortu/Guru)</span>
            </label>
          </div>
        </div>

        {/* WhatsApp API Key */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-gray-800 tracking-wider">
            API Key WhatsApp Gateway *
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder="Paste API Key dari wa.tappdigital.id di sini"
              className="w-full pl-3.5 pr-10 py-2.5 bg-white border-2 border-gray-900 rounded-xl font-mono text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-green"
              required
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 p-1"
            >
              <span className="material-symbols-outlined text-lg">
                {showKey ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
          <p className="text-[10px] text-gray-500 font-medium">
            Buat API Key baru di <strong className="text-gray-700">wa.tappdigital.id</strong> dengan memilih grup tujuan yang sesuai.
          </p>
        </div>

        {/* Toggle Status Aktif */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border-2 border-gray-200 rounded-xl">
          <div>
            <div className="font-black text-xs text-gray-900">Aktifkan Saluran Ini</div>
            <div className="text-[10px] text-gray-500">
              Jika nonaktif, sistem akan beralih ke saluran umum atau API Key utama.
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-green"></div>
          </label>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-xl font-black text-xs text-gray-700 hover:bg-gray-200 transition-all"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-primary-green border-2 border-gray-900 rounded-xl font-black text-xs text-gray-900 shadow-neo hover:-translate-y-0.5 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-base">save</span>
            )}
            <span>{channel ? "Perbarui Saluran" : "Simpan Saluran"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
