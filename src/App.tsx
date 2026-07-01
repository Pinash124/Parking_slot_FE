import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authService } from './services/authService';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import DriverDashboard from './pages/DriverDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ParkingSessions from './pages/ParkingSessions';
import GateValidator from './pages/GateValidator';
import ParkingLogs from './pages/ParkingLogs';
import ChangePassword from './pages/ChangePassword';

// Create TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

// Guard wrapper to protect pages by user role
interface ProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  if (!authService.isAuthenticated()) {
    // Session token not found, redirecting to login page
    return <Navigate to="/login" replace />;
  }

  const currentUser = authService.getCurrentUser();
  const role = currentUser?.role?.toUpperCase() || '';

  // Standardize roles check
  const mappedRole = role === 'USER' ? 'CUSTOMER' : (role === 'ADMINISTRATOR' ? 'ADMIN' : (role === 'OPERATOR' ? 'STAFF' : role));

  const hasAccess = allowedRoles.some(
    (allowedRole) => {
      const standardAllowed = allowedRole.toUpperCase();
      return (
        mappedRole === standardAllowed || 
        role === standardAllowed
      );
    }
  );

  if (!hasAccess) {
    // Unauthorized role, redirect back to landing page
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Router helper to decide between Admin or Manager dashboards
function AdminOrManagerRoute() {
  const currentUser = authService.getCurrentUser();
  const role = currentUser?.role?.toUpperCase() || '';
  if (role === 'MANAGER') {
    return <ManagerDashboard />;
  }
  return <AdminDashboard />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Guest routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected customer portal: /customer/* */}
          <Route
            path="/customer/*"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER', 'USER']}>
                <Routes>
                  <Route path="/" element={<DriverDashboard />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="*" element={<Navigate to="/customer" replace />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Protected staff portal: /staff/* */}
          <Route
            path="/staff/*"
            element={
              <ProtectedRoute allowedRoles={['STAFF', 'OPERATOR']}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/sessions" element={<ParkingSessions />} />
                  <Route path="/gate" element={<GateValidator />} />
                  <Route path="/logs" element={<ParkingLogs />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="*" element={<Navigate to="/staff" replace />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Protected admin portal: /admin/* */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN', 'ADMINISTRATOR']}>
                <Routes>
                  <Route path="/" element={<AdminOrManagerRoute />} />
                  <Route path="/logs" element={<ParkingLogs />} />
                  <Route path="/sessions" element={<ParkingSessions />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Catch all fallback redirects to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
