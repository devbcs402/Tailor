import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { OwnerSidebar } from './OwnerSidebar';
import { OwnerHeader } from './OwnerHeader';

export const OwnerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route transition
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const getPageMeta = () => {
    const path = location.pathname;
    if (path === '/owner/dashboard') {
      return {
        title: 'Platform Overview',
        subtitle: 'SaaS metrics, tenant distribution, and system performance',
      };
    }
    if (path === '/owner/tenants') {
      return {
        title: 'Tenants Management',
        subtitle: 'Manage tailoring businesses, codes, onboarding, and statuses',
      };
    }
    if (path.startsWith('/owner/tenants/')) {
      return {
        title: 'Tenant Details',
        subtitle: 'Business configuration, stats, staff accounts, and subscription status',
      };
    }
    if (path === '/owner/activity-logs') {
      return {
        title: 'Audit Activity Logs',
        subtitle: 'Comprehensive audit trail of platform administrative operations',
      };
    }
    return {
      title: 'Platform Administration',
      subtitle: 'Central Tenant Management Console',
    };
  };

  const { title, subtitle } = getPageMeta();

  return (
    <div className="app-container">
      <OwnerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <OwnerHeader
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
