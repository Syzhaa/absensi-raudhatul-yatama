import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

export function useAttendanceSSE(selectedDate, queryClient) {
  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    const connectSSE = async () => {
      try {
        const token =
          localStorage.getItem("auth_token") || localStorage.getItem("token");
        const isTestMode = useAppStore.getState().isTestMode;

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/attendance/logs/stream?date=${selectedDate}${isTestMode ? "&is_test=1" : ""}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: abortController.signal,
          },
        );

        if (!response.ok) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (active) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunks = decoder.decode(value).split("\n\n");
          for (const chunk of chunks) {
            if (chunk.startsWith("data: ")) {
              try {
                const data = JSON.parse(chunk.substring(6));

                if (data.role === "student") {
                  queryClient.setQueryData(
                    ["attendance_students", selectedDate],
                    (old) => {
                      if (!old) return { data: [data] };
                      const exists = old.data.findIndex(
                        (item) => item.id === data.id,
                      );
                      if (exists >= 0) {
                        const newData = [...old.data];
                        newData[exists] = data;
                        return { ...old, data: newData };
                      }
                      return { ...old, data: [data, ...old.data] };
                    },
                  );
                } else if (data.role === "teacher") {
                  queryClient.setQueryData(
                    ["attendance_teachers", selectedDate],
                    (old) => {
                      if (!old) return { data: [data] };
                      const exists = old.data.findIndex(
                        (item) => item.id === data.id,
                      );
                      if (exists >= 0) {
                        const newData = [...old.data];
                        newData[exists] = data;
                        return { ...old, data: newData };
                      }
                      return { ...old, data: [data, ...old.data] };
                    },
                  );
                }
              } catch (e) {}
            }
          }
        }
      } catch (error) {
        if (active && error.name !== "AbortError") {
          setTimeout(connectSSE, 3000);
        }
      }
    };

    connectSSE();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [selectedDate, queryClient]);

}
