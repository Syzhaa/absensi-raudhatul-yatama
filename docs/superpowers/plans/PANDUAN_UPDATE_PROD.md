# Panduan Update Production Sistem Absensi

Dokumen ini berisi rangkuman perubahan terbaru serta langkah-langkah yang **wajib dilakukan** saat melakukan pembaruan (`git pull`) di server **Production** untuk **BE (Backend)** dan **FE (Frontend)**.

---

## 📋 Rangkuman Pembaruan Terbaru

### 1. Penghapusan Fitur Mode Test Secara Menyeluruh
- **Database**:
  - Kolom `test_mode` di tabel `attendance_settings` telah dihapus.
  - Kolom `is_test` di tabel `attendance_students` dan `attendance_teachers` telah dihapus.
  - Index dashboard telah direkonstruksi tanpa `is_test` agar performa query tetap optimal.
- **FE & BE**:
  - Semua tombol, teks, modal, dan logika "Mode Test / Testing" telah dibersihkan sepenuhnya dari sistem.

### 2. Format Kelas & Sinkronisasi Lembaga (Romawi ⇄ Angka Biasa)
- **UI Pengaturan Baru (FE)**: Menggunakan 2 Tombol Pilihan (*Segmented Control*) dengan ikon checklist dan indikator warna hijau terang (`primary-green`) yang sangat jelas untuk opsi yang sedang aktif.
- **Sinkronisasi Multi-Lembaga (BE)**: Setiap kali format kelas disimpan, BE otomatis menyinkronkan pengaturan format tersebut ke seluruh lembaga (`MA`, `MTs`, `Yayasan`) secara serentak.
- **Smart Regex Converter (FE & BE)**: Konversi format kini mendukung format kombinasi/berimbas (seperti `7A` ⇄ `VIIA`, `VII-B` ⇄ `7-B`, `10 IPA 1` ⇄ `X IPA 1`, `Kelas 8` ⇄ `Kelas VIII`).
- **Urutan Hierarki Kelas**: Pengurutan kelas selalu konsisten mengikuti urutan jenjang pendidikan: `7 -> 8 -> 9 -> 10 -> 11 -> 12` (atau `VII -> VIII -> IX -> X -> XI -> XII`).
- **Penerapan Format Global**: Seluruh dropdown, tabel, kartu siswa, form tambah/edit, modal kenaikan kelas, dan laporan presensi kini otomatis terformat rapi sesuai konfigurasi aktif.
- **Normalisasi Waktu Operasional (BE)**: BE otomatis menerima dan menormalisasi format jam `HH:mm` menjadi `HH:mm:ss` untuk mencegah terjadinya error validasi 422.

### 3. Perapian UI Halaman Laporan / Report (FE)
- **Tab & Export Sejajar**: Tab navigasi (*Log Siswa*, *Log Guru*, *Rekap Siswa*) di sebelah kiri dan tombol aksi export (*Excel* & *PDF*) di sebelah kanan disatukan dalam satu baris header yang simetris dan rapi.
- **Styling Filter Neobrutalism**: Field pencarian dan filter tanggal/status dipercantik dengan border tegas, shadow-neo, dan layout responsif.

### 4. Layout 2 Kolom Halaman Scan QR (FE)
- **Mode Desktop/Tablet**: Layout dibuat berdampingan 2 kolom (*Side-by-Side*):
  - **Kolom Kiri**: Navigasi Masuk/Pulang, Jendela Kamera Scanner (aspect ratio proporsional tanpa bar hitam samping), dan tombol kendali Scan.
  - **Kolom Kanan**: Card Riwayat Scan Hari Ini yang menampilkan aktivitas presensi realtime secara langsung.
- **Mode Mobile (Smartphone)**: Tetap tersusun secara vertikal yang nyaman digunakan pada layar portrait.

---

## 🛠️ Langkah-Langkah Update di Server Production

### Langkah 1: Update BE (Backend)

Masuk ke direktori BE di server production:
```bash
cd /path/to/BE

# 1. Tarik kode terbaru dari git
git pull origin main

# 2. Update dependensi (jika diperlukan)
composer install --no-dev --optimize-autoloader

# 3. PENTING: Jalankan migrasi database (Wajib karena ada drop kolom test_mode & is_test)
php artisan migrate --force

# 4. Bersihkan dan segarkan semua cache Laravel
php artisan optimize:clear
php artisan config:clear
php artisan route:clear
php artisan cache:clear
php artisan view:clear
```

### Langkah 2: Update FE (Frontend)

Masuk ke direktori FE di server production:
```bash
cd /path/to/FE

# 1. Tarik kode terbaru dari git
git pull origin main

# 2. Install dependensi (jika ada package baru)
npm install

# 3. Build bundle production
npm run build
```
*(Jika web server production menyajikan folder `dist`, pastikan file build di `dist/` sudah ter-update).*

### Langkah 3: Restart Services (Jika Menggunakan Worker/Process Manager)

- **Laravel Queue Worker (Supervisor)**:
  ```bash
  sudo supervisorctl restart all
  ```
- **PHP-FPM / Nginx** (Opsional untuk memastikan OPcache bersih):
  ```bash
  sudo systemctl restart php8.2-fpm  # Sesuaikan versi PHP
  sudo systemctl reload nginx
  ```

---

## ✅ Checklist Verifikasi Setelah Update

1. **Buka Halaman Pengaturan (`/settings`)**:
   - Coba ubah format kelas ke **Romawi** atau **Angka Biasa** lalu klik **Simpan Pengaturan**.
   - Pastikan pesan sukses muncul dan setting tetap tersimpan setelah halaman di-refresh.
2. **Buka Halaman Scan QR (`/scan`)**:
   - Di layar laptop/desktop, pastikan kamera muncul di sebelah **kiri** dan riwayat scan di sebelah **kanan**.
3. **Buka Halaman Laporan (`/report`)**:
   - Pastikan tab dan tombol export Excel & PDF berada dalam satu baris yang rapi.
4. **Buka Halaman Siswa (`/students`)**:
   - Pastikan badge kelas siswa dan dropdown form tambah siswa tampil sesuai format kelas yang dipilih.
