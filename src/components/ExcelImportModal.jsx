import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import Modal from "./Modal";

export default function ExcelImportModal({
  isOpen,
  onClose,
  type = "students", // "students" | "teachers"
  onSuccess,
  apiEndpoint,
}) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isStudent = type === "students";

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setErrorMsg("");
    setSuccessMsg("");
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          setErrorMsg("File Excel kosong atau format tabel tidak terbaca.");
          return;
        }

        // Standardize column keys (case-insensitive & trim)
        const formatted = rawJson.map((row) => {
          const item = {};
          Object.entries(row).forEach(([key, val]) => {
            const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            item[cleanKey] = typeof val === "string" ? val.trim() : String(val);
          });

          if (isStudent) {
            return {
              nama: item.nama || item.namasiswa || item.fullname || "",
              nisn: item.nisn || item.nis || item.nomorinduk || "",
              kelas: item.kelas || item.rombel || "",
              jenis_kelamin: item.jeniskelamin || item.jk || item.gender || "L",
              nomor_hp_orangtua: item.nomorhporangtua || item.nohportu || item.whatsapp || item.wa || item.hp || "",
              lembaga: item.lembaga || "",
            };
          } else {
            return {
              nama: item.nama || item.namaguru || item.fullname || "",
              nip: item.nip || item.nik || item.nomorinduk || "",
              mata_pelajaran: item.matapelajaran || item.mapel || item.pelajaran || "",
              nomor_hp: item.nomorhp || item.nohp || item.whatsapp || item.wa || item.hp || "",
              lembaga: item.lembaga || "",
            };
          }
        }).filter((item) => item.nama && (isStudent ? item.nisn : true));

        if (formatted.length === 0) {
          setErrorMsg(
            isStudent
              ? "Tidak ada baris valid yang memuat kolom 'Nama' dan 'NISN'."
              : "Tidak ada baris valid yang memuat kolom 'Nama'."
          );
          return;
        }

        setParsedData(formatted);
        setPreviewRows(formatted.slice(0, 5)); // 5 baris preview
      } catch (err) {
        console.error(err);
        setErrorMsg("Gagal membaca file Excel/CSV. Pastikan format file .xlsx atau .csv.");
      }
    };

    reader.readAsBinaryString(selected);
  };

  const handleDownloadTemplate = () => {
    let templateData = [];
    let filename = "";

    if (isStudent) {
      filename = "Template_Import_Siswa.xlsx";
      templateData = [
        {
          "Nama": "Ahmad Zaki",
          "NISN": "0012345678",
          "Kelas": "X-A",
          "Jenis Kelamin": "L",
          "Nomor HP Orang Tua": "081234567890",
          "Lembaga": "MA",
        },
        {
          "Nama": "Siti Fatimah",
          "NISN": "0012345679",
          "Kelas": "X-B",
          "Jenis Kelamin": "P",
          "Nomor HP Orang Tua": "085234567891",
          "Lembaga": "MA",
        },
      ];
    } else {
      filename = "Template_Import_Guru.xlsx";
      templateData = [
        {
          "Nama": "Ustadz Abdullah, S.Pd",
          "NIP": "198501012010011001",
          "Mata Pelajaran": "Bahasa Arab",
          "Nomor HP": "081234567890",
          "Lembaga": "MA",
        },
        {
          "Nama": "Ustadzah Maryam, M.Pd",
          "NIP": "199002022015022002",
          "Mata Pelajaran": "Fiqih",
          "Nomor HP": "085234567891",
          "Lembaga": "MA",
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = isStudent
      ? [{ wch: 25 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 10 }]
      : [{ wch: 28 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 10 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, filename);
  };

  const handleUploadSubmit = async () => {
    if (parsedData.length === 0) {
      setErrorMsg("Pilih file Excel yang valid terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const api = await import("../services/api").then((m) => m.default);
      const payload = isStudent ? { students: parsedData } : { teachers: parsedData };
      const response = await api.post(apiEndpoint, payload);

      setSuccessMsg(response.data?.message || "Import data berhasil diproses!");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message || "Terjadi kesalahan saat mengunggah data ke server."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setPreviewRows([]);
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Import Data ${isStudent ? "Siswa" : "Guru"} (Excel/CSV)`}>
      <div className="space-y-4">
        {/* Step Guide Banner */}
        <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-start gap-2.5">
          <span className="material-symbols-outlined text-amber-600 text-xl flex-shrink-0 mt-0.5">info</span>
          <div className="text-xs text-amber-900 leading-relaxed">
            Gunakan format kolom yang sesuai. Jika data dengan {isStudent ? "NISN" : "NIP / Nama"} yang sama sudah ada di sistem, <strong>data akan otomatis diperbarui (update)</strong> tanpa membuat duplikat.
          </div>
        </div>

        {/* Download Template Button */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border-2 border-gray-200 rounded-xl">
          <div className="pr-2">
            <span className="font-bold text-xs text-gray-900 block">Belum punya template Excel?</span>
            <span className="text-[11px] text-gray-500">Unduh contoh format tabel yang sudah disesuaikan</span>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-900 font-black text-xs rounded-lg border-2 border-gray-900 shadow-sm flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-emerald-600">download</span>
            <span>Download Template</span>
          </button>
        </div>

        {/* File Dropzone / Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-800">
            Pilih File Excel (.xlsx / .xls / .csv)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="w-full text-xs font-bold text-gray-900 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-2 file:border-gray-900 file:text-xs file:font-black file:bg-primary-green file:cursor-pointer hover:file:bg-emerald-400 file:transition-colors bg-gray-50 border-2 border-gray-300 rounded-xl p-1.5 cursor-pointer focus:outline-none"
          />
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="p-2.5 bg-red-50 border border-red-300 text-red-900 rounded-xl text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-red-600">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Preview Data Table */}
        {previewRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-gray-900">
                Preview Data ({parsedData.length} baris terdeteksi):
              </span>
              <span className="text-gray-500 font-bold text-[11px]">5 baris teratas</span>
            </div>

            <div className="border-2 border-gray-900 rounded-xl overflow-x-auto max-h-48">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 border-b-2 border-gray-900 text-gray-800 font-black uppercase text-[10px]">
                  <tr>
                    <th className="px-2.5 py-1.5">No</th>
                    <th className="px-2.5 py-1.5">Nama</th>
                    <th className="px-2.5 py-1.5">{isStudent ? "NISN" : "NIP"}</th>
                    <th className="px-2.5 py-1.5">{isStudent ? "Kelas" : "Mapel"}</th>
                    <th className="px-2.5 py-1.5">No. HP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {previewRows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-2.5 py-1 text-gray-500">{i + 1}</td>
                      <td className="px-2.5 py-1 font-bold text-gray-900">{r.nama}</td>
                      <td className="px-2.5 py-1 font-mono">{isStudent ? r.nisn : r.nip || "-"}</td>
                      <td className="px-2.5 py-1">{isStudent ? r.kelas || "-" : r.mata_pelajaran || "-"}</td>
                      <td className="px-2.5 py-1 font-mono text-[11px]">{isStudent ? r.nomor_hp_orangtua || "-" : r.nomor_hp || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border-2 border-gray-300 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleUploadSubmit}
            disabled={isLoading || parsedData.length === 0}
            className="px-5 py-2 bg-primary-green hover:bg-emerald-400 disabled:opacity-40 text-gray-900 font-black text-xs rounded-xl border-2 border-gray-900 shadow-neo transition-all active:translate-y-0.5 flex items-center gap-1.5"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
                <span>Mengimpor Data...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">upload_file</span>
                <span>Impor {parsedData.length} Baris Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
