const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/be_yatama/app/Http/Controllers/Api/V1/Attendance/ScanController.php';
let code = fs.readFileSync(file, 'utf8');

const oldGeoBlock = `        // 3. Validasi Geofencing GPS jika koordinat dikirim dan enable_location_check aktif
        $latitude = $request->input('latitude');
        $longitude = $request->input('longitude');
        if ($latitude !== null && $longitude !== null) {
            $userLembaga = $request->user()?->lembaga ?? 'ma';
            $setting = \\App\\Models\\AttendanceSetting::withoutGlobalScopes()
                ->whereRaw('LOWER(lembaga) = ?', [strtolower($userLembaga)])
                ->first();

            if ($setting && $setting->enable_location_check) {
                $schoolLat = (float) ($setting->latitude ?? -3.37651);
                $schoolLon = (float) ($setting->longitude ?? 114.64682);
                $radiusMax = (int) ($setting->radius_meters ?? 100);

                $distance = $this->calculateDistance((float)$latitude, (float)$longitude, $schoolLat, $schoolLon);
                if ($distance > $radiusMax) {
                    $distRound = round($distance);
                    return $this->error("Lokasi di luar jangkauan sekolah ({$distRound} meter dari titik koordinat). Maksimal radius presensi adalah {$radiusMax} meter.", 403);
                }
            }
        }`;

const newGeoBlock = `        // 3. Validasi Geofencing GPS jika koordinat dikirim dan enable_location_check aktif
        $latitude = $request->input('latitude');
        $longitude = $request->input('longitude');
        if ($latitude !== null && $longitude !== null) {
            // Deteksi lembaga target (siswa / guru) agar tidak salah koordinat jika discan oleh Super Admin / Yayasan
            $targetObj = Student::where('uuid', $uuid)->where('status', 'aktif')->first()
                      ?? Teacher::where('uuid', $uuid)->where('status', 'aktif')->first();

            $effectiveLembaga = $targetObj?->lembaga
                ?? $request->input('lembaga')
                ?? $request->header('X-Lembaga')
                ?? $request->user()?->lembaga
                ?? 'ma';

            if (strtolower($effectiveLembaga) === 'yayasan') {
                $effectiveLembaga = $targetObj?->lembaga ?? $request->input('lembaga') ?? $request->header('X-Lembaga') ?? 'ma';
            }

            $setting = \\App\\Models\\AttendanceSetting::withoutGlobalScopes()
                ->whereRaw('LOWER(lembaga) = ?', [strtolower($effectiveLembaga)])
                ->first();

            if ($setting && $setting->enable_location_check) {
                $schoolLat = (float) ($setting->latitude ?? -3.37651);
                $schoolLon = (float) ($setting->longitude ?? 114.64682);
                $radiusMax = (int) ($setting->radius_meters ?? 100);

                $distance = $this->calculateDistance((float)$latitude, (float)$longitude, $schoolLat, $schoolLon);
                if ($distance > $radiusMax) {
                    $distRound = round($distance);
                    return $this->error("Lokasi di luar jangkauan sekolah ({$distRound} meter dari titik koordinat " . strtoupper($effectiveLembaga) . "). Maksimal radius presensi adalah {$radiusMax} meter.", 403);
                }
            }
        }`;

code = code.replace(oldGeoBlock, newGeoBlock);
fs.writeFileSync(file, code);
console.log("Patched ScanController.php with accurate lembaga geofencing");
