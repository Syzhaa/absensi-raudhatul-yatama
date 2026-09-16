const fs = require('fs');

const file = '/media/syzhaa/DATA/Project/yatama/be_yatama/routes/api.php';
let code = fs.readFileSync(file, 'utf8');

const importStatement = "use App\\Http\\Controllers\\Api\\V1\\LocationSyncController;\nuse Illuminate\\Support\\Facades\\Route;";
code = code.replace("use Illuminate\\Support\\Facades\\Route;", importStatement);

const routesBlock = `
    // === Cross-Device Location Sync ===
    Route::prefix('location-sync')->group(function () {
        Route::post('{sessionId}', [LocationSyncController::class, 'push']);
        Route::get('stream/{sessionId}', [LocationSyncController::class, 'stream']);
    });

    // === Public Endpoints ===`;

code = code.replace("// === Public Endpoints ===", routesBlock);

fs.writeFileSync(file, code);
console.log("Patched api.php");
