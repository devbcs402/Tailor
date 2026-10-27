import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreateOrderPage } from './pages/CreateOrderPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailsPage } from './pages/CustomerDetailsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PatternSettingsPage } from './pages/PatternSettingsPage';

// Owner Portal Imports
import { OwnerProtectedRoute } from './routes/OwnerProtectedRoute';
import { OwnerLayout } from './components/owner/OwnerLayout';
import { OwnerLoginPage } from './pages/owner/OwnerLoginPage';
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage';
import { OwnerTenantsPage } from './pages/owner/OwnerTenantsPage';
import { OwnerTenantDetailsPage } from './pages/owner/OwnerTenantDetailsPage';
import { OwnerCreateTenantPage } from './pages/owner/OwnerCreateTenantPage';
import { OwnerEditTenantPage } from './pages/owner/OwnerEditTenantPage';
import { OwnerActivityLogsPage } from './pages/owner/OwnerActivityLogsPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Platform Owner Login Route */}
            <Route path="/owner/login" element={<OwnerLoginPage />} />
            <Route path="/owner" element={<Navigate to="/owner/dashboard" replace />} />

            {/* Platform Owner Protected Portal */}
            <Route element={<OwnerProtectedRoute />}>
              <Route element={<OwnerLayout />}>
                <Route path="/owner/dashboard" element={<OwnerDashboardPage />} />
                <Route path="/owner/tenants" element={<OwnerTenantsPage />} />
                <Route path="/owner/tenants/create" element={<OwnerCreateTenantPage />} />
                <Route path="/owner/tenants/:id" element={<OwnerTenantDetailsPage />} />
                <Route path="/owner/tenants/:id/edit" element={<OwnerEditTenantPage />} />
                <Route path="/owner/activity-logs" element={<OwnerActivityLogsPage />} />
              </Route>
            </Route>

            {/* Tenant Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/orders/create" element={<CreateOrderPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderDetailsPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/:id" element={<CustomerDetailsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/patterns" element={<PatternSettingsPage />} />
              </Route>
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
