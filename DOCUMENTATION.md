# Sistem Absensi QR Code - Raudhatul Yatama

## Dokumentasi Implementasi

### Stack Teknologi

**Backend:**
- Laravel (API existing di api.raudhatulyatama.sch.id)
- MySQL/MariaDB
- Laravel Sanctum (Authentication)
- Laravel Queue (WhatsApp notification)

**Frontend:**
- React + Vite
- TailwindCSS (Neo-brutalism design)
- React Router
- TanStack Query
- Axios
- html5-qrcode

**WhatsApp Service (Planned):**
- Node.js + Express
- whatsapp-web.js

---

## Database Schema

### Tables Created

1. **students**
   - id, uuid, lembaga, nama, nis, nisn
   - tempat_lahir, tanggal_lahir, jenis_kelamin
   - alamat, kelas, nomor_hp_orangtua
   - foto, status, timestamps

2. **teachers**
   - id, uuid, lembaga, nama, nip
   - mata_pelajaran, nomor_hp, foto
   - status, timestamps

3. **attendance_students**
   - id, lembaga, student_id, scanned_by
   - attendance_date, check_in, status, notes
   - timestamps
   - Unique: (student_id, attendance_date)

4. **attendance_teachers**
   - id, lembaga, teacher_id
   - attendance_date, check_in, check_out
   - status, notes, timestamps
   - Unique: (teacher_id, attendance_date)

5. **attendance_settings**
   - id, lembaga (unique)
   - attendance_open, attendance_limit
   - late_after, attendance_close
   - timezone, timestamps

6. **whatsapp_logs**
   - id, student_id, attendance_id
   - phone_number, message, status
   - response, error_message, sent_at
   - timestamps

---

## API Endpoints

### Auth
- POST `/api/v1/auth/login` - Login
- POST `/api/v1/auth/logout` - Logout
- GET `/api/v1/auth/me` - Get current user

### Attendance Module
- GET `/api/v1/attendance/dashboard` - Dashboard stats
- POST `/api/v1/attendance/scan/student` - Scan QR siswa
- POST `/api/v1/attendance/scan/teacher` - Scan QR guru

### Students
- GET `/api/v1/attendance/students` - List siswa
- POST `/api/v1/attendance/students` - Tambah siswa
- GET `/api/v1/attendance/students/{id}` - Detail siswa
- PUT `/api/v1/attendance/students/{id}` - Update siswa
- DELETE `/api/v1/attendance/students/{id}` - Hapus siswa
- GET `/api/v1/attendance/students/{id}/qr` - Get QR code URL

### Teachers
- GET `/api/v1/attendance/teachers` - List guru
- POST `/api/v1/attendance/teachers` - Tambah guru
- GET `/api/v1/attendance/teachers/{id}` - Detail guru
- PUT `/api/v1/attendance/teachers/{id}` - Update guru
- DELETE `/api/v1/attendance/teachers/{id}` - Hapus guru
- GET `/api/v1/attendance/teachers/{id}/qr` - Get QR code URL

---

## Frontend Pages

### 1. Login (`/login`)
- Email & password authentication
- Token disimpan di localStorage

### 2. Dashboard (`/`)
- Total siswa & guru
- Kehadiran hari ini
- Statistik: Terlambat, Izin, Sakit, Alpha
- Persentase kehadiran

### 3. Scan QR (`/scan`)
- Toggle siswa/guru
- Camera access untuk scan QR
- Real-time validation
- Tampil data lengkap setelah scan berhasil
- Status: Hadir/Terlambat

### 4. Data Siswa (`/students`)
- CRUD siswa
- Form: lembaga, nama, NIS, NISN, kelas, dll
- No HP orang tua untuk WhatsApp
- Table dengan aksi edit/delete

### 5. Data Guru (`/teachers`)
- CRUD guru
- Form: lembaga, nama, NIP, mata pelajaran, dll
- Table dengan aksi edit/delete

---

## File Structure

### Backend
```
/www/wwwroot/api.raudhatulyatama.sch.id/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/V1/Attendance/
│   │   │   ├── DashboardController.php
│   │   │   ├── ScanController.php
│   │   │   ├── StudentController.php
│   │   │   └── TeacherController.php
│   │   └── Resources/
│   │       ├── StudentResource.php
│   │       └── TeacherResource.php
│   ├── Models/
│   │   ├── Student.php
│   │   ├── Teacher.php
│   │   ├── AttendanceStudent.php
│   │   ├── AttendanceTeacher.php
│   │   ├── AttendanceSetting.php
│   │   └── WhatsappLog.php
│   └── Services/
│       ├── AttendanceService.php
│       ├── StudentService.php
│       └── TeacherService.php
├── database/migrations/
│   ├── 2026_08_07_140400_create_students_table.php
│   ├── 2026_08_07_140401_create_teachers_table.php
│   ├── 2026_08_07_140402_create_attendance_settings_table.php
│   ├── 2026_08_07_140403_create_attendance_students_table.php
│   ├── 2026_08_07_140404_create_attendance_teachers_table.php
│   └── 2026_08_07_140405_create_whatsapp_logs_table.php
└── routes/
    └── api.php (updated)
```

