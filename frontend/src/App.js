import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';

// Pages — all explicitly imported
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Reservations from './pages/Reservations';
import Maintenance from './pages/Maintenance';   // FIX: was missing
import Dispatch from './pages/Dispatch';          // FIX: was missing
import TripLogs from './pages/TripLogs';          // FIX: was missing
// import Incidents from './pages/Incidents';        // FIX: was missing
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import { Spinner } from './components/common/UI';

/**
 * ProtectedRoute
 * - Unauthenticated → /login
 * - roles provided + user role not in list → /dashboard
 *   Note: only apply roles guard when truly required (avoids locking out managers)
 */
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    console.warn(`[Auth] Role "${user.role}" denied. Required: ${roles.join(', ')}`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const Page = ({ component: Component, title }) => (
  <Layout headerTitle={title}>
    <Component />
  </Layout>
);

const App = () => (
  <AuthProvider>
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{ style: { borderRadius: '12px', fontFamily: 'inherit', fontSize: '14px' } }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Page component={Dashboard} /></ProtectedRoute>
        } />

        {/* Fleet */}
        <Route path="/vehicles" element={
          <ProtectedRoute><Page title="Vehicles" component={Vehicles} /></ProtectedRoute>
        } />
        <Route path="/maintenance" element={
          <ProtectedRoute roles={['admin', 'transport_manager']}>
            <Page title="Maintenance" component={Maintenance} />
          </ProtectedRoute>
        } />

        {/* Operations */}
        <Route path="/reservations" element={
          <ProtectedRoute><Page title="Reservations" component={Reservations} /></ProtectedRoute>
        } />
        <Route path="/dispatch" element={
          <ProtectedRoute roles={['admin', 'transport_manager', 'driver']}>
            <Page title="Dispatch Board" component={Dispatch} />
          </ProtectedRoute>
        } />
        {/* Register both /trips (sidebar) and /trip-logs */}
        <Route path="/trips" element={
          <ProtectedRoute><Page title="Trip Logs" component={TripLogs} /></ProtectedRoute>
        } />
        <Route path="/trip-logs" element={
          <ProtectedRoute><Page title="Trip Logs" component={TripLogs} /></ProtectedRoute>
        } />

        {/* People */}
        <Route path="/drivers" element={
          <ProtectedRoute><Page title="Drivers" component={Drivers} /></ProtectedRoute>
        } />
        {/* <Route path="/incidents" element={
          <ProtectedRoute roles={['admin', 'transport_manager']}>
            <Page component={Incidents} />
          </ProtectedRoute>
        } /> */}

        {/* Finance */}
        <Route path="/expenses" element={
          <ProtectedRoute><Page title="Expenses & Fuel" component={Expenses} /></ProtectedRoute>
        } />
        <Route path="/fuel-logs" element={
          <ProtectedRoute><Page title="Expenses & Fuel" component={Expenses} /></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute roles={['admin', 'transport_manager']}>
            <Page title="Reports" component={Reports} />
          </ProtectedRoute>
        } />

        {/* Catch-all: only hits for truly unknown paths now */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  </AuthProvider>
);

export default App;