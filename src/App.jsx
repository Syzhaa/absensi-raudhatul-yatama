import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import { useBackgroundSync } from "./hooks/useBackgroundSync";
import api from "./services/api";
import { useAppStore } from "./store/useAppStore";
import { canAccessPath, getFirstAllowedPath } from "./auth/accessPolicy";
import WhatsappApi from "./pages/WhatsappApi";
import { CardSkeleton, PageHeaderSkeleton } from "./components/Skeleton";

// Lazy load heavy components
const ScanQR = lazy(() => import("./pages/ScanQR"));
const Students = lazy(() => import("./pages/Students"));
const Teachers = lazy(() => import("./pages/Teachers"));
const Attendance = lazy(() => import("./pages/Attendance"));
const GuruAttendance = lazy(() => import("./pages/GuruAttendance"));
const Holidays = lazy(() => import("./pages/Holidays"));
const Users = lazy(() => import("./pages/Users"));
const Profile = lazy(() => import("./pages/Profile"));
const WhatsappTemplates = lazy(() => import("./pages/WhatsappTemplates"));
const Report = lazy(() => import("./pages/Report"));
const Guide = lazy(() => import("./pages/Guide"));

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const userRole = useAppStore((state) => state.userRole);
  const userPermissions = useAppStore((state) => state.userPermissions);
  const setUserRole = useAppStore((state) => state.setUserRole);
  const setUserLembaga = useAppStore((state) => state.setUserLembaga);
  const setUserPermissions = useAppStore((state) => state.setUserPermissions);

  useBackgroundSync();

  // Sinkronisasi logo dinamis & favicon dari backend API
  useEffect(() => {
    const syncLogoAndFavicon = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.raudhatulyatama.sch.id/api/v1';
        const res = await fetch(`${apiBase}/logo`, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.url) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = json.data.url;
          }
        }
      } catch (err) {
        // Fallback
      }
    };
    syncLogoAndFavicon();
  }, []);

  useEffect(() => {
    const hydrateAuth = async () => {
      const token = localStorage.getItem("auth_token");
      setIsAuthenticated(!!token);

      if (token) {
        try {
          const { data } = await api.get("/auth/me");
          setUserRole(data.data.role);
          setUserLembaga(data.data.lembaga);
          if (data.data.permissions) {
            setUserPermissions(data.data.permissions);
          }
        } catch {
          localStorage.removeItem("auth_token");
          setIsAuthenticated(false);
        }
      }

      setLoading(false);
    };

    hydrateAuth();
  }, [setUserLembaga, setUserRole]);

  // Cross-tab sync: multi-login support (same account open in many tabs/devices)
  // "1 akun dipakai bareng" - changes in one tab reflect in others automatically
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Token removed/deleted elsewhere -> logout this tab too
      if (e.key === "auth_token" && !e.newValue) {
        setIsAuthenticated(false);
        queryClient.clear();
        navigate("/login");
        return;
      }

      // Token changed elsewhere (re-login with different account) -> refresh state
      if (e.key === "auth_token" && e.newValue && e.newValue !== e.oldValue) {
        // Don't call localStorage.setItem here — it would trigger another storage event (infinite loop)
        setIsAuthenticated(true);
        queryClient.clear(); // force fresh data fetch
      }

      // Logout flag
      if (e.key === "app_logout" && e.newValue === "1") {
        localStorage.removeItem("auth_token");
        setIsAuthenticated(false);
        queryClient.clear();
        navigate("/login");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [queryClient, navigate]);

  if (loading) {
    const hasToken = !!localStorage.getItem("auth_token");
    if (!hasToken) {
      return null;
    }
    return (
      <Layout>
        <div className="w-full space-y-4 animate-fade-in p-4 sm:p-6">
          <PageHeaderSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div className="p-8 text-center font-bold text-gray-500">Memuat...</div>}>
        <Routes>
          <Route
            path="/login"
            element={<Login onLogin={() => setIsAuthenticated(true)} />}
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Layout>
      <Suspense
        fallback={
          <div className="w-full space-y-4 animate-fade-in p-4 sm:p-6">
            <PageHeaderSkeleton />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              canAccessPath(userRole, "/", userPermissions)
                ? <Dashboard />
                : <Navigate to={getFirstAllowedPath(userRole, userPermissions)} replace />
            }
          />
          <Route
            path="/scan"
            element={
              canAccessPath(userRole, "/scan", userPermissions)
                ? <ScanQR />
                : <Navigate to="/" replace />
            }
          />
          <Route
            path="/students"
            element={canAccessPath(userRole, "/students", userPermissions) ? <Students /> : <Navigate to="/" replace />}
          />
          <Route
            path="/teachers"
            element={canAccessPath(userRole, "/teachers", userPermissions) ? <Teachers /> : <Navigate to="/" replace />}
          />
          <Route
            path="/attendance"
            element={
              canAccessPath(userRole, "/attendance", userPermissions)
                ? (userRole === "guru" ? <GuruAttendance /> : <Attendance />)
                : <Navigate to="/" replace />
            }
          />
          <Route
            path="/holidays"
            element={canAccessPath(userRole, "/holidays", userPermissions) ? <Holidays /> : <Navigate to="/" replace />}
          />
          <Route
            path="/users"
            element={canAccessPath(userRole, "/users", userPermissions) ? <Users /> : <Navigate to="/" replace />}
          />
          <Route
            path="/profile"
            element={<Profile />}
          />
          <Route
            path="/settings"
            element={
              canAccessPath(userRole, "/settings", userPermissions)
                ? <Settings onLogout={() => setIsAuthenticated(false)} />
                : <Navigate to="/" replace />
            }
          />
          <Route
            path="/whatsapp-api"
            element={
              canAccessPath(userRole, "/whatsapp-api", userPermissions)
                ? <WhatsappApi />
                : <Navigate to="/" replace />
            }
          />
          <Route
            path="/whatsapp-templates"
            element={
              canAccessPath(userRole, "/whatsapp-templates", userPermissions)
                ? <WhatsappTemplates />
                : <Navigate to="/" replace />
            }
          />
          <Route
            path="/report"
            element={canAccessPath(userRole, "/report", userPermissions) ? <Report /> : <Navigate to="/" replace />}
          />
          <Route
            path="/guide"
            element={canAccessPath(userRole, "/guide", userPermissions) ? <Guide /> : <Navigate to="/" replace />}
          />
          <Route
            path="*"
            element={<Navigate to={canAccessPath(userRole, "/", userPermissions) ? "/" : getFirstAllowedPath(userRole, userPermissions)} replace />}
          />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
