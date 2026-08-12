import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

// Pastikan browser tidak memakai app-shell PWA lama setelah deployment.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

if ("caches" in window) {
  caches.keys().then((keys) => {
    keys
      .filter((key) => key.startsWith("workbox-") || key.includes("precache"))
      .forEach((key) => caches.delete(key));
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Sync across tabs: refetch when window regains focus (admin edits in tab 1 -> tab 2 updates)
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
