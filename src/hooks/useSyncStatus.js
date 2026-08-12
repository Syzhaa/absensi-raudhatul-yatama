import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

/**
 * Multi-device sync hook.
 * Polls backend setiap 30s untuk:
 * - Detect logout di device lain (token revoked)
 * - Sync test_mode status dari settings
 * - Broadcast changes ke semua open tabs
 */
export function useSyncStatus(onSettingsChange) {
  const queryClient = useQueryClient();
  const pollIntervalRef = useRef(null);

  /**
   * Sync HANYA untuk state setelah login (test_mode settings, dll).
   * Login/logout TIDAK disync — tiap device mandiri.
   */
  const syncStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      // Fetch current settings untuk detect test_mode changes
      const settingsResponse = await api.get("/attendance/settings");
      const newSettings = settingsResponse.data?.data || [];

      // Store current settings di localStorage untuk cross-tab detection
      const oldSettings = JSON.parse(
        localStorage.getItem("attendance_settings") || "[]",
      );
      localStorage.setItem("attendance_settings", JSON.stringify(newSettings));

      // Detect test_mode changes
      if (JSON.stringify(oldSettings) !== JSON.stringify(newSettings)) {
        queryClient.invalidateQueries(["settings"]);
        if (onSettingsChange) onSettingsChange(newSettings);
      }
    } catch (error) {
      // Token invalid — abort silently. Device tetap login, tidak auto-logout.
      console.debug("Sync settings skipped:", error.message);
    }
  }, [queryClient, onSettingsChange]);

  useEffect(() => {
    // Start polling immediately
    syncStatus();

    // Then poll every 30s
    pollIntervalRef.current = setInterval(syncStatus, 30000);

    // Cleanup
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [syncStatus]);
}
