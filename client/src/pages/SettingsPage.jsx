import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Scissors,
  ChevronRight,
  ShieldCheck,
  Store,
  Layers,
  Ruler,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Header Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0b1f3a 0%, #142d4e 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-md)',
          borderLeft: '5px solid var(--accent-gold)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              border: '1.5px solid var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)',
            }}
          >
            <Settings size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff' }}>
              Settings (સેટિંગ્સ)
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '2px' }}>
              Manage tailor shop preferences, custom measurement fields, garment patterns, and studio configurations.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Navigation Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Main Measurement Settings Navigation Card */}
        <div
          onClick={() => navigate('/settings/measurements')}
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '22px 24px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1.5px solid var(--border-light)',
            borderLeft: '5px solid var(--primary)',
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.borderColor = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.borderColor = 'var(--border-light)';
            e.currentTarget.style.borderLeft = '5px solid var(--primary)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid #bfdbfe',
              }}
            >
              <Ruler size={26} color="var(--primary)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Measurement Settings
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                  (માપ સેટિંગ્સ)
                </span>
                <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--accent-gold-light)', color: '#92400e', fontWeight: 700 }}>
                  Custom Fields & Patterns
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                Configure tenant-specific custom shirt and pant measurement definitions, Gujarati labels, and patterns.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '0.92rem',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-light)',
              flexShrink: 0,
            }}
          >
            <span>Configure</span>
            <ChevronRight size={18} />
          </div>
        </div>
        {/* Main Pattern Settings Navigation Card */}
        <div
          onClick={() => navigate('/settings/patterns')}
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '22px 24px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1.5px solid var(--border-light)',
            borderLeft: '5px solid var(--accent-gold)',
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.borderColor = 'var(--accent-gold)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.borderColor = 'var(--border-light)';
            e.currentTarget.style.borderLeft = '5px solid var(--accent-gold)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                backgroundColor: 'var(--accent-gold-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid var(--accent-gold-border)',
              }}
            >
              <Scissors size={26} color="var(--primary)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Pattern Settings
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold-hover)', fontWeight: 600 }}>
                  (પેટર્ન સેટિંગ્સ)
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                Manage shirt patterns and pant patterns used when creating orders.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--accent-gold-hover)',
              fontWeight: 700,
              fontSize: '0.92rem',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-gold-light)',
              flexShrink: 0,
            }}
          >
            <span>Manage</span>
            <ChevronRight size={18} />
          </div>
        </div>

        {/* Tailor Studio Profile Info Card */}
        <div
          className="card"
          style={{
            padding: '22px 24px',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <Store size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Tailor Studio Information
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Active shop identity and operator profile
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Studio / Shop Name
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                {user?.tenant?.businessName || user?.shopName || 'Tailor Studio'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Master Tailor
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {user?.name || 'Master Tailor'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Operator Email
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                {user?.email || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Application Theme
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#b45309', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)', display: 'inline-block' }} />
                Navy Blue + Gold
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
