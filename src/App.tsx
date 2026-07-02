import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authService } from './services/authService';
import { WebSocketProvider } from './context/WebSocketContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import DriverDashboard from './pages/DriverDashboard';
import MyVehicles from './pages/MyVehicles';
import MyReservations from './pages/MyReservations';
import MyMonthlyPasses from './pages/MyMonthlyPasses';
import PaymentReturn from './pages/PaymentReturn';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminPolicies from './pages/AdminPolicies';
import AdminUsers from './pages/AdminUsers';
import ParkingSessions from './pages/ParkingSessions';
import StaffCheckIn from './pages/StaffCheckIn';
import StaffCheckOut from './pages/StaffCheckOut';
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
      <WebSocketProvider>
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
                    <Route path="/" element={<StaffCheckIn />} />
                    <Route path="/check-in" element={<StaffCheckIn />} />
                    <Route path="/check-out" element={<StaffCheckOut />} />
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
                    <Route path="/dashboard" element={<AdminDashboard />} />
                    <Route path="/policies" element={<AdminPolicies />} />
                    <Route path="/users" element={<AdminUsers />} />
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
      </WebSocketProvider>
    </QueryClientProvider>
  );
}
