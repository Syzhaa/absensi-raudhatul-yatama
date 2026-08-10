import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import { useBackgroundSync } from './hooks/useBackgroundSync';

// Lazy load heavy components
const ScanQR = lazy(() => import('./pages/ScanQR'));
const Students = lazy(() => import('./pages/Students'));
const Teachers = lazy(() => import('./pages/Teachers'));
const Attendance = lazy(() => import('./pages/Attendance'));

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useBackgroundSync();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  // Cross-tab sync: multi-login support (same account open in many tabs/devices)
  // "1 akun dipakai bareng" - changes in one tab reflect in others automatically
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Token removed/deleted elsewhere -> logout this tab too
      if (e.key === 'auth_token' && !e.newValue) {
        setIsAuthenticated(false);
        queryClient.clear();
        navigate('/login');
        return;
      }

      // Token changed elsewhere (re-login with different account) -> refresh state
      if (e.key === 'auth_token' && e.newValue && e.newValue !== e.oldValue) {
        // Don't call localStorage.setItem here — it would trigger another storage event (infinite loop)
        setIsAuthenticated(true);
        queryClient.clear(); // force fresh data fetch
      }

      // Logout flag
      if (e.key === 'app_logout' && e.newValue === '1') {
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
        queryClient.clear();
        navigate('/login');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neo-bg">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin w-10 h-10 border-4 border-primary-green border-t-gray-900 rounded-full"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scan" element={<ScanQR />} />
          <Route path="/students" element={<Students />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/settings" element={<Settings onLogout={() => setIsAuthenticated(false)} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
