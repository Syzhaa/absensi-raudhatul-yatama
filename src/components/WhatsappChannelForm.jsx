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
  const [apiKey, setApiKey] = useState("");
  const [name, setName] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isAllClasses, setIsAllClasses] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState([]);

  useEffect(() => {
    if (channel) {
      setApiKey(channel.api_key || "");
      setName(channel.name || "");
      const k = channel.kelas || "";
      if (k === "all" || channel.target_scope === "general") {
        setIsAllClasses(true);
        setSelectedClasses([]);
        setIsTeacher(false);
      } else if (k === "teacher" || channel.target_scope === "teacher") {
        setIsTeacher(true);
        setIsAllClasses(false);
        setSelectedClasses([]);
      } else {
        setIsAllClasses(false);
        setIsTeacher(false);
        const parts = k.split(",").map((s) => s.trim()).filter(Boolean);
        setSelectedClasses(parts);
      }
    } else {
      setApiKey("");
      setName("");
      setIsAllClasses(false);
      setIsTeacher(false);
      // Default to first class if available
      if (availableClasses.length > 0) {
        setSelectedClasses([availableClasses[0]?.nama || "10"]);
      } else {
        setSelectedClasses(["10"]);
      }
    }
  }, [channel, availableClasses, isOpen]);

  const toggleClass = (className) => {
    if (isAllClasses) setIsAllClasses(false);
    if (isTeacher) setIsTeacher(false);

    setSelectedClasses((prev) =>
      prev.includes(className)
        ? prev.filter((c) => c !== className)
        : [...prev, className]
    );
  };

  const handleSelectAll = () => {
    setIsAllClasses(true);
    setIsTeacher(false);
    setSelectedClasses([]);
  };

  const handleSelectTeacher = () => {
    setIsTeacher(true);
    setIsAllClasses(false);
    setSelectedClasses([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      alert("API Key WhatsApp wajib diisi.");
      return;
    }

    let classesPayload = [];
    let scope = "class";

    if (isAllClasses) {
      classesPayload = ["all"];
      scope = "general";
    } else if (isTeacher) {
      classesPayload = ["teacher"];
      scope = "teacher";
    } else {
      if (selectedClasses.length === 0) {
        alert("Pilih minimal satu kelas yang akan menggunakan API Key ini.");
        return;
      }
      classesPayload = selectedClasses;
      scope = "class";
    }

    let generatedName = name.trim();
    if (!generatedName) {
      if (isAllClasses) generatedName = "Grup Semua Kelas";
      else if (isTeacher) generatedName = "Grup Dewan Guru";
      else generatedName = `Grup Kelas ${selectedClasses.join(", ")}`;
    }

    onSubmit({
      name: generatedName,
      target_scope: scope,
      classes: classesPayload,
      target_type: "group",
      api_key: apiKey.trim(),
      is_active: channel ? channel.is_active : true,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={channel ? "Edit API Key Kelas" : "Tambah API Key Grup / Kelas"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Cepat */}
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 leading-relaxed font-medium">
          💡 Cukup masukkan API Key dari <strong>wa.tappdigital.id</strong> dan pilih kelas berapa saja yang memakai API Key ini. Grup target sudah otomatis terhubung sesuai settingan API Key di gateway.
        </div>

        {/* 1. WhatsApp API Key */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-gray-800 tracking-wider">
            API Key WhatsApp Gateway *
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
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
        </div>

        {/* 2. Pemilihan Kelas (Bisa pilih 1, 2, 3 atau semua) */}
        <div className="space-y-2 p-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase text-gray-900 tracking-wider">
              Pilih Kelas Penerima Notifikasi *
            </label>
            <span className="text-[10px] text-gray-500 font-bold">
              Klik untuk memilih (bisa lebih dari satu)
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {/* Opsi Semua Kelas */}
            <button
              type="button"
              onClick={handleSelectAll}
              className={`px-3 py-2 rounded-xl text-xs font-black border-2 transition-all flex items-center gap-1.5 ${
                isAllClasses
                  ? "bg-gray-900 border-gray-900 text-white shadow-neo -translate-y-0.5"
                  : "bg-white border-gray-300 text-gray-700 hover:border-gray-900"
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isAllClasses ? "check_box" : "check_box_outline_blank"}
              </span>
              <span>Semua Kelas</span>
            </button>

            {/* Opsi Per Kelas */}
            {availableClasses.map((cls) => {
              const isSelected = !isAllClasses && !isTeacher && selectedClasses.includes(cls.nama);
              return (
                <button
                  type="button"
                  key={cls.id}
                  onClick={() => toggleClass(cls.nama)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black border-2 transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary-green border-gray-900 text-gray-900 shadow-neo -translate-y-0.5"
                      : "bg-white border-gray-300 text-gray-700 hover:border-gray-900"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {isSelected ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span>Kelas {cls.nama}</span>
                </button>
              );
            })}

            {/* Opsi Dewan Guru */}
            <button
              type="button"
              onClick={handleSelectTeacher}
              className={`px-3 py-2 rounded-xl text-xs font-black border-2 transition-all flex items-center gap-1.5 ${
                isTeacher
                  ? "bg-purple-600 border-gray-900 text-white shadow-neo -translate-y-0.5"
                  : "bg-white border-gray-300 text-gray-700 hover:border-gray-900"
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isTeacher ? "check_box" : "check_box_outline_blank"}
              </span>
              <span>Khusus Dewan Guru</span>
            </button>
          </div>

          <div className="text-[11px] text-gray-500 font-medium pt-1">
            {isAllClasses && "✅ API Key ini berlaku untuk seluruh siswa semua kelas."}
            {isTeacher && "✅ API Key ini khusus untuk notifikasi presensi dewan guru & staf."}
            {!isAllClasses && !isTeacher && selectedClasses.length > 0 && (
              <span>
                ✅ API Key ini aktif untuk: <strong>Kelas {selectedClasses.join(", ")}</strong>
              </span>
            )}
          </div>
        </div>

        {/* 3. Label / Nama (Opsional) */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase text-gray-700 tracking-wider">
            Nama Saluran (Opsional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Grup Kelas 10 & 11 (Otomatis jika kosong)"
            className="w-full px-3.5 py-2 bg-white border-2 border-gray-300 focus:border-gray-900 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-xl font-black text-xs text-gray-700 hover:bg-gray-200 transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-primary-green border-2 border-gray-900 rounded-xl font-black text-xs text-gray-900 shadow-neo hover:-translate-y-0.5 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-base">save</span>
            )}
            <span>{channel ? "Simpan Perubahan" : "Simpan API Key"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
