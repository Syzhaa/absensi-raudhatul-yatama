const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/be_yatama/routes/api.php';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /Route::prefix\('location-sync'\)->group\(function \(\) \{[\s\S]*?\}\);/,
  `Route::prefix('location-sync')->middleware('throttle:60,1')->group(function () {
        Route::post('{sessionId}', [LocationSyncController::class, 'push']);
        Route::get('check/{sessionId}', [LocationSyncController::class, 'check']);
        Route::get('stream/{sessionId}', [LocationSyncController::class, 'stream']);
    });`
);

fs.writeFileSync(file, code);
console.log("Patched api.php with check endpoint and throttle");
