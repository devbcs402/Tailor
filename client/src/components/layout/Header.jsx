import React from 'react';
import { Menu, Plus, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Header = ({ onMenuClick, title, subtitle }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-light)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      }}
      className="header"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onMenuClick}
          className="menu-toggle-btn"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: '#334155',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
          }}
        >
          <Menu size={24} />
        </button>

        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
            {title || 'Silai Master'}
          </h1>
          {subtitle && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate('/orders/create')}
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> New Order
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.82rem',
            color: '#475569',
          }}
        >
          <ShieldCheck size={16} color="var(--accent-gold)" />
          <span>{user?.shopName || 'Silai Master'}</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .menu-toggle-btn {
            display: flex !important;
            align-items: center;
            justify-content: center;
            min-width: 42px;
            min-height: 42px;
            border-radius: 8px;
            background: #f1f5f9 !important;
            color: var(--primary) !important;
          }
          .header {
            padding: 0 16px !important;
          }
        }
      `}</style>
    </header>
  );
};
