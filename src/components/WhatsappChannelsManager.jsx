import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import whatsappChannelsService from "../services/whatsappChannels";
import WhatsappChannelForm from "./WhatsappChannelForm";

export default function WhatsappChannelsManager({ effectiveLembaga }) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [testingChannelId, setTestingChannelId] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Fetch channels & classes
  const { data: channelsResponse, isLoading } = useQuery({
    queryKey: ["whatsapp-channels", effectiveLembaga],
    queryFn: () => whatsappChannelsService.getAll({ lembaga: effectiveLembaga }),
  });

  const channels = channelsResponse?.data?.channels || [];
  const availableClasses = channelsResponse?.data?.available_classes || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) =>
      whatsappChannelsService.create(data, { lembaga: effectiveLembaga }),
    onSuccess: () => {
      queryClient.invalidateQueries(["whatsapp-channels", effectiveLembaga]);
      setIsFormOpen(false);
      setSelectedChannel(null);
      alert("Saluran WhatsApp berhasil ditambahkan.");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Gagal menambahkan saluran WhatsApp.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => whatsappChannelsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["whatsapp-channels", effectiveLembaga]);
      setIsFormOpen(false);
      setSelectedChannel(null);
      alert("Saluran WhatsApp berhasil diperbarui.");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Gagal memperbarui saluran WhatsApp.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => whatsappChannelsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["whatsapp-channels", effectiveLembaga]);
      alert("Saluran WhatsApp berhasil dihapus.");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Gagal menghapus saluran WhatsApp.");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => whatsappChannelsService.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["whatsapp-channels", effectiveLembaga]);
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Gagal memperbarui status saluran.");
    },
  });

  const testMutation = useMutation({
    mutationFn: ({ id }) => whatsappChannelsService.testConnection(id),
    onSuccess: (res) => {
      setTestResult({
        success: true,
        message: res.message || "Pesan tes berhasil dikirim!",
      });
      setTestingChannelId(null);
    },
    onError: (err) => {
      setTestResult({
        success: false,
        message:
          err.response?.data?.message ||
          "Gagal mengirim tes pesan. Pastikan API Key aktif di wa.tappdigital.id",
      });
      setTestingChannelId(null);
    },
  });

  const handleCreate = () => {
    setSelectedChannel(null);
    setIsFormOpen(true);
  };

  const handleEdit = (ch) => {
    setSelectedChannel(ch);
    setIsFormOpen(true);
  };

  const handleDelete = (ch) => {
    if (confirm(`Hapus saluran '${ch.name}'?`)) {
      deleteMutation.mutate(ch.id);
    }
  };

  const handleTest = (ch) => {
    setTestResult(null);
    setTestingChannelId(ch.id);
    testMutation.mutate({ id: ch.id });
  };

  const handleFormSubmit = (formData) => {
    if (selectedChannel) {
      updateMutation.mutate({ id: selectedChannel.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCopy = (id, key) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header Info & Add Button */}
      <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-4 sm:p-5 shadow-neo flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-primary-green">hub</span>
            <h2 className="font-black text-sm sm:text-base text-gray-900">
              API Key Terpisah per Kelas & Dewan Guru
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5 max-w-2xl leading-relaxed">
            Pesan otomatis diarahkan ke API Key grup kelas masing-masing siswa (misal: Grup Kelas 10, Kelas 11, dsb) atau grup dewan guru.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="px-4 py-2 bg-primary-green border-2 border-gray-900 rounded-xl font-black text-xs text-gray-900 shadow-neo hover:-translate-y-0.5 transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          <span>Tambah API Key Kelas</span>
        </button>
      </div>

      {/* Test Feedback Alert */}
      {testResult && (
        <div
          className={`p-3.5 rounded-xl border-2 flex items-start justify-between gap-3 ${
            testResult.success
              ? "bg-emerald-50 border-emerald-500 text-emerald-950"
              : "bg-red-50 border-red-500 text-red-950"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-lg mt-0.5">
              {testResult.success ? "check_circle" : "error"}
            </span>
            <div className="text-xs font-bold leading-relaxed">{testResult.message}</div>
          </div>
          <button
            type="button"
            onClick={() => setTestResult(null)}
            className="text-gray-500 hover:text-gray-900 p-1"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Channels List / Empty State */}
      {isLoading ? (
        <div className="p-8 text-center bg-white border-2 border-gray-900 rounded-2xl shadow-neo font-bold text-xs text-gray-500">
          Memuat daftar saluran WhatsApp...
        </div>
      ) : channels.length === 0 ? (
        <div className="bg-white border-2 md:border-3 border-gray-900 rounded-2xl p-6 sm:p-8 shadow-neo text-center space-y-3">
          <div className="w-14 h-14 bg-gray-100 border-2 border-gray-900 rounded-2xl flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl text-gray-400">group_work</span>
          </div>
          <div>
            <h3 className="font-black text-sm text-gray-900">Belum Ada Saluran Khusus</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Saat ini seluruh pesan dikirim menggunakan <strong>API Key Utama</strong> di Tab 1. Tambahkan saluran khusus jika ingin memisahkan pesan ke grup WhatsApp per kelas atau grup guru.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="px-4 py-2 bg-primary-green border-2 border-gray-900 rounded-xl font-black text-xs text-gray-900 shadow-neo hover:-translate-y-0.5 transition-all inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Buat Saluran Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {channels.map((ch) => {
            const isTesting = testingChannelId === ch.id;
            return (
              <div
                key={ch.id}
                className={`bg-white border-2 border-gray-900 rounded-2xl p-4 shadow-neo flex flex-col justify-between gap-3 transition-all ${
                  !ch.is_active ? "opacity-60 bg-gray-50" : ""
                }`}
              >
                {/* Top: Name & Scope Badge & Toggle */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm text-gray-900 leading-tight">
                        {ch.name}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {ch.target_scope === "class" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border bg-emerald-100 text-emerald-900 border-emerald-400">
                            <span className="material-symbols-outlined text-xs">school</span>
                            Kelas: {ch.kelas}
                          </span>
                        )}
                        {ch.target_scope === "teacher" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border bg-purple-100 text-purple-900 border-purple-400">
                            <span className="material-symbols-outlined text-xs">badge</span>
                            Dewan Guru
                          </span>
                        )}
                        {ch.target_scope === "general" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border bg-blue-100 text-blue-900 border-blue-400">
                            <span className="material-symbols-outlined text-xs">apps</span>
                            Semua / Fallback
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border bg-gray-100 text-gray-800 border-gray-300">
                          <span className="material-symbols-outlined text-xs">
                            {ch.target_type === "group" ? "groups" : "person"}
                          </span>
                          {ch.target_type === "group" ? "Grup WA" : "Pribadi"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate(ch.id)}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border cursor-pointer transition-all ${
                        ch.is_active
                          ? "bg-emerald-100 border-emerald-500 text-emerald-800"
                          : "bg-gray-200 border-gray-400 text-gray-600"
                      }`}
                      title="Klik untuk toggle status aktif/nonaktif"
                    >
                      {ch.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </div>

                  {/* API Key Bar */}
                  <div className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-xl">
                    <span className="font-mono text-[11px] font-bold text-gray-600 truncate max-w-[200px]">
                      {ch.api_key.substring(0, 8)}...{ch.api_key.substring(ch.api_key.length - 8)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ch.id, ch.api_key)}
                      className="text-gray-500 hover:text-gray-900 p-1 rounded transition-colors flex items-center gap-1 text-[10px] font-bold"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {copiedId === ch.id ? "check" : "content_copy"}
                      </span>
                      <span>{copiedId === ch.id ? "Disalin" : "Salin"}</span>
                    </button>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={() => handleTest(ch)}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-[11px] font-black text-gray-800 flex items-center gap-1 transition-all disabled:opacity-50"
                  >
                    {isTesting ? (
                      <span className="w-3 h-3 border-2 border-gray-800 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">send</span>
                    )}
                    <span>Tes Ping</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(ch)}
                      className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-300 transition-all"
                      title="Edit Saluran"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ch)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-300 transition-all"
                      title="Hapus Saluran"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {isFormOpen && (
        <WhatsappChannelForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedChannel(null);
          }}
          channel={selectedChannel}
          availableClasses={availableClasses}
          onSubmit={handleFormSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}
