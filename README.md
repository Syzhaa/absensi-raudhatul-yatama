# Absensi Raudhatul Yatama

Sistem Absensi Digital berbasis QR Code untuk MA & MTs Raudhatul Yatama.

## Tech Stack

**Backend:**
- Laravel 11
- MySQL/MariaDB
- Laravel Sanctum (Auth)
- Laravel Queue (WhatsApp notifications)

**Frontend:**
- React 18 + Vite
- TailwindCSS (Neo-brutalism design)
- React Router
- TanStack Query
- Axios
- html5-qrcode

## Features

✅ **Dashboard** - Statistik kehadiran real-time  
✅ **Scan QR** - Camera-based QR scanner untuk absensi  
✅ **Data Siswa** - CRUD siswa dengan UUID untuk QR  
✅ **Data Guru** - CRUD guru dengan check-in/check-out  
✅ **Multi Lembaga** - Support MA & MTs  
✅ **Auto Status** - Hadir/Terlambat otomatis berdasarkan jam  
✅ **Duplicate Prevention** - Satu siswa hanya bisa absen sekali per hari  
🚧 **WhatsApp Notification** - Notifikasi ke orang tua (in progress)

## Installation

### Backend Setup

```bash
cd /www/wwwroot/api.raudhatulyatama.sch.id

# Install dependencies
composer install

# Run migrations
php artisan migrate

# Seed default settings
php artisan tinker
\App\Models\AttendanceSetting::create([
    'lembaga' => 'MA',
    'attendance_open' => '06:00:00',
    'attendance_limit' => '07:30:00',
    'late_after' => '07:30:00',
    'attendance_close' => '08:00:00',
    'timezone' => 'Asia/Makassar'
]);

# Create admin user
\App\Models\User::create([
    'name' => 'Admin Absensi',
    'email' => 'admin@absensi.test',
    'password' => bcrypt('password123'),
    'role' => 'super_admin'
]);
```

### Frontend Setup

```bash
cd /www/wwwroot/absen.raudhatulyatama.sch.id

# Install dependencies
npm install

# Build for production
npm run build

# Or run dev server
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Attendance
- `GET /api/v1/attendance/dashboard` - Dashboard stats
- `POST /api/v1/attendance/scan/student` - Scan QR siswa
- `POST /api/v1/attendance/scan/teacher` - Scan QR guru

### Students
- `GET /api/v1/attendance/students` - List siswa
- `POST /api/v1/attendance/students` - Create siswa
- `GET /api/v1/attendance/students/{id}` - Get siswa
- `PUT /api/v1/attendance/students/{id}` - Update siswa
- `DELETE /api/v1/attendance/students/{id}` - Delete siswa
- `GET /api/v1/attendance/students/{id}/qr` - Get QR URL

### Teachers
- `GET /api/v1/attendance/teachers` - List guru
- `POST /api/v1/attendance/teachers` - Create guru
- `GET /api/v1/attendance/teachers/{id}` - Get guru
- `PUT /api/v1/attendance/teachers/{id}` - Update guru
- `DELETE /api/v1/attendance/teachers/{id}` - Delete guru
- `GET /api/v1/attendance/teachers/{id}/qr` - Get QR URL

## Database Schema

### students
- id, uuid, lembaga, nama, nis, nisn
- tempat_lahir, tanggal_lahir, jenis_kelamin
- alamat, kelas, nomor_hp_orangtua
- foto, status, timestamps

### teachers
- id, uuid, lembaga, nama, nip
- mata_pelajaran, nomor_hp, foto
- status, timestamps

### attendance_students
- id, lembaga, student_id, scanned_by
- attendance_date, check_in, status, notes
- Unique: (student_id, attendance_date)

### attendance_teachers
- id, lembaga, teacher_id
- attendance_date, check_in, check_out
- status, notes, timestamps

### attendance_settings
- id, lembaga (unique)
- attendance_open, attendance_limit
- late_after, attendance_close, timezone

### whatsapp_logs
- id, student_id, attendance_id
- phone_number, message, status
- response, error_message, sent_at

## Flow Absensi

1. Siswa didaftarkan dengan UUID auto-generated
2. QR code berisi UUID siswa
3. Guru scan QR menggunakan smartphone
4. Backend validasi:
   - UUID valid?
   - Siswa aktif?
   - Dalam jam absensi?
   - Belum absen hari ini?
5. Simpan attendance dengan status auto:
   - HADIR (scan sebelum 07:30)
   - TERLAMBAT (scan >= 07:30)
6. Queue WhatsApp notification ke orang tua
7. Response ke frontend dengan data lengkap

## Design System

### Neo-brutalism Theme
- **Primary:** #a3e635 (lime green)
- **Secondary:** #ffde59 (yellow)
- **Accent:** #ff90e8 (pink), #90baad (blue)
- **Background:** #fdfaf5 (cream)
- **Borders:** 3px solid black
- **Shadows:** Neo shadow effect

## Deployment

### Nginx Config
```nginx
server {
    listen 443 ssl http2;
    server_name absen.raudhatulyatama.sch.id;
    
    root /www/wwwroot/absen.raudhatulyatama.sch.id/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Production Checklist
- [x] Database migrations
- [x] API endpoints
- [x] Frontend build
- [x] Nginx configuration
- [x] Default settings
- [ ] SSL certificate
- [ ] WhatsApp service
- [ ] End-to-end testing

## Test Credentials

**Login:**
- Email: `admin@absensi.test`
- Password: `password123`

**Test Student:**
- UUID: `2e108e52-17ef-4e5d-86d3-e88001eb714c`
- Use this for testing QR scan

## TODO

- [ ] WhatsApp notification service (Node.js + whatsapp-web.js)
- [ ] QR code image generation
- [ ] Rekap absensi (daily, monthly)
- [ ] Export to Excel/PDF
- [ ] Settings page (edit jam absensi)
- [ ] WhatsApp connection manager
- [ ] User management
- [ ] Advanced filtering & search
- [ ] Charts & analytics

## Domains

- **Frontend:** https://absen.raudhatulyatama.sch.id
- **API Backend:** https://api.raudhatulyatama.sch.id
- **Website MA:** https://ma.raudhatulyatama.sch.id

## License

MIT

## Contact

Raudhatul Yatama - Sistem Informasi Sekolah
