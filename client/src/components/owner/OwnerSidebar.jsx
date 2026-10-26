import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  LogOut,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const OwnerSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const navItems = [
    {
      to: '/owner/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      description: 'Platform metrics & health',
    },
    {
      to: '/owner/tenants',
      label: 'Tenants Management',
      icon: Building2,
      description: 'Businesses, codes & status',
    },
    {
      to: '/owner/activity-logs',
      label: 'Audit Activity Logs',
      icon: FileText,
      description: 'Security & operation trail',
    },
  ];

  const isItemActive = (item) => {
    if (item.to === '/owner/tenants') {
      return (
        location.pathname === '/owner/tenants' ||
        location.pathname.startsWith('/owner/tenants/')
      );
    }
    return location.pathname === item.to;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/owner/login');
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 31, 58, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 1040,
          }}
        />
      )}

      <aside
        style={{
          width: 'var(--sidebar-width)',
          minWidth: 'var(--sidebar-width)',
          flexShrink: 0,
          backgroundColor: 'var(--bg-sidebar)',
          color: 'var(--text-on-dark)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          height: '100vh',
          maxHeight: '100vh',
          zIndex: 1050,
          overflow: 'hidden',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
        }}
        className={`sidebar ${isOpen ? 'open' : ''}`}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '24px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #142d4e, #0b1f3a)',
                border: '1.5px solid #d4af37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(212, 175, 55, 0.25)',
              }}
            >
              <ShieldAlert size={22} color="#d4af37" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#ffffff' }}>
                Antigravity SaaS
              </div>
              <div style={{ fontSize: '0.74rem', color: '#d4af37', letterSpacing: '0.06em', fontWeight: 700 }}>
                PLATFORM OWNER
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mobile-close-btn"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav
          style={{
            flex: 1,
            padding: '20px 14px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700, padding: '0 12px 8px' }}>
            Central Administration
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#ffffff' : '#cbd5e1',
                  backgroundColor: active ? 'rgba(212, 175, 55, 0.16)' : 'transparent',
                  borderLeft: active ? '3.5px solid var(--accent-gold)' : '3.5px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={18} color={active ? 'var(--accent-gold)' : '#94a3b8'} />
                <div style={{ flex: 1 }}>
                  <div>{item.label}</div>
                  <div style={{ fontSize: '0.74rem', color: active ? '#fde047' : '#64748b', fontWeight: 400 }}>
                    {item.description}
                  </div>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / User Profile & Logout */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Platform Admin'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#d4af37' }}>
              Superadministrator
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Logout of Platform"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .sidebar {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              bottom: 0 !important;
              height: 100vh !important;
              z-index: 1050 !important;
              transform: translateX(-100%);
              box-shadow: 8px 0 32px rgba(0, 0, 0, 0.4) !important;
            }
            .sidebar.open {
              transform: translateX(0) !important;
            }
            .mobile-close-btn {
              display: flex !important;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.1) !important;
              color: #ffffff !important;
            }
          }
        `}</style>
      </aside>
    </>
  );
};
