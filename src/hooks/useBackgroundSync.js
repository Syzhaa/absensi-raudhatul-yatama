import { useEffect } from 'react';
import { getOfflineScans, clearOfflineScans } from '../services/db';
import api from '../services/api';

export function useBackgroundSync() {
  useEffect(() => {
    const syncScans = async () => {
      if (!navigator.onLine) return;
      
      try {
        const offlineScans = await getOfflineScans();
        if (offlineScans.length === 0) return;

        // Sync with backend
        // This requires a new backend endpoint that can accept bulk offline scans
        // with signature validation for each.
        const response = await api.post('/attendance/scan/bulk-offline', {
          scans: offlineScans
        });

        if (response.data?.success) {
          // Clear synced items
          const idsToClear = offlineScans.map(scan => scan.id);
          await clearOfflineScans(idsToClear);
          console.log(`Synced ${idsToClear.length} offline scans.`);
          window.dispatchEvent(new Event('offline_sync_complete'));
        }
      } catch (err) {
        console.error('Offline sync failed:', err);
      }
    };

    // Try syncing when component mounts
    syncScans();

    // Listen for online events
    window.addEventListener('online', syncScans);
    
    // Also try syncing periodically every 2 minutes just in case
    const interval = setInterval(syncScans, 2 * 60 * 1000);

    return () => {
      window.removeEventListener('online', syncScans);
      clearInterval(interval);
    };
  }, []);
}
