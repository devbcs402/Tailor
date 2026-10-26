import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Scissors,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/orders/create', label: 'Create Order', icon: PlusCircle },
    { to: '/orders', label: 'All Orders', icon: ClipboardList },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 40,
          }}
        />
      )}

      <aside
        style={{
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--bg-sidebar)',
          color: 'var(--text-on-dark)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 50,
          transition: 'transform 0.3s ease',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
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
              <Scissors size={22} color="#d4af37" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
                Silai Master
              </div>
              <div style={{ fontSize: '0.74rem', color: '#d4af37', letterSpacing: '0.06em', fontWeight: 700 }}>
                TAILOR STUDIO
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
        <nav style={{ flex: 1, padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#64748b',
              padding: '0 12px 8px',
              letterSpacing: '0.06em',
            }}
          >
            Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.94rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#d4af37' : '#94a3b8',
                  backgroundColor: isActive ? 'var(--bg-sidebar-hover)' : 'transparent',
                  borderLeft: isActive ? '4px solid #d4af37' : '4px solid transparent',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 2px 10px rgba(0, 0, 0, 0.2)' : 'none',
                })}
              >
                <Icon size={20} color="currentColor" />
                <span style={{ fontSize: '0.94rem' }}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Logout Section */}
        <div
          style={{
            padding: '18px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d4af37',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: '1.5px solid #d4af37',
              }}
            >
              {user?.name ? user.name.charAt(0) : 'T'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name || 'Master Tailor'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{user?.email || 'admin'}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#fca5a5',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#fca5a5';
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .sidebar {
              position: fixed;
              left: 0;
              top: 0;
              bottom: 0;
              transform: translateX(-100%);
            }
            .sidebar.open {
              transform: translateX(0);
            }
            .mobile-close-btn {
              display: block !important;
            }
          }
        `}</style>
      </aside>
    </>
  );
};
