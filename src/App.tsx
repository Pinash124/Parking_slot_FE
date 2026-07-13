import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authService } from './services/authService';
import { WebSocketProvider } from './context/WebSocketContext';

// Pages are lazy-loaded so users only download the portal they open.
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const DriverDashboard = React.lazy(() => import('./pages/DriverDashboard'));
const MyVehicles = React.lazy(() => import('./pages/MyVehicles'));
const MyReservations = React.lazy(() => import('./pages/MyReservations'));
const MyMonthlyPasses = React.lazy(() => import('./pages/MyMonthlyPasses'));
const PaymentReturn = React.lazy(() => import('./pages/PaymentReturn'));
const ManagerDashboard = React.lazy(() => import('./pages/ManagerDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const ParkingSessions = React.lazy(() => import('./pages/ParkingSessions'));
const ParkingLogs = React.lazy(() => import('./pages/ParkingLogs'));
const ChangePassword = React.lazy(() => import('./pages/ChangePassword'));

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
  let mappedRole = role;
  if (role.includes('CUSTOMER') || role.includes('USER')) mappedRole = 'CUSTOMER';
  else if (role.includes('STAFF') || role.includes('OPERATOR')) mappedRole = 'STAFF';
  else if (role.includes('MANAGER')) mappedRole = 'MANAGER';
  else if (role.includes('ADMIN') || role.includes('ADMINISTRATOR')) mappedRole = 'ADMIN';

  const hasAccess = allowedRoles.some(
    (allowedRole) => {
      const standardAllowed = allowedRole.toUpperCase();
      return (
        mappedRole === standardAllowed || 
        role === standardAllowed ||
        (standardAllowed === 'CUSTOMER' && (role.includes('CUSTOMER') || role.includes('USER'))) ||
        (standardAllowed === 'STAFF' && (role.includes('STAFF') || role.includes('OPERATOR'))) ||
        (standardAllowed === 'MANAGER' && role.includes('MANAGER')) ||
        (standardAllowed === 'ADMIN' && (role.includes('ADMIN') || role.includes('ADMINISTRATOR')))
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
  if (role.includes('MANAGER')) {
    return <ManagerDashboard />;
  }
  return <AdminDashboard />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm font-semibold text-slate-500">Đang tải...</div>}>
          <Routes>
            {/* Guest routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/payment-return" element={<PaymentReturn />} />

            {/* Protected customer portal: /customer/* */}
            <Route
              path="/customer/*"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER', 'USER']}>
                  <Routes>
                    <Route path="/" element={<DriverDashboard />} />
                    <Route path="/vehicles" element={<MyVehicles />} />
                    <Route path="/reservations" element={<MyReservations />} />
                    <Route path="/monthly-passes" element={<MyMonthlyPasses />} />
                    <Route path="/payment-return" element={<PaymentReturn />} />
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
                    <Route path="/" element={<ParkingSessions />} />
                    <Route path="/sessions" element={<ParkingSessions />} />
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
                    <Route path="/dashboard" element={<AdminDashboard />} />
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
          </Suspense>
        </BrowserRouter>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}
