import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authService } from './services/authService';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
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

// Guard wrapper to protect pages from unauthenticated access
interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!authService.isAuthenticated()) {
    // Session token not found, redirecting to login page
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function DashboardRoute() {
  const currentUser = authService.getCurrentUser();
  const role = currentUser?.role?.toUpperCase();
  if (role === 'CUSTOMER' || role === 'USER') {
    return <DriverDashboard />;
  }
  if (role === 'MANAGER') {
    return <ManagerDashboard />;
  }
  if (role === 'ADMIN' || role === 'ADMINISTRATOR') {
    return <AdminDashboard />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Parking System Operations */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardRoute />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/change-password" 
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/sessions" 
            element={
              <ProtectedRoute>
                <ParkingSessions />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/gate" 
            element={
              <ProtectedRoute>
                <GateValidator />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/logs" 
            element={
              <ProtectedRoute>
                <ParkingLogs />
              </ProtectedRoute>
            } 
          />

          {/* Catch all fallback redirects to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