### Frontend
```
/www/wwwroot/absen.raudhatulyatama.sch.id/
├── src/
│   ├── components/
│   │   └── Layout.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ScanQR.jsx
│   │   ├── Students.jsx
│   │   └── Teachers.jsx
│   ├── services/
│   │   ├── api.js
│   │   └── index.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── tailwind.config.js
└── dist/ (production build)
```

---

## Domains

- **API Backend:** https://api.raudhatulyatama.sch.id
- **Frontend Absensi:** https://absen.raudhatulyatama.sch.id
- **Website MA:** https://ma.raudhatulyatama.sch.id

---

## Default Settings

### Jam Absensi (MA & MTs)
- Absensi dibuka: 06:00 WITA
- Batas hadir: 07:30 WITA
- Terlambat setelah: 07:30 WITA
- Absensi ditutup: 08:00 WITA
- Timezone: Asia/Makassar

---

## Flow Absensi Siswa

1. Siswa input ke sistem dengan UUID auto-generated
2. QR code berisi UUID siswa
3. Guru scan QR via smartphone
4. Backend validasi:
   - UUID valid?
   - Siswa aktif?
   - Dalam jam absensi?
   - Sudah absen hari ini?
5. Simpan attendance dengan status:
   - HADIR (< 07:30)
   - TERLAMBAT (>= 07:30)
6. Queue WhatsApp notification ke orang tua
7. Response ke frontend dengan data lengkap

---

## WhatsApp Notification (TODO)

### Message Template
```
Assalamu'alaikum.

*Informasi Kehadiran Siswa*

Nama: Muhammad Jamal
NIS: 230011
Kelas: VIII A
Lembaga: MA Raudhatul Yatama

Tanggal: 07 Agustus 2026
Jam Masuk: 07:12 WITA
Status: *Hadir*

Pesan ini dikirim otomatis oleh Sistem Absensi Raudhatul Yatama.
```

### WhatsApp Service Architecture
```
Laravel Queue
  ↓
Internal API Request
  ↓
Node.js WhatsApp Service
  ↓
whatsapp-web.js
  ↓
WhatsApp Orang Tua
```

---

## Next Steps / TODO

### 1. WhatsApp Integration
- [ ] Setup Node.js WhatsApp service
- [ ] Install whatsapp-web.js
- [ ] Setup internal API endpoint
- [ ] Test QR login WhatsApp
- [ ] Implement queue worker
- [ ] Test notification delivery

### 2. QR Code Generation
- [ ] Generate QR code image dari UUID
- [ ] Print QR per siswa/guru
- [ ] QR code endpoint with image response

### 3. Rekap & Export
- [ ] Rekap absensi harian
- [ ] Rekap bulanan
- [ ] Filter by lembaga, kelas, tanggal
- [ ] Export to Excel
- [ ] Export to PDF

### 4. Dashboard Enhancement
- [ ] Grafik kehadiran
- [ ] Recent activity log
- [ ] Filter by date range

### 5. Settings Page
- [ ] Edit attendance settings per lembaga
- [ ] WhatsApp connection management
- [ ] User management

### 6. SSL/Domain Setup
- [ ] Setup SSL certificate untuk absen.raudhatulyatama.sch.id
- [ ] Configure Cloudflare atau Let's Encrypt

### 7. Testing
- [ ] Test full flow absensi
- [ ] Test duplicate scan prevention
- [ ] Test camera access di berbagai device
- [ ] Test responsive design

---

## Design System

### Colors (Neo-brutalism)
- **Primary Green:** #a3e635
- **Yellow:** #ffde59
- **Pink:** #ff90e8
- **Blue:** #90baad
- **Background:** #fdfaf5

### Typography
- Font: Inter (system fallback)
- Bold headlines
- Black borders (3px)

### Components
- **Buttons:** Bold text, 3px border, neo shadow
- **Cards:** White background, 3px border, neo shadow
- **Inputs:** 3px border, focus ring yellow

---

## Security

- Laravel Sanctum token authentication
- CORS configured for absen.raudhatulyatama.sch.id
- Rate limiting on API endpoints
- UUID untuk QR (tidak exposed primary key)
- Input validation di backend dan frontend

---

## Performance

- React Query caching (5 menit stale time)
- Gzip compression enabled
- Static assets cached 1 year
- Lazy load components
- Optimized Vite build

---

## Deployment Checklist

- [x] Database migrations
- [x] Models & relationships
- [x] Services & business logic
- [x] API controllers & routes
- [x] Frontend components
- [x] Frontend pages
- [x] Build frontend
- [x] Nginx configuration
- [x] Default settings seeded
- [ ] SSL certificate
- [ ] WhatsApp service
- [ ] Test end-to-end

---

## Support & Maintenance

### Logs Location
- **Nginx Access:** `/var/log/nginx/absen.raudhatulyatama.access.log`
- **Nginx Error:** `/var/log/nginx/absen.raudhatulyatama.error.log`
- **Laravel:** `/www/wwwroot/api.raudhatulyatama.sch.id/storage/logs/laravel.log`

### Monitoring
- Check API response time
- Monitor WhatsApp queue status
- Track failed WhatsApp deliveries
- Database backup schedule

---

Dokumentasi ini akan di-update seiring development berlanjut.
