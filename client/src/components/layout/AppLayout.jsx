import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Automatically close mobile sidebar drawer upon navigation
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Determine dynamic title based on current pathname
  const getPageMeta = () => {
    const path = location.pathname;
    if (path === '/') {
      return { title: 'Dashboard', subtitle: 'Overview of tailor shop performance and orders due today' };
    }
    if (path === '/orders/create') {
      return { title: 'Create Order', subtitle: 'Customer details, measurements, and patterns' };
    }
    if (path.startsWith('/orders/') && path !== '/orders') {
      return { title: 'Order Details', subtitle: 'Measurements, garment patterns, and order schedule' };
    }
    if (path === '/orders') {
      return { title: 'All Orders', subtitle: 'Order list, filters, and status management' };
    }
    if (path.startsWith('/customers/') && path !== '/customers') {
      return { title: 'Customer Profile', subtitle: 'Saved measurements and past order history' };
    }
    if (path === '/customers') {
      return { title: 'Customers', subtitle: 'Customer directory, contact details, and measurement history' };
    }
    if (path === '/settings/measurements') {
      return { title: 'Measurement Settings', subtitle: 'Manage tenant-wise custom shirt & pant measurements and patterns' };
    }
    if (path === '/settings/patterns') {
      return { title: 'Pattern Settings', subtitle: 'Manage shirt patterns and pant patterns used in orders' };
    }
    if (path === '/settings') {
      return { title: 'Settings', subtitle: 'Application preferences and studio settings' };
    }
    return { title: 'Silai Master', subtitle: 'Tailor Management System' };
  };

  const { title, subtitle } = getPageMeta();

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
        />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
