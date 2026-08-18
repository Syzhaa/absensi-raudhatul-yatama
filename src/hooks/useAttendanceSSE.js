import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

export function useAttendanceSSE(selectedDate, queryClient) {
  // SSE disabled - data will refresh on page load/navigation instead
  useEffect(() => {
    // No-op: SSE stream removed to avoid CORS complexity
    // Frontend will fetch data normally on mount or manual refresh
    return () => {};
  }, [selectedDate, queryClient]);
}
