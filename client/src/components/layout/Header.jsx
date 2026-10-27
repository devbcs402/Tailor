import React from 'react';
import { Menu, Plus, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Header = ({ onMenuClick, title, subtitle }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const businessName = user?.tenant?.businessName || user?.shopName || 'Tailor Studio';

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
        gap: '12px',
      }}
      className="header"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
        <button
          onClick={onMenuClick}
          className="menu-toggle-btn"
          aria-label="Open navigation menu"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: '#334155',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            flexShrink: 0,
          }}
        >
          <Menu size={22} />
        </button>

        <div style={{ minWidth: 0 }}>
          <h1
            className="header-title"
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title || businessName}
          </h1>
          {subtitle && (
            <p
              className="header-subtitle"
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/orders/create')}
          className="btn btn-primary btn-sm header-action-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          title="Create New Order"
        >
          <Plus size={16} /> <span className="header-action-label">New Order</span>
        </button>

        <div
          className="header-shop-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.82rem',
            color: '#475569',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={16} color="var(--accent-gold)" />
          <span style={{ fontWeight: 600 }}>{businessName}</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .menu-toggle-btn {
            display: flex !important;
            align-items: center;
            justify-content: center;
            min-width: 40px;
            min-height: 40px;
            border-radius: 8px;
            background: #f1f5f9 !important;
            color: var(--primary) !important;
          }
          .header {
            padding: 0 16px !important;
          }
          .header-shop-badge {
            display: none !important;
          }
        }
        @media (max-width: 600px) {
          .header {
            padding: 0 12px !important;
            height: 60px !important;
          }
          .header-subtitle {
            display: none !important;
          }
          .header-title {
            font-size: 1.05rem !important;
            max-width: 170px;
          }
          .header-action-label {
            display: none;
          }
          .header-action-btn {
            padding: 8px 10px !important;
            min-width: 36px;
            min-height: 36px;
          }
        }
      `}</style>
    </header>
  );
};
