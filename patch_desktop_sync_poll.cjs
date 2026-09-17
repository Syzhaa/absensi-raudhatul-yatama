const fs = require('fs');
const file = '/media/syzhaa/DATA/Project/yatama/absen/src/components/DesktopLocationSync.jsx';
let code = fs.readFileSync(file, 'utf8');

// Replace SSE effect to also include fallback polling
const oldSseRegex = /\/\/ Listen to SSE Stream\n\s*useEffect\(\(\) => \{[\s\S]*?return \(\) => \{\n\s*sse\.close\(\);\n\s*\};\n\s*\}, \[sessionId, onLocationReceived\]\);/;

const newSseBlock = `// Listen to SSE Stream + Polling Fallback
  useEffect(() => {
    let isDone = false;
    const apiUrl = import.meta.env.VITE_API_URL || "https://api.raudhatulyatama.sch.id/api/v1";
    const sse = new EventSource(\`\${apiUrl}/location-sync/stream/\${sessionId}\`);

    const handleSuccessData = (data) => {
      if (isDone) return;
      isDone = true;
      setStatus("success");
      try { sse.close(); } catch (e) {}

      setTimeout(() => {
        onLocationReceived({
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          accuracy: Number(data.accuracy || 5),
          isPcVerified: true,
          syncedByName: data.synced_by_name || "Petugas",
          syncedByRole: data.synced_by_role || "Admin",
        });
      }, 1000);
    };

    sse.addEventListener("connected", () => {
      if (!isDone) setStatus("listening");
    });

    sse.addEventListener("location_received", (e) => {
      try {
        const data = JSON.parse(e.data);
        handleSuccessData(data);
      } catch (err) {
        console.error("Failed to parse SSE location data", err);
      }
    });

    sse.addEventListener("timeout", () => {
      if (!isDone) setStatus("error");
      try { sse.close(); } catch (e) {}
    });

    // Fallback polling every 2.5 seconds in case SSE stream is blocked by client/proxy
    const pollInterval = setInterval(async () => {
      if (isDone) return;
      try {
        const checkRes = await fetch(\`\${apiUrl}/location-sync/check/\${sessionId}\`);
        const checkData = await checkRes.json();
        if (checkData.synced && checkData.data) {
          handleSuccessData(checkData.data);
        }
      } catch (err) {
        // ignore poll errors
      }
    }, 2500);

    return () => {
      isDone = true;
      clearInterval(pollInterval);
      try { sse.close(); } catch (e) {}
    };
  }, [sessionId, onLocationReceived]);`;

code = code.replace(oldSseRegex, newSseBlock);
fs.writeFileSync(file, code);
console.log("Patched DesktopLocationSync with dual SSE + Polling fallback");
